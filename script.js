const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const speedEl = document.getElementById("speed");
const positionEl = document.getElementById("position");
const modeEl = document.getElementById("mode");
const wantedEl = document.getElementById("wanted");
const zoneEl = document.getElementById("zone");

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
  x: world.width * 0.74,
  y: world.height * 0.25,
  width: 250,
  height: 180,
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
  policeCooldown: 0,
  jailTimer: 0,
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

const npcs = Array.from({ length: 16 }, (_, index) => {
  const seed = index + 1;
  return {
    x: 280 + (seed * 173) % (world.width - 560),
    y: 280 + (seed * 257) % (world.height - 560),
    angle: (seed * 0.7) % (Math.PI * 2),
    speed: 0.8 + (seed % 5) * 0.14,
    dirTimer: 60 + (seed * 9) % 110,
  };
});

const policeUnits = [];

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

function randomDirection() {
  return Math.random() * Math.PI * 2;
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
    const directional = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (directional.includes(event.code)) event.preventDefault();
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

function updateNPCs() {
  npcs.forEach((npc) => {
    npc.dirTimer -= 1;

    if (npc.dirTimer <= 0) {
      npc.angle += (Math.random() - 0.5) * 1.6;
      npc.dirTimer = 80 + Math.floor(Math.random() * 140);
    }

    npc.x += Math.cos(npc.angle) * npc.speed;
    npc.y += Math.sin(npc.angle) * npc.speed;

    const margin = 70;
    if (npc.x < margin || npc.x > world.width - margin || npc.y < margin || npc.y > world.height - margin) {
      npc.angle = randomDirection();
    }

    npc.x = clamp(npc.x, margin, world.width - margin);
    npc.y = clamp(npc.y, margin, world.height - margin);
  });
}

function spawnPolice() {
  if (policeUnits.length >= 6) return;
  policeUnits.push({
    x: policeStation.x + policeStation.width / 2 + (Math.random() - 0.5) * 80,
    y: policeStation.y + policeStation.height + 30 + Math.random() * 60,
    speed: 2 + Math.random() * 1.2,
    angle: randomDirection(),
  });
}

function updatePolice() {
  if (gameState.wantedLevel > 0) {
    gameState.policeCooldown -= 1;
    if (gameState.policeCooldown <= 0) {
      spawnPolice();
      gameState.policeCooldown = clamp(150 - gameState.wantedLevel * 30, 45, 140);
    }
  }

  const targetX = gameState.mode === "driving" ? car.x : character.x;
  const targetY = gameState.mode === "driving" ? car.y : character.y;

  for (let i = policeUnits.length - 1; i >= 0; i -= 1) {
    const police = policeUnits[i];
    const dx = targetX - police.x;
    const dy = targetY - police.y;
    police.angle = Math.atan2(dy, dx);
    police.x += Math.cos(police.angle) * police.speed;
    police.y += Math.sin(police.angle) * police.speed;

    police.x = clamp(police.x, 28, world.width - 28);
    police.y = clamp(police.y, 28, world.height - 28);

    if (distance(police.x, police.y, targetX, targetY) < 26) {
      gameState.wantedLevel = 0;
      policeUnits.length = 0;
      gameState.jailTimer = 220;
      car.speed = 0;
      setOnFootMode();
      character.x = policeStation.x + policeStation.width / 2;
      character.y = policeStation.y + policeStation.height + 40;
      character.angle = 0;
      break;
    }

    if (gameState.wantedLevel === 0 && distance(police.x, police.y, targetX, targetY) > 900) {
      policeUnits.splice(i, 1);
    }
  }
}

function updateWantedLevel() {
  if (gameState.mode !== "driving") return;

  const nearNPC = npcs.some((npc) => distance(car.x, car.y, npc.x, npc.y) < 28);
  if (nearNPC) {
    gameState.wantedLevel = clamp(gameState.wantedLevel + 1, 0, 5);
    gameState.policeCooldown = Math.min(gameState.policeCooldown, 20);

    npcs.forEach((npc) => {
      if (distance(car.x, car.y, npc.x, npc.y) < 32) {
        npc.angle = randomDirection();
        npc.x += Math.cos(npc.angle) * 24;
        npc.y += Math.sin(npc.angle) * 24;
      }
    });
  } else if (Math.abs(car.speed) < 1.2 && gameState.wantedLevel > 0 && Math.random() < 0.005) {
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

function updatePhysics() {
  if (gameState.mode === "driving") updateDriving();
  else updateOnFoot();

  updateNPCs();
  updateWantedLevel();
  updatePolice();

  car.x = clamp(car.x, 40, world.width - 40);
  car.y = clamp(car.y, 40, world.height - 40);
  character.x = clamp(character.x, 25, world.width - 25);
  character.y = clamp(character.y, 25, world.height - 25);

  updateActionButtonState();

  const activeX = gameState.mode === "driving" ? car.x : character.x;
  const activeY = gameState.mode === "driving" ? car.y : character.y;
  const activeSpeed = gameState.mode === "driving" ? Math.abs(car.speed) * 18 : 0;

  if (gameState.jailTimer > 0) {
    gameState.jailTimer -= 1;
    zoneEl.textContent = "Участок";
  } else {
    const nearStation = distance(activeX, activeY, policeStation.x + policeStation.width / 2, policeStation.y + policeStation.height / 2) < 220;
    zoneEl.textContent = nearStation ? "Около участка" : "Город";
  }

  speedEl.textContent = Math.round(activeSpeed);
  wantedEl.textContent = gameState.wantedLevel;
  positionEl.textContent = `${Math.round(activeX)}, ${Math.round(activeY)}`;
}

function drawRoadMarkings(drawX, drawY, block, road) {
  ctx.fillStyle = "rgba(247, 219, 96, 0.65)";
  for (let i = 0; i < 6; i += 1) {
    const offset = 10 + i * (road + 8);
    ctx.fillRect(drawX + block / 2 - 2, drawY + offset, 4, 18);
    ctx.fillRect(drawX + offset, drawY + block / 2 - 2, 18, 4);
  }
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

function drawPoliceStation(cameraX, cameraY) {
  const x = policeStation.x - cameraX;
  const y = policeStation.y - cameraY;

  ctx.fillStyle = "#455a76";
  ctx.fillRect(x, y, policeStation.width, policeStation.height);

  ctx.fillStyle = "#24364f";
  ctx.fillRect(x + 15, y + 15, policeStation.width - 30, policeStation.height - 50);

  ctx.fillStyle = "#d8e8ff";
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      ctx.fillRect(x + 25 + col * 34, y + 25 + row * 24, 20, 12);
    }
  }

  ctx.fillStyle = "#1f2938";
  ctx.fillRect(x + policeStation.width / 2 - 26, y + policeStation.height - 40, 52, 40);

  ctx.fillStyle = "#8fc1ff";
  ctx.font = "700 19px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("POLICE", x + policeStation.width / 2, y + policeStation.height - 54);
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

function drawCharacterEntity(entity, cameraX, cameraY, bodyColor) {
  const drawX = entity.x - cameraX;
  const drawY = entity.y - cameraY;

  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.rotate(entity.angle);

  ctx.fillStyle = "#ffd7b5";
  ctx.beginPath();
  ctx.arc(0, -5, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bodyColor;
  ctx.fillRect(-5, 2, 10, 12);

  ctx.strokeStyle = "#1f2530";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, -9);
  ctx.stroke();
  ctx.restore();
}

function drawNPCs(cameraX, cameraY) {
  npcs.forEach((npc) => drawCharacterEntity(npc, cameraX, cameraY, "#7bd68a"));
}

function drawPlayer(cameraX, cameraY) {
  drawCharacterEntity(character, cameraX, cameraY, "#67d6ff");
}

function drawPolice(cameraX, cameraY) {
  policeUnits.forEach((unit) => {
    ctx.save();
    ctx.translate(unit.x - cameraX, unit.y - cameraY);
    ctx.rotate(unit.angle + Math.PI / 2);

    ctx.fillStyle = "#a8c2ff";
    ctx.fillRect(-10, -14, 20, 28);

    ctx.fillStyle = "#21395a";
    ctx.fillRect(-10, -14, 20, 7);

    ctx.fillStyle = "#ff5b6b";
    ctx.fillRect(-4, -16, 8, 4);
    ctx.restore();
  });
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
  drawNPCs(cameraX, cameraY);
  drawPolice(cameraX, cameraY);
  drawCar(cameraX, cameraY);
  if (gameState.mode === "onFoot") drawPlayer(cameraX, cameraY);

  requestAnimationFrame(gameLoop);
}

setupKeyboard();
setupButtons();
setupJoystick();
setDrivingMode();
requestAnimationFrame(gameLoop);
