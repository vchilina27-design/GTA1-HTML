const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const speedEl = document.getElementById("speed");
const positionEl = document.getElementById("position");
const modeIndicatorEl = document.getElementById("mode-indicator");

const joystickBase = document.getElementById("joystick-base");
const joystickStick = document.getElementById("joystick-stick");
const accelerateBtn = document.getElementById("btn-accelerate");
const brakeBtn = document.getElementById("btn-brake");
const exitBtn = document.getElementById("btn-exit");

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
  width: 26,
  height: 44,
  maxSpeed: 6.3,
  accel: 0.18,
  brake: 0.26,
  friction: 0.05,
  turnRate: 0.042,
};

const character = {
  x: player.x,
  y: player.y,
  angle: player.angle,
  speedWalk: 2.25,
  radius: 11,
  nearVehicle: false,
};

const gameState = {
  mode: "driving",
};

const controls = {
  accelerate: false,
  brake: false,
  steer: 0,
};

const onFootControls = {
  moveX: 0,
  moveY: 0,
};

const actionState = {
  interactRequested: false,
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

function setupKeyboard() {
  window.addEventListener("keydown", (event) => {
    keyState.add(event.code);
    if (!event.repeat && (event.code === "KeyE" || event.code === "Enter")) {
      actionState.interactRequested = true;
    }
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

  exitBtn.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    actionState.interactRequested = true;
    exitBtn.classList.add("active");
  });

  const clearExit = (event) => {
    event.preventDefault();
    exitBtn.classList.remove("active");
  };

  exitBtn.addEventListener("pointerup", clearExit);
  exitBtn.addEventListener("pointercancel", clearExit);
  exitBtn.addEventListener("pointerleave", clearExit);
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

function updateDrivingControls() {
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

function updateOnFootControls() {
  const left = keyState.has("KeyA") || keyState.has("ArrowLeft");
  const right = keyState.has("KeyD") || keyState.has("ArrowRight");
  const up = keyState.has("KeyW") || keyState.has("ArrowUp");
  const down = keyState.has("KeyS") || keyState.has("ArrowDown");

  onFootControls.moveX = (right ? 1 : 0) + (left ? -1 : 0);
  onFootControls.moveY = (down ? 1 : 0) + (up ? -1 : 0);

  if (joystickState.active) {
    onFootControls.moveX = clamp(joystickState.x / joystickState.radius, -1, 1);
    onFootControls.moveY = clamp(joystickState.y / joystickState.radius, -1, 1);
  }
}

function exitVehicle() {
  const sideOffset = player.width * 1.25;
  character.x = player.x + Math.cos(player.angle + Math.PI / 2) * sideOffset;
  character.y = player.y + Math.sin(player.angle + Math.PI / 2) * sideOffset;
  character.angle = player.angle;
  character.x = clamp(character.x, character.radius, world.width - character.radius);
  character.y = clamp(character.y, character.radius, world.height - character.radius);
  gameState.mode = "onFoot";
}

function enterVehicle() {
  player.speed = 0;
  gameState.mode = "driving";
}

function handleModeToggle() {
  if (!actionState.interactRequested) return;

  if (gameState.mode === "driving") {
    exitVehicle();
  } else if (character.nearVehicle) {
    enterVehicle();
  }

  actionState.interactRequested = false;
}

function updatePhysics() {
  handleModeToggle();

  if (gameState.mode === "driving") {
    updateDrivingControls();

    if (controls.accelerate) {
      player.speed += player.accel;
    }

    if (controls.brake) {
      if (player.speed > 0) player.speed -= player.brake;
      else player.speed -= player.accel * 0.65;
    }

    if (!controls.accelerate && !controls.brake) {
      if (Math.abs(player.speed) < player.friction) {
        player.speed = 0;
      } else {
        player.speed -= Math.sign(player.speed) * player.friction;
      }
    }

    player.speed = clamp(player.speed, -2.6, player.maxSpeed);

    if (player.speed !== 0) {
      const steerFactor = clamp(Math.abs(player.speed) / player.maxSpeed, 0.22, 1);
      player.angle += controls.steer * player.turnRate * steerFactor;
    }

    player.x += Math.cos(player.angle) * player.speed;
    player.y += Math.sin(player.angle) * player.speed;

    player.x = clamp(player.x, 40, world.width - 40);
    player.y = clamp(player.y, 40, world.height - 40);

    const distanceToVehicle = Math.hypot(character.x - player.x, character.y - player.y);
    character.nearVehicle = distanceToVehicle < 46;
  } else {
    updateOnFootControls();

    const moveLength = Math.hypot(onFootControls.moveX, onFootControls.moveY) || 1;
    const velocityX = (onFootControls.moveX / moveLength) * character.speedWalk;
    const velocityY = (onFootControls.moveY / moveLength) * character.speedWalk;

    character.x += velocityX;
    character.y += velocityY;

    if (onFootControls.moveX !== 0 || onFootControls.moveY !== 0) {
      character.angle = Math.atan2(onFootControls.moveY, onFootControls.moveX);
    }

    character.x = clamp(character.x, character.radius, world.width - character.radius);
    character.y = clamp(character.y, character.radius, world.height - character.radius);

    const distanceToVehicle = Math.hypot(character.x - player.x, character.y - player.y);
    character.nearVehicle = distanceToVehicle < 58;

    controls.accelerate = false;
    controls.brake = false;
    controls.steer = 0;
    player.speed = 0;
  }

  const trackedX = gameState.mode === "driving" ? player.x : character.x;
  const trackedY = gameState.mode === "driving" ? player.y : character.y;
  const trackedSpeed = gameState.mode === "driving" ? Math.abs(player.speed) * 18 : 0;

  speedEl.textContent = Math.round(trackedSpeed);
  positionEl.textContent = `${Math.round(trackedX)}, ${Math.round(trackedY)}`;
  modeIndicatorEl.textContent = gameState.mode === "driving" ? "В машине" : "Пешком";
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

  ctx.fillStyle = "#d7c94b";
  ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

  ctx.fillStyle = "#2a2f38";
  ctx.fillRect(-player.width / 2 + 4, -player.height / 2 + 6, player.width - 8, player.height - 20);

  ctx.fillStyle = "#d83145";
  ctx.fillRect(-3, -player.height / 2 + 2, 6, 10);

  ctx.restore();
}

function drawCharacter(cameraX, cameraY) {
  if (gameState.mode !== "onFoot") return;

  const drawX = character.x - cameraX;
  const drawY = character.y - cameraY;

  ctx.save();
  ctx.translate(drawX, drawY);

  ctx.fillStyle = "#f3d9b1";
  ctx.beginPath();
  ctx.arc(0, 0, character.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(character.angle) * (character.radius + 6), Math.sin(character.angle) * (character.radius + 6));
  ctx.stroke();

  ctx.restore();
}

function gameLoop() {
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;

  updatePhysics();

  const targetX = gameState.mode === "driving" ? player.x : character.x;
  const targetY = gameState.mode === "driving" ? player.y : character.y;

  const cameraX = clamp(targetX - viewW / 2, 0, world.width - viewW);
  const cameraY = clamp(targetY - viewH / 2, 0, world.height - viewH);

  drawWorld(cameraX, cameraY, viewW, viewH);
  drawPlayer(cameraX, cameraY);
  drawCharacter(cameraX, cameraY);

  requestAnimationFrame(gameLoop);
}

setupKeyboard();
setupButtons();
setupJoystick();
requestAnimationFrame(gameLoop);
