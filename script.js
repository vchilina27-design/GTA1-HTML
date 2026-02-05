const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const speedEl = document.getElementById("speed");
const positionEl = document.getElementById("position");
const modeEl = document.getElementById("mode");

const joystickBase = document.getElementById("joystick-base");
const joystickStick = document.getElementById("joystick-stick");
const accelerateBtn = document.getElementById("btn-accelerate");
const brakeBtn = document.getElementById("btn-brake");
const actionBtn = document.getElementById("btn-action");

const world = {
  width: 3200,
  height: 3200,
  block: 240,
  road: 72,
};

const car = {
  x: world.width / 2,
  y: world.height / 2,
  angle: -Math.PI / 2,
  speed: 0,
  width: 28,
  height: 46,
  maxSpeed: 7.2,
  accel: 0.2,
  brake: 0.29,
  friction: 0.05,
  turnRate: 0.046,
};

const character = {
  x: car.x,
  y: car.y + 50,
  angle: -Math.PI / 2,
  speed: 0,
  maxSpeed: 3,
  radius: 10,
};

const gameState = {
  mode: "driving",
};

const controls = {
  accelerate: false,
  brake: false,
  steer: 0,
  moveX: 0,
  moveY: 0,
};

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

function distance(aX, aY, bX, bY) {
  return Math.hypot(aX - bX, aY - bY);
}

function setDrivingMode() {
  gameState.mode = "driving";
  controls.moveX = 0;
  controls.moveY = 0;
  actionBtn.textContent = "Выйти";
  accelerateBtn.classList.remove("hidden");
  brakeBtn.classList.remove("hidden");
  modeEl.textContent = "В машине";
}

function setOnFootMode() {
  gameState.mode = "onFoot";
  controls.accelerate = false;
  controls.brake = false;
  car.speed *= 0.9;
  actionBtn.textContent = "Сесть";
  accelerateBtn.classList.add("hidden");
  brakeBtn.classList.add("hidden");
  modeEl.textContent = "Пешком";
}

function setupKeyboard() {
  window.addEventListener("keydown", (event) => {
    keyState.add(event.code);

    if (event.code === "KeyE") {
      event.preventDefault();
      toggleEnterExit();
    }
  });

  window.addEventListener("keyup", (event) => {
    keyState.delete(event.code);
  });
}

function bindHoldButton(button, key) {
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
}

function setupButtons() {
  bindHoldButton(accelerateBtn, "accelerate");
  bindHoldButton(brakeBtn, "brake");

  actionBtn.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    actionBtn.classList.add("active");
  });

  actionBtn.addEventListener("pointerup", (event) => {
    event.preventDefault();
    actionBtn.classList.remove("active");
    toggleEnterExit();
  });

  actionBtn.addEventListener("pointercancel", () => {
    actionBtn.classList.remove("active");
  });
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
    controls.moveX = 0;
    controls.moveY = 0;
    joystickStick.style.transform = "translate(-50%, -50%)";
  };

  const moveStick = (clientX, clientY) => {
    const dx = clientX - joystickState.centerX;
    const dy = clientY - joystickState.centerY;
    const distanceToCenter = Math.hypot(dx, dy);
    const maxDist = joystickState.radius;

    const ratio = distanceToCenter > maxDist ? maxDist / distanceToCenter : 1;
    joystickState.x = dx * ratio;
    joystickState.y = dy * ratio;

    const normalizedX = clamp(joystickState.x / maxDist, -1, 1);
    const normalizedY = clamp(joystickState.y / maxDist, -1, 1);

    controls.steer = normalizedX;
    controls.moveX = normalizedX;
    controls.moveY = normalizedY;

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

function toggleEnterExit() {
  if (gameState.mode === "driving") {
    const offset = 40;
    character.x = car.x + Math.cos(car.angle + Math.PI / 2) * offset;
    character.y = car.y + Math.sin(car.angle + Math.PI / 2) * offset;
    character.angle = car.angle;
    setOnFootMode();
    return;
  }

  const canEnter = distance(character.x, character.y, car.x, car.y) < 56;
  if (canEnter) {
    setDrivingMode();
  }
}

function updateControlsFromKeyboard() {
  const up = keyState.has("KeyW") || keyState.has("ArrowUp");
  const down = keyState.has("KeyS") || keyState.has("ArrowDown");
  const left = keyState.has("KeyA") || keyState.has("ArrowLeft");
  const right = keyState.has("KeyD") || keyState.has("ArrowRight");

  if (!controls.accelerate) controls.accelerate = up;
  if (!controls.brake) controls.brake = down;

  if (!joystickState.active) {
    controls.steer = (right ? 1 : 0) + (left ? -1 : 0);
    controls.moveX = controls.steer;
    controls.moveY = (down ? 1 : 0) + (up ? -1 : 0);
  }
}

function updateDriving() {
  if (controls.accelerate) {
    car.speed += car.accel;
  }

  if (controls.brake) {
    if (car.speed > 0) car.speed -= car.brake;
    else car.speed -= car.accel * 0.65;
  }

  if (!controls.accelerate && !controls.brake) {
    if (Math.abs(car.speed) < car.friction) {
      car.speed = 0;
    } else {
      car.speed -= Math.sign(car.speed) * car.friction;
    }
  }

  car.speed = clamp(car.speed, -2.6, car.maxSpeed);

  if (car.speed !== 0) {
    const steerFactor = clamp(Math.abs(car.speed) / car.maxSpeed, 0.25, 1);
    car.angle += controls.steer * car.turnRate * steerFactor;
  }

  car.x += Math.cos(car.angle) * car.speed;
  car.y += Math.sin(car.angle) * car.speed;
}

function updateOnFoot() {
  const moveLen = Math.hypot(controls.moveX, controls.moveY);
  if (moveLen > 0.01) {
    const normX = controls.moveX / moveLen;
    const normY = controls.moveY / moveLen;
    character.x += normX * character.maxSpeed;
    character.y += normY * character.maxSpeed;
    character.angle = Math.atan2(normY, normX) + Math.PI / 2;
  }
}

function updateActionButtonState() {
  if (gameState.mode === "driving") {
    actionBtn.textContent = "Выйти";
    actionBtn.classList.remove("hidden");
    return;
  }

  const canEnter = distance(character.x, character.y, car.x, car.y) < 56;
  actionBtn.textContent = canEnter ? "Сесть" : "Подойти";
  actionBtn.classList.toggle("hidden", !canEnter);
}

function updatePhysics() {
  updateControlsFromKeyboard();

  if (gameState.mode === "driving") updateDriving();
  else updateOnFoot();

  car.x = clamp(car.x, 40, world.width - 40);
  car.y = clamp(car.y, 40, world.height - 40);

  character.x = clamp(character.x, 25, world.width - 25);
  character.y = clamp(character.y, 25, world.height - 25);

  updateActionButtonState();

  const activeX = gameState.mode === "driving" ? car.x : character.x;
  const activeY = gameState.mode === "driving" ? car.y : character.y;
  const activeSpeed = gameState.mode === "driving" ? Math.abs(car.speed) * 18 : character.maxSpeed;

  speedEl.textContent = Math.round(activeSpeed);
  positionEl.textContent = `${Math.round(activeX)}, ${Math.round(activeY)}`;

  controls.accelerate = false;
  controls.brake = false;
}

function drawRoadMarkings(drawX, drawY, block, road) {
  const laneColor = "rgba(240, 220, 125, 0.45)";
  ctx.fillStyle = laneColor;

  for (let i = 0; i < 6; i += 1) {
    const dashOffset = 10 + i * (road + 8);
    ctx.fillRect(drawX + block / 2 - 2, drawY + dashOffset, 4, 18);
    ctx.fillRect(drawX + dashOffset, drawY + block / 2 - 2, 18, 4);
  }
}

function drawCityBlock(drawX, drawY, block, road, x, y) {
  ctx.fillStyle = "#2f343c";
  ctx.fillRect(drawX, drawY, block, block);

  const innerX = drawX + road;
  const innerY = drawY + road;
  const innerSize = block - road * 2;

  const zoneSeed = Math.abs((x / block) * 31 + (y / block) * 17) % 5;

  if (zoneSeed === 0) {
    ctx.fillStyle = "#407d49";
    ctx.fillRect(innerX, innerY, innerSize, innerSize);
    ctx.fillStyle = "#2c5a33";
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(innerX + 24 + i * 24, innerY + 28 + (i % 2) * 26, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = zoneSeed % 2 ? "#59616f" : "#676f7c";
    ctx.fillRect(innerX, innerY, innerSize, innerSize);

    ctx.fillStyle = "rgba(12,16,25,0.35)";
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        ctx.fillRect(innerX + 12 + col * 28, innerY + 10 + row * 28, 16, 12);
      }
    }

    ctx.fillStyle = "#8f939c";
    ctx.fillRect(innerX + 8, innerY + innerSize - 20, innerSize - 16, 10);
  }

  drawRoadMarkings(drawX, drawY, block, road);
}

function drawWorld(cameraX, cameraY, viewW, viewH) {
  ctx.fillStyle = "#232831";
  ctx.fillRect(0, 0, viewW, viewH);

  const block = world.block;
  const road = world.road;

  const startX = Math.floor(cameraX / block) * block - block;
  const startY = Math.floor(cameraY / block) * block - block;

  for (let x = startX; x < cameraX + viewW + block; x += block) {
    for (let y = startY; y < cameraY + viewH + block; y += block) {
      const drawX = x - cameraX;
      const drawY = y - cameraY;
      drawCityBlock(drawX, drawY, block, road, x, y);
    }
  }

  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  for (let x = startX; x < cameraX + viewW + block; x += block) {
    ctx.beginPath();
    ctx.moveTo(x - cameraX, 0);
    ctx.lineTo(x - cameraX, viewH);
    ctx.stroke();
  }

  for (let y = startY; y < cameraY + viewH + block; y += block) {
    ctx.beginPath();
    ctx.moveTo(0, y - cameraY);
    ctx.lineTo(viewW, y - cameraY);
    ctx.stroke();
  }
}

function drawCar(cameraX, cameraY) {
  const drawX = car.x - cameraX;
  const drawY = car.y - cameraY;

  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.rotate(car.angle);

  ctx.fillStyle = "#d7c94b";
  ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);

  ctx.fillStyle = "#2a2f38";
  ctx.fillRect(-car.width / 2 + 4, -car.height / 2 + 7, car.width - 8, car.height - 21);

  ctx.fillStyle = "#d83145";
  ctx.fillRect(-3, -car.height / 2 + 2, 6, 10);

  ctx.restore();
}

function drawCharacter(cameraX, cameraY) {
  const drawX = character.x - cameraX;
  const drawY = character.y - cameraY;

  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.rotate(character.angle);

  ctx.fillStyle = "#dfc4a0";
  ctx.beginPath();
  ctx.arc(0, -5, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7fd8ff";
  ctx.fillRect(-5, 2, 10, 12);

  ctx.strokeStyle = "#1f2530";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, -9);
  ctx.stroke();

  ctx.restore();
}

function gameLoop() {
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;

  updatePhysics();

  const targetX = gameState.mode === "driving" ? car.x : character.x;
  const targetY = gameState.mode === "driving" ? car.y : character.y;
  const cameraX = clamp(targetX - viewW / 2, 0, world.width - viewW);
  const cameraY = clamp(targetY - viewH / 2, 0, world.height - viewH);

  drawWorld(cameraX, cameraY, viewW, viewH);
  drawCar(cameraX, cameraY);
  if (gameState.mode === "onFoot") drawCharacter(cameraX, cameraY);

  requestAnimationFrame(gameLoop);
}

setupKeyboard();
setupButtons();
setupJoystick();
setDrivingMode();
requestAnimationFrame(gameLoop);
