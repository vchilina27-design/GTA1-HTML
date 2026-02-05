const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const speedEl = document.getElementById("speed");
const positionEl = document.getElementById("position");
const modeEl = document.getElementById("mode");
const wantedEl = document.getElementById("wanted");
const policeCountEl = document.getElementById("police-count");

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

const policeStation = {
  x: 280,
  y: 280,
  width: 280,
  height: 210,
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
  maxSpeed: 3,
};

const gameState = {
  mode: "driving",
  wantedLevel: 0,
  message: "",
  messageTimer: 0,
};

const keyboard = {
  up: false,
  down: false,
  left: false,
  right: false,
};

const touch = {
  accelerate: false,
  brake: false,
  joyX: 0,
  joyY: 0,
};

const joystickState = {
  active: false,
  pointerId: null,
  centerX: 0,
  centerY: 0,
  x: 0,
  y: 0,
  radius: 52,
};

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function createNpc(kind) {
  const npc = {
    kind,
    x: randomRange(160, world.width - 160),
    y: randomRange(160, world.height - 160),
    dir: randomRange(0, Math.PI * 2),
    speed: kind === "police" ? 1.7 : 1.1,
    state: "wander",
    turnTimer: randomRange(40, 140),
    disabledTimer: 0,
  };

  if (
    npc.x > policeStation.x - 120 &&
    npc.x < policeStation.x + policeStation.width + 120 &&
    npc.y > policeStation.y - 120 &&
    npc.y < policeStation.y + policeStation.height + 120
  ) {
    npc.x += 300;
    npc.y += 240;
  }

  return npc;
}

const pedestrians = Array.from({ length: 22 }, () => createNpc("civil"));
const policeUnits = Array.from({ length: 6 }, () => createNpc("police"));

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
  actionBtn.textContent = "Выйти";
  accelerateBtn.classList.remove("hidden");
  brakeBtn.classList.remove("hidden");
  modeEl.textContent = "В машине";
}

function setOnFootMode() {
  gameState.mode = "onFoot";
  car.speed *= 0.88;
  touch.accelerate = false;
  touch.brake = false;
  accelerateBtn.classList.remove("active");
  brakeBtn.classList.remove("active");
  actionBtn.textContent = "Сесть";
  accelerateBtn.classList.add("hidden");
  brakeBtn.classList.add("hidden");
  modeEl.textContent = "Пешком";
}

function setKeyboardFlag(code, value) {
  if (code === "KeyW" || code === "ArrowUp") keyboard.up = value;
  if (code === "KeyS" || code === "ArrowDown") keyboard.down = value;
  if (code === "KeyA" || code === "ArrowLeft") keyboard.left = value;
  if (code === "KeyD" || code === "ArrowRight") keyboard.right = value;
}

function setupKeyboard() {
  window.addEventListener("keydown", (event) => {
    setKeyboardFlag(event.code, true);
    if (event.code === "KeyE") {
      event.preventDefault();
      toggleEnterExit();
    }
  });

  window.addEventListener("keyup", (event) => {
    setKeyboardFlag(event.code, false);
  });
}

function bindHoldButton(button, key) {
  const start = (event) => {
    event.preventDefault();
    touch[key] = true;
    button.classList.add("active");
  };

  const stop = (event) => {
    event.preventDefault();
    touch[key] = false;
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

  const releaseAction = (event) => {
    event.preventDefault();
    actionBtn.classList.remove("active");
  };

  actionBtn.addEventListener("pointercancel", releaseAction);
  actionBtn.addEventListener("pointerleave", releaseAction);
  actionBtn.addEventListener("pointerup", (event) => {
    releaseAction(event);
    toggleEnterExit();
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
    touch.joyX = 0;
    touch.joyY = 0;
    joystickStick.style.transform = "translate(-50%, -50%)";
  };

  const moveStick = (clientX, clientY) => {
    const dx = clientX - joystickState.centerX;
    const dy = clientY - joystickState.centerY;
    const dist = Math.hypot(dx, dy);
    const maxDist = joystickState.radius;

    const ratio = dist > maxDist ? maxDist / dist : 1;
    joystickState.x = dx * ratio;
    joystickState.y = dy * ratio;

    touch.joyX = clamp(joystickState.x / maxDist, -1, 1);
    touch.joyY = clamp(joystickState.y / maxDist, -1, 1);

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
    if (event.pointerId === joystickState.pointerId) reset();
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
  if (canEnter) setDrivingMode();
}

function getDrivingInput() {
  const accelerate = keyboard.up || touch.accelerate;
  const brake = keyboard.down || touch.brake;

  const keySteer = (keyboard.right ? 1 : 0) + (keyboard.left ? -1 : 0);
  const steer = joystickState.active ? touch.joyX : keySteer;

  return { accelerate, brake, steer };
}

function getOnFootInput() {
  const keyX = (keyboard.right ? 1 : 0) + (keyboard.left ? -1 : 0);
  const keyY = (keyboard.down ? 1 : 0) + (keyboard.up ? -1 : 0);

  if (joystickState.active) {
    return { x: touch.joyX, y: touch.joyY };
  }
  return { x: keyX, y: keyY };
}

function updateDriving() {
  const input = getDrivingInput();

  if (input.accelerate) car.speed += car.accel;
  if (input.brake) {
    if (car.speed > 0) car.speed -= car.brake;
    else car.speed -= car.accel * 0.65;
  }

  if (!input.accelerate && !input.brake) {
    if (Math.abs(car.speed) < car.friction) car.speed = 0;
    else car.speed -= Math.sign(car.speed) * car.friction;
  }

  car.speed = clamp(car.speed, -2.6, car.maxSpeed);

  if (car.speed !== 0) {
    const steerFactor = clamp(Math.abs(car.speed) / car.maxSpeed, 0.25, 1);
    car.angle += input.steer * car.turnRate * steerFactor;
  }

  car.x += Math.cos(car.angle) * car.speed;
  car.y += Math.sin(car.angle) * car.speed;
}

function updateOnFoot() {
  const input = getOnFootInput();
  const len = Math.hypot(input.x, input.y);
  if (len > 0.01) {
    const x = input.x / len;
    const y = input.y / len;
    character.x += x * character.maxSpeed;
    character.y += y * character.maxSpeed;
    character.angle = Math.atan2(y, x) + Math.PI / 2;
  }
}

function setAlert(message) {
  gameState.message = message;
  gameState.messageTimer = 180;
}

function increaseWanted(amount) {
  gameState.wantedLevel = clamp(gameState.wantedLevel + amount, 0, 5);
}

function updateNpcMovement(npc, targetX, targetY, chaseDistance) {
  if (npc.disabledTimer > 0) {
    npc.disabledTimer -= 1;
    return;
  }

  const toTarget = distance(npc.x, npc.y, targetX, targetY);

  if (npc.kind === "police" && (gameState.wantedLevel > 0 || toTarget < chaseDistance)) {
    npc.state = "chase";
    npc.dir = Math.atan2(targetY - npc.y, targetX - npc.x);
  } else {
    npc.state = "wander";
    npc.turnTimer -= 1;
    if (npc.turnTimer <= 0) {
      npc.turnTimer = randomRange(50, 150);
      npc.dir += randomRange(-1.1, 1.1);
    }
  }

  const speedMul = npc.state === "chase" ? 1.45 : 1;
  npc.x += Math.cos(npc.dir) * npc.speed * speedMul;
  npc.y += Math.sin(npc.dir) * npc.speed * speedMul;

  npc.x = clamp(npc.x, 35, world.width - 35);
  npc.y = clamp(npc.y, 35, world.height - 35);
}

function updateNpcs() {
  const targetX = gameState.mode === "driving" ? car.x : character.x;
  const targetY = gameState.mode === "driving" ? car.y : character.y;

  for (const npc of pedestrians) {
    updateNpcMovement(npc, targetX, targetY, 90);

    if (gameState.mode === "driving" && npc.disabledTimer <= 0) {
      const hitDistance = distance(npc.x, npc.y, car.x, car.y);
      if (hitDistance < 28 && Math.abs(car.speed) > 2.2) {
        npc.disabledTimer = 180;
        increaseWanted(1);
        setAlert("Полиция: вы сбили пешехода!");
      }
    }
  }

  for (const cop of policeUnits) {
    updateNpcMovement(cop, targetX, targetY, 300);

    const arrestDistance = distance(cop.x, cop.y, targetX, targetY);
    if (gameState.wantedLevel > 0 && arrestDistance < 25 && gameState.mode === "onFoot") {
      gameState.wantedLevel = 0;
      character.x = policeStation.x + policeStation.width / 2;
      character.y = policeStation.y + policeStation.height + 24;
      setAlert("Вас задержали и доставили в участок");
    }
  }

  if (gameState.wantedLevel > 0 && Math.random() < 0.001) {
    gameState.wantedLevel -= 1;
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

function drawMessage(viewW) {
  if (gameState.messageTimer <= 0) return;

  gameState.messageTimer -= 1;
  ctx.save();
  ctx.font = "bold 18px Inter, sans-serif";
  ctx.textAlign = "center";
  const text = gameState.message;
  const width = ctx.measureText(text).width + 24;
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fillRect(viewW / 2 - width / 2, 82, width, 34);
  ctx.fillStyle = "#ff8b8b";
  ctx.fillText(text, viewW / 2, 105);
  ctx.restore();
}

function updatePhysics() {
  if (gameState.mode === "driving") updateDriving();
  else updateOnFoot();

  car.x = clamp(car.x, 40, world.width - 40);
  car.y = clamp(car.y, 40, world.height - 40);
  character.x = clamp(character.x, 25, world.width - 25);
  character.y = clamp(character.y, 25, world.height - 25);

  updateNpcs();
  updateActionButtonState();

  const activeX = gameState.mode === "driving" ? car.x : character.x;
  const activeY = gameState.mode === "driving" ? car.y : character.y;
  const activeSpeed = gameState.mode === "driving" ? Math.abs(car.speed) * 18 : 0;

  speedEl.textContent = Math.round(activeSpeed);
  positionEl.textContent = `${Math.round(activeX)}, ${Math.round(activeY)}`;
  wantedEl.textContent = gameState.wantedLevel;
  policeCountEl.textContent = policeUnits.length;
}

function drawRoadMarkings(drawX, drawY, block, road) {
  ctx.fillStyle = "rgba(247, 219, 96, 0.65)";
  for (let i = 0; i < 6; i += 1) {
    const offset = 10 + i * (road + 8);
    ctx.fillRect(drawX + block / 2 - 2, drawY + offset, 4, 18);
    ctx.fillRect(drawX + offset, drawY + block / 2 - 2, 18, 4);
  }
}

function drawPoliceStation(cameraX, cameraY) {
  const x = policeStation.x - cameraX;
  const y = policeStation.y - cameraY;

  ctx.fillStyle = "#2e3b5a";
  ctx.fillRect(x, y, policeStation.width, policeStation.height);

  ctx.fillStyle = "#9db6ff";
  ctx.fillRect(x + 12, y + 14, policeStation.width - 24, 20);

  ctx.fillStyle = "#19233b";
  ctx.fillRect(x + policeStation.width / 2 - 24, y + policeStation.height - 52, 48, 52);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ПОЛИЦИЯ", x + policeStation.width / 2, y + 29);
}

function drawCityBlock(drawX, drawY, block, road, x, y) {
  ctx.fillStyle = "#2b3442";
  ctx.fillRect(drawX, drawY, block, block);

  const innerX = drawX + road;
  const innerY = drawY + road;
  const innerSize = block - road * 2;
  const zoneSeed = Math.abs((x / block) * 31 + (y / block) * 17) % 5;

  if (zoneSeed === 0) {
    ctx.fillStyle = "#58a366";
    ctx.fillRect(innerX, innerY, innerSize, innerSize);
    ctx.fillStyle = "#2f7040";
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(innerX + 24 + i * 24, innerY + 28 + (i % 2) * 26, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = zoneSeed % 2 ? "#707f93" : "#8290a3";
    ctx.fillRect(innerX, innerY, innerSize, innerSize);

    ctx.fillStyle = "rgba(26,33,46,0.45)";
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        ctx.fillRect(innerX + 12 + col * 28, innerY + 10 + row * 28, 16, 12);
      }
    }

    ctx.fillStyle = "#cfd5df";
    ctx.fillRect(innerX + 8, innerY + innerSize - 20, innerSize - 16, 10);
  }

  drawRoadMarkings(drawX, drawY, block, road);
}

function drawWorld(cameraX, cameraY, viewW, viewH) {
  ctx.fillStyle = "#1b2433";
  ctx.fillRect(0, 0, viewW, viewH);

  const block = world.block;
  const road = world.road;
  const startX = Math.floor(cameraX / block) * block - block;
  const startY = Math.floor(cameraY / block) * block - block;

  for (let x = startX; x < cameraX + viewW + block; x += block) {
    for (let y = startY; y < cameraY + viewH + block; y += block) {
      drawCityBlock(x - cameraX, y - cameraY, block, road, x, y);
    }
  }

  drawPoliceStation(cameraX, cameraY);

  ctx.strokeStyle = "rgba(255,255,255,0.09)";
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

function drawNpc(cameraX, cameraY, npc) {
  const drawX = npc.x - cameraX;
  const drawY = npc.y - cameraY;

  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.rotate(npc.dir + Math.PI / 2);

  ctx.fillStyle = npc.kind === "police" ? "#5f8dff" : "#7be08f";
  if (npc.disabledTimer > 0) ctx.fillStyle = "#9f6b6b";

  ctx.beginPath();
  ctx.arc(0, -5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-4, 1, 8, 12);

  if (npc.kind === "police") {
    ctx.fillStyle = "#c6d8ff";
    ctx.fillRect(-4, 3, 8, 2);
  }

  ctx.restore();
}

function drawCar(cameraX, cameraY) {
  const drawX = car.x - cameraX;
  const drawY = car.y - cameraY;

  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.rotate(car.angle);

  ctx.fillStyle = "#ffd34d";
  ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);

  ctx.fillStyle = "#1f2a3a";
  ctx.fillRect(-car.width / 2 + 4, -car.height / 2 + 7, car.width - 8, car.height - 21);

  ctx.fillStyle = "#e13b4c";
  ctx.fillRect(-3, -car.height / 2 + 2, 6, 10);
  ctx.restore();
}

function drawCharacter(cameraX, cameraY) {
  const drawX = character.x - cameraX;
  const drawY = character.y - cameraY;

  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.rotate(character.angle);

  ctx.fillStyle = "#ffd7b5";
  ctx.beginPath();
  ctx.arc(0, -5, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#67d6ff";
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
  for (const npc of pedestrians) drawNpc(cameraX, cameraY, npc);
  for (const cop of policeUnits) drawNpc(cameraX, cameraY, cop);
  drawCar(cameraX, cameraY);
  if (gameState.mode === "onFoot") drawCharacter(cameraX, cameraY);
  drawMessage(viewW);

  requestAnimationFrame(gameLoop);
}

setupKeyboard();
setupButtons();
setupJoystick();
setDrivingMode();
requestAnimationFrame(gameLoop);
