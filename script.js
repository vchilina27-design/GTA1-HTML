const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const speedEl = document.getElementById("speed");
const gearEl = document.getElementById("gear");
const positionEl = document.getElementById("position");

const joystickBase = document.getElementById("joystick-base");
const joystickStick = document.getElementById("joystick-stick");
const accelerateBtn = document.getElementById("btn-accelerate");
const brakeBtn = document.getElementById("btn-brake");

const world = {
  width: 2600,
  height: 2600,
  block: 220,
  road: 64,
};

const player = {
  x: world.width / 2,
  y: world.height / 2,
  angle: -Math.PI / 2,
  speed: 0,
  vx: 0,
  vy: 0,
  angularVelocity: 0,
  width: 26,
  height: 44,
  accelForward: 0.19,
  accelReverse: 0.16,
  maxSpeedForward: 6.5,
  maxSpeedReverse: 2.9,
  steerAtLowSpeed: 0.055,
  steerAtHighSpeed: 0.018,
  drag: 0.085,
  angularDamping: 0.12,
};

const controls = {
  accelerate: false,
  brake: false,
  steer: 0,
  brakeHoldMs: 0,
  handbrake: false,
};

const hudState = {
  stableSpeedKmh: 0,
};

const HANDBRAKE_DELAY_MS = 260;

const keyState = new Set();
const joystickState = {
  active: false,
  pointerId: null,
  centerX: 0,
  centerY: 0,
  x: 0,
  y: 0,
  radius: 52,
};

function resizeCanvas() {
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setupKeyboard() {
  window.addEventListener("keydown", (event) => {
    keyState.add(event.code);
  });
  window.addEventListener("keyup", (event) => {
    keyState.delete(event.code);
  });
}

function setupButtons() {
  const bindButton = (button, key) => {
    const start = (event) => {
      event.preventDefault();
      controls[key] = true;
      button.classList.add("active");
    };

    const stop = (event) => {
      event.preventDefault();
      controls[key] = false;
      button.classList.remove("active");
    };

    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("pointerleave", stop);
  };

  bindButton(accelerateBtn, "accelerate");
  bindButton(brakeBtn, "brake");
}

function setupJoystick() {
  const updateCenter = () => {
    const rect = joystickBase.getBoundingClientRect();
    joystickState.centerX = rect.left + rect.width / 2;
    joystickState.centerY = rect.top + rect.height / 2;
    joystickState.radius = rect.width * 0.4;
  };

  const reset = () => {
    joystickState.active = false;
    joystickState.pointerId = null;
    joystickState.x = 0;
    joystickState.y = 0;
    controls.steer = 0;
    joystickStick.style.transform = "translate(-50%, -50%)";
  };

  const moveStick = (clientX, clientY) => {
    const dx = clientX - joystickState.centerX;
    const dy = clientY - joystickState.centerY;
    const distance = Math.hypot(dx, dy);
    const maxDist = joystickState.radius;

    const ratio = distance > maxDist ? maxDist / distance : 1;
    joystickState.x = dx * ratio;
    joystickState.y = dy * ratio;

    const steerNorm = clamp(joystickState.x / maxDist, -1, 1);
    controls.steer = steerNorm;

    joystickStick.style.transform = `translate(calc(-50% + ${joystickState.x}px), calc(-50% + ${joystickState.y}px))`;
  };

  joystickBase.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    updateCenter();
    joystickState.active = true;
    joystickState.pointerId = event.pointerId;
    joystickBase.setPointerCapture(event.pointerId);
    moveStick(event.clientX, event.clientY);
  });

  joystickBase.addEventListener("pointermove", (event) => {
    if (!joystickState.active || event.pointerId !== joystickState.pointerId) return;
    event.preventDefault();
    moveStick(event.clientX, event.clientY);
  });

  joystickBase.addEventListener("pointerup", (event) => {
    if (event.pointerId === joystickState.pointerId) {
      reset();
    }
  });

  joystickBase.addEventListener("pointercancel", reset);
  window.addEventListener("resize", updateCenter);
  updateCenter();
}

function updateControlsFromKeyboard() {
  if (!controls.accelerate) {
    controls.accelerate = keyState.has("KeyW") || keyState.has("ArrowUp");
  }

  if (!controls.brake) {
    controls.brake = keyState.has("KeyS") || keyState.has("ArrowDown");
  }

  if (!joystickState.active) {
    const left = keyState.has("KeyA") || keyState.has("ArrowLeft");
    const right = keyState.has("KeyD") || keyState.has("ArrowRight");
    controls.steer = (right ? 1 : 0) + (left ? -1 : 0);
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function updatePhysics(deltaScale = 1) {
  updateControlsFromKeyboard();

  if (controls.brake) {
    controls.brakeHoldMs += 16.67 * deltaScale;
  } else {
    controls.brakeHoldMs = 0;
  }
  controls.handbrake = controls.brakeHoldMs > HANDBRAKE_DELAY_MS;

  const fx = Math.cos(player.angle);
  const fy = Math.sin(player.angle);
  const rightX = -fy;
  const rightY = fx;

  let forwardSpeed = player.vx * fx + player.vy * fy;
  let lateralSpeed = player.vx * rightX + player.vy * rightY;

  const steerBlend = clamp(Math.abs(forwardSpeed) / player.maxSpeedForward, 0, 1);
  const steerPower = lerp(player.steerAtLowSpeed, player.steerAtHighSpeed, steerBlend);
  const steerDir = forwardSpeed >= 0 ? 1 : -1;

  player.angularVelocity += controls.steer * steerPower * steerDir * deltaScale;
  player.angularVelocity *= Math.max(0, 1 - player.angularDamping * deltaScale);
  player.angle += player.angularVelocity * deltaScale;

  const handbrakeMultiplier = controls.handbrake ? 2.6 : 1;

  if (controls.accelerate && !controls.brake) {
    player.vx += fx * player.accelForward * deltaScale;
    player.vy += fy * player.accelForward * deltaScale;
  }

  if (controls.brake && !controls.accelerate) {
    if (forwardSpeed > 0.2) {
      player.vx -= fx * player.accelReverse * 1.5 * handbrakeMultiplier * deltaScale;
      player.vy -= fy * player.accelReverse * 1.5 * handbrakeMultiplier * deltaScale;
    } else {
      player.vx -= fx * player.accelReverse * deltaScale;
      player.vy -= fy * player.accelReverse * deltaScale;
    }
  }

  const dragScale = player.drag * (controls.handbrake ? 2.3 : 1);
  player.vx *= Math.max(0, 1 - dragScale * deltaScale);
  player.vy *= Math.max(0, 1 - dragScale * deltaScale);

  forwardSpeed = player.vx * fx + player.vy * fy;
  lateralSpeed = player.vx * rightX + player.vy * rightY;

  const lateralDamping = controls.handbrake ? 0.42 : 0.18;
  lateralSpeed *= Math.max(0, 1 - lateralDamping * deltaScale);

  forwardSpeed = clamp(forwardSpeed, -player.maxSpeedReverse, player.maxSpeedForward);

  player.vx = fx * forwardSpeed + rightX * lateralSpeed;
  player.vy = fy * forwardSpeed + rightY * lateralSpeed;

  player.speed = forwardSpeed;

  player.x += player.vx * deltaScale;
  player.y += player.vy * deltaScale;

  player.x = clamp(player.x, 40, world.width - 40);
  player.y = clamp(player.y, 40, world.height - 40);

  if (player.x <= 40 || player.x >= world.width - 40) player.vx *= 0.3;
  if (player.y <= 40 || player.y >= world.height - 40) player.vy *= 0.3;

  const speedKmh = Math.hypot(player.vx, player.vy) * 18;
  hudState.stableSpeedKmh += (speedKmh - hudState.stableSpeedKmh) * 0.18;

  let gear = "N";
  if (forwardSpeed < -0.15 || (controls.brake && !controls.accelerate && Math.abs(forwardSpeed) < 0.3)) {
    gear = "R";
  } else if (forwardSpeed > 0.15 || controls.accelerate) {
    gear = "D";
  }

  gearEl.textContent = gear;
  speedEl.textContent = hudState.stableSpeedKmh.toFixed(1);
  positionEl.textContent = `${Math.round(player.x)}, ${Math.round(player.y)}`;
}

function drawWorld(cameraX, cameraY, viewW, viewH) {
  ctx.fillStyle = "#3e434b";
  ctx.fillRect(0, 0, viewW, viewH);

  const block = world.block;
  const road = world.road;

  const startX = Math.floor(cameraX / block) * block - block;
  const startY = Math.floor(cameraY / block) * block - block;

  for (let x = startX; x < cameraX + viewW + block; x += block) {
    for (let y = startY; y < cameraY + viewH + block; y += block) {
      const drawX = x - cameraX;
      const drawY = y - cameraY;

      ctx.fillStyle = "#2f343c";
      ctx.fillRect(drawX, drawY, block, block);

      ctx.fillStyle = "#4f8b46";
      ctx.fillRect(drawX + road, drawY + road, block - road * 2, block - road * 2);

      ctx.fillStyle = "#6f6f6f";
      const carCount = ((x + y) / block) % 4;
      for (let i = 0; i < carCount; i += 1) {
        const parkedX = drawX + 8 + i * 15;
        const parkedY = drawY + 10;
        ctx.fillRect(parkedX, parkedY, 10, 18);
      }
    }
  }

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;

  for (let x = startX; x < cameraX + viewW + block; x += block) {
    ctx.beginPath();
    ctx.moveTo(x - cameraX + road / 2, 0);
    ctx.lineTo(x - cameraX + road / 2, viewH);
    ctx.moveTo(x - cameraX + block - road / 2, 0);
    ctx.lineTo(x - cameraX + block - road / 2, viewH);
    ctx.stroke();
  }

  for (let y = startY; y < cameraY + viewH + block; y += block) {
    ctx.beginPath();
    ctx.moveTo(0, y - cameraY + road / 2);
    ctx.lineTo(viewW, y - cameraY + road / 2);
    ctx.moveTo(0, y - cameraY + block - road / 2);
    ctx.lineTo(viewW, y - cameraY + block - road / 2);
    ctx.stroke();
  }
}

function drawPlayer(cameraX, cameraY) {
  const drawX = player.x - cameraX;
  const drawY = player.y - cameraY;

  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.rotate(player.angle);

  const halfW = player.width / 2;
  const halfH = player.height / 2;
  const indicatorOn = controls.handbrake || Math.abs(player.angularVelocity) > 0.03;

  ctx.fillStyle = "#caa94c";
  ctx.fillRect(-halfW, -halfH, player.width, player.height);

  ctx.fillStyle = "#263343";
  ctx.fillRect(-halfW + 3, -halfH + 7, player.width - 6, player.height - 18);

  ctx.fillStyle = "#f7efb4";
  ctx.fillRect(-halfW + 3, -halfH + 2, 6, 3);
  ctx.fillRect(halfW - 9, -halfH + 2, 6, 3);

  ctx.fillStyle = controls.handbrake ? "#ff4d59" : "#a81931";
  ctx.fillRect(-halfW + 4, halfH - 5, 5, 3);
  ctx.fillRect(halfW - 9, halfH - 5, 5, 3);

  ctx.fillStyle = indicatorOn ? "#8dfad9" : "#2d6159";
  const indicatorX = controls.steer < 0 ? -halfW + 2 : halfW - 8;
  ctx.fillRect(indicatorX, -2, 6, 4);

  ctx.restore();
}

let lastFrame = performance.now();

function gameLoop(now) {
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  const deltaScale = clamp((now - lastFrame) / 16.6667, 0.45, 2);
  lastFrame = now;

  updatePhysics(deltaScale);

  const cameraX = clamp(player.x - viewW / 2, 0, world.width - viewW);
  const cameraY = clamp(player.y - viewH / 2, 0, world.height - viewH);

  drawWorld(cameraX, cameraY, viewW, viewH);
  drawPlayer(cameraX, cameraY);

  requestAnimationFrame(gameLoop);
}

setupKeyboard();
setupButtons();
setupJoystick();
requestAnimationFrame(gameLoop);
