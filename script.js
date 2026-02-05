const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const speedEl = document.getElementById("speed");
const positionEl = document.getElementById("position");
 codex/-gta-1-cio80j
const modeEl = document.getElementById("mode");


 codex/-gta-1-x1i7rv
const modeEl = document.getElementById("mode");

 main

 main
const joystickBase = document.getElementById("joystick-base");
const joystickStick = document.getElementById("joystick-stick");
const accelerateBtn = document.getElementById("btn-accelerate");
const brakeBtn = document.getElementById("btn-brake");
const actionBtn = document.getElementById("btn-action");

const world = {
codex/-gta-1-cio80j

 codex/-gta-1-x1i7rv
 main
  width: 3200,
  height: 3200,
  block: 240,
  road: 72,
};

const car = {
 codex/-gta-1-cio80j


  width: 2600,
  height: 2600,
  block: 220,
  road: 64,
};

const player = {
 main
 main
  x: world.width / 2,
  y: world.height / 2,
  angle: -Math.PI / 2,
  speed: 0,
 codex/-gta-1-cio80j

 codex/-gta-1-x1i7rv
 main
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
 codex/-gta-1-cio80j
  maxSpeed: 3,
};

const gameState = {
  mode: "driving",
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


  speed: 0,
  maxSpeed: 3,
  radius: 10,
};

const gameState = {

  width: 26,
  height: 44,
  maxSpeed: 6.3,
  accel: 0.18,
  brake: 0.26,
  friction: 0.05,
  turnRate: 0.042,
  onFootSpeed: 2.2,
 main
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
 main
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

 codex/-gta-1-cio80j

 codex/-gta-1-x1i7rv
 main
function distance(aX, aY, bX, bY) {
  return Math.hypot(aX - bX, aY - bY);
}

function setDrivingMode() {
  gameState.mode = "driving";
 codex/-gta-1-cio80j

  controls.moveX = 0;
  controls.moveY = 0;
main
  actionBtn.textContent = "Выйти";
  accelerateBtn.classList.remove("hidden");
  brakeBtn.classList.remove("hidden");
  modeEl.textContent = "В машине";
}

function setOnFootMode() {
  gameState.mode = "onFoot";
 codex/-gta-1-cio80j
  car.speed *= 0.88;
  touch.accelerate = false;
  touch.brake = false;
  accelerateBtn.classList.remove("active");
  brakeBtn.classList.remove("active");

  controls.accelerate = false;
  controls.brake = false;
  car.speed *= 0.9;
 main
  actionBtn.textContent = "Сесть";
  accelerateBtn.classList.add("hidden");
  brakeBtn.classList.add("hidden");
  modeEl.textContent = "Пешком";
 codex/-gta-1-cio80j
}

function setKeyboardFlag(code, value) {
  if (code === "KeyW" || code === "ArrowUp") keyboard.up = value;
  if (code === "KeyS" || code === "ArrowDown") keyboard.down = value;
  if (code === "KeyA" || code === "ArrowLeft") keyboard.left = value;
  if (code === "KeyD" || code === "ArrowRight") keyboard.right = value;


function getNearestParkedCar(px, py) {
  const block = world.block;
  let nearest = null;

  const blockX = Math.floor(px / block);
  const blockY = Math.floor(py / block);

  for (let gx = blockX - 1; gx <= blockX + 1; gx += 1) {
    for (let gy = blockY - 1; gy <= blockY + 1; gy += 1) {
      const x = gx * block;
      const y = gy * block;
      const carCount = ((x + y) / block) % 4;

      for (let i = 0; i < carCount; i += 1) {
        const carX = x + 8 + i * 15 + 5;
        const carY = y + 10 + 9;
        const dx = px - carX;
        const dy = py - carY;
        const dist = Math.hypot(dx, dy);

        if (!nearest || dist < nearest.dist) {
          nearest = { x: carX, y: carY, dist };
        }
      }
    }
  }

  return nearest;
}

function canEnterNearbyCar() {
  const nearest = getNearestParkedCar(player.x, player.y);
  return Boolean(nearest && nearest.dist <= 52);
}

function syncControlUIByMode() {
  const driving = player.mode === "driving";
  const canEnterCar = !driving && canEnterNearbyCar();

  accelerateBtn.disabled = !driving;
  brakeBtn.disabled = !driving;
  accelerateBtn.classList.toggle("disabled", !driving);
  brakeBtn.classList.toggle("disabled", !driving);

  actionBtn.textContent = driving ? "Выйти" : "Сесть";
  actionBtn.disabled = !driving && !canEnterCar;
  actionBtn.classList.toggle("disabled", actionBtn.disabled);
  actionBtn.classList.toggle("active", !actionBtn.disabled);
 main
 main
}

function setupKeyboard() {
  window.addEventListener("keydown", (event) => {
 codex/-gta-1-cio80j
    setKeyboardFlag(event.code, true);
    if (event.code === "KeyE") {
      event.preventDefault();
      toggleEnterExit();

    keyState.add(event.code);

    if (event.code === "KeyE") {
 codex/-gta-1-x1i7rv
      event.preventDefault();
      toggleEnterExit();

      handleActionButton();
 main
 main
    }
  });

  window.addEventListener("keyup", (event) => {
 codex/-gta-1-cio80j
    setKeyboardFlag(event.code, false);
  });
}

function bindHoldButton(button, key) {
  const start = (event) => {
    event.preventDefault();
    touch[key] = true;

    keyState.delete(event.code);
  });
}

 codex/-gta-1-x1i7rv
function bindHoldButton(button, key) {
  const start = (event) => {
    event.preventDefault();
    controls[key] = true;
 main
    button.classList.add("active");
  };

  const stop = (event) => {
    event.preventDefault();
 codex/-gta-1-cio80j
    touch[key] = false;

    controls[key] = false;
 main
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

 codex/-gta-1-cio80j
  const releaseAction = (event) => {
    event.preventDefault();
    actionBtn.classList.remove("active");
  };

  actionBtn.addEventListener("pointercancel", releaseAction);
  actionBtn.addEventListener("pointerleave", releaseAction);
  actionBtn.addEventListener("pointerup", (event) => {
    releaseAction(event);
    toggleEnterExit();

  actionBtn.addEventListener("pointerup", (event) => {
    event.preventDefault();
    actionBtn.classList.remove("active");
    toggleEnterExit();
  });

  actionBtn.addEventListener("pointercancel", () => {
    actionBtn.classList.remove("active");

function setupButtons() {
  const bindButton = (button, key) => {
    const start = (event) => {
      event.preventDefault();
      if (button.disabled) return;
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

  actionBtn.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (actionBtn.disabled) return;
    handleActionButton();
 main
 main
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
 codex/-gta-1-cio80j
    touch.joyX = 0;
    touch.joyY = 0;

    controls.steer = 0;
    controls.moveX = 0;
    controls.moveY = 0;
 main
    joystickStick.style.transform = "translate(-50%, -50%)";
  };

  const moveStick = (clientX, clientY) => {
    const dx = clientX - joystickState.centerX;
    const dy = clientY - joystickState.centerY;
 codex/-gta-1-cio80j
    const dist = Math.hypot(dx, dy);
    const maxDist = joystickState.radius;

    const ratio = dist > maxDist ? maxDist / dist : 1;
    joystickState.x = dx * ratio;
    joystickState.y = dy * ratio;

    touch.joyX = clamp(joystickState.x / maxDist, -1, 1);
    touch.joyY = clamp(joystickState.y / maxDist, -1, 1);

 codex/-gta-1-x1i7rv
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

    const distance = Math.hypot(dx, dy);
    const maxDist = joystickState.radius;

    const ratio = distance > maxDist ? maxDist / distance : 1;
    joystickState.x = dx * ratio;
    joystickState.y = dy * ratio;

    controls.steer = clamp(joystickState.x / maxDist, -1, 1);
    controls.moveX = clamp(joystickState.x / maxDist, -1, 1);
    controls.moveY = clamp(joystickState.y / maxDist, -1, 1);
 main
 main

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
 codex/-gta-1-cio80j
    if (event.pointerId === joystickState.pointerId) reset();
  });
  joystickBase.addEventListener("pointercancel", reset);


    if (event.pointerId === joystickState.pointerId) {
      reset();
    }
  });

  joystickBase.addEventListener("pointercancel", reset);
 main
  window.addEventListener("resize", updateCenter);
  updateCenter();
}

 codex/-gta-1-cio80j

 codex/-gta-1-x1i7rv
 main
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
 codex/-gta-1-cio80j
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
 main
    if (car.speed > 0) car.speed -= car.brake;
    else car.speed -= car.accel * 0.65;
  }

 codex/-gta-1-cio80j
  if (!input.accelerate && !input.brake) {
    if (Math.abs(car.speed) < car.friction) car.speed = 0;
    else car.speed -= Math.sign(car.speed) * car.friction;

  if (!controls.accelerate && !controls.brake) {
    if (Math.abs(car.speed) < car.friction) {
      car.speed = 0;
    } else {
      car.speed -= Math.sign(car.speed) * car.friction;
    }
 main
  }

  car.speed = clamp(car.speed, -2.6, car.maxSpeed);

  if (car.speed !== 0) {
    const steerFactor = clamp(Math.abs(car.speed) / car.maxSpeed, 0.25, 1);
 codex/-gta-1-cio80j
    car.angle += input.steer * car.turnRate * steerFactor;

    car.angle += controls.steer * car.turnRate * steerFactor;
 main
  }

  car.x += Math.cos(car.angle) * car.speed;
  car.y += Math.sin(car.angle) * car.speed;
}

function updateOnFoot() {
 codex/-gta-1-cio80j
  const input = getOnFootInput();
  const len = Math.hypot(input.x, input.y);
  if (len > 0.01) {
    const x = input.x / len;
    const y = input.y / len;
    character.x += x * character.maxSpeed;
    character.y += y * character.maxSpeed;
    character.angle = Math.atan2(y, x) + Math.PI / 2;

  const moveLen = Math.hypot(controls.moveX, controls.moveY);
  if (moveLen > 0.01) {
    const normX = controls.moveX / moveLen;
    const normY = controls.moveY / moveLen;
    character.x += normX * character.maxSpeed;
    character.y += normY * character.maxSpeed;
    character.angle = Math.atan2(normY, normX) + Math.PI / 2;
 main
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
 codex/-gta-1-cio80j
}

function updatePhysics() {

function updateControlsFromKeyboard() {
  const driving = player.mode === "driving";

  if (driving && !controls.accelerate) {
    controls.accelerate = keyState.has("KeyW") || keyState.has("ArrowUp");
  }

  if (driving && !controls.brake) {
    controls.brake = keyState.has("KeyS") || keyState.has("ArrowDown");
  }

  if (!driving) {
    controls.accelerate = false;
    controls.brake = false;
  }

  if (!joystickState.active) {
    const left = keyState.has("KeyA") || keyState.has("ArrowLeft");
    const right = keyState.has("KeyD") || keyState.has("ArrowRight");
    const up = keyState.has("KeyW") || keyState.has("ArrowUp");
    const down = keyState.has("KeyS") || keyState.has("ArrowDown");

    controls.steer = (right ? 1 : 0) + (left ? -1 : 0);
    controls.moveX = controls.steer;
    controls.moveY = (down ? 1 : 0) + (up ? -1 : 0);
  }
}

function handleActionButton() {
  if (player.mode === "driving") {
    player.mode = "onFoot";
    player.speed = 0;
    player.x += Math.cos(player.angle + Math.PI / 2) * 24;
    player.y += Math.sin(player.angle + Math.PI / 2) * 24;
  } else if (canEnterNearbyCar()) {
    player.mode = "driving";
    controls.moveX = 0;
    controls.moveY = 0;
  }

  syncControlUIByMode();
 main
}

function updatePhysics() {
  updateControlsFromKeyboard();

 codex/-gta-1-x1i7rv
 main
  if (gameState.mode === "driving") updateDriving();
  else updateOnFoot();

  car.x = clamp(car.x, 40, world.width - 40);
  car.y = clamp(car.y, 40, world.height - 40);
 codex/-gta-1-cio80j


main
  character.x = clamp(character.x, 25, world.width - 25);
  character.y = clamp(character.y, 25, world.height - 25);

  updateActionButtonState();

  const activeX = gameState.mode === "driving" ? car.x : character.x;
  const activeY = gameState.mode === "driving" ? car.y : character.y;
 codex/-gta-1-cio80j
  const activeSpeed = gameState.mode === "driving" ? Math.abs(car.speed) * 18 : 0;

  speedEl.textContent = Math.round(activeSpeed);
  positionEl.textContent = `${Math.round(activeX)}, ${Math.round(activeY)}`;
}

function drawRoadMarkings(drawX, drawY, block, road) {
  ctx.fillStyle = "rgba(247, 219, 96, 0.65)";
  for (let i = 0; i < 6; i += 1) {
    const offset = 10 + i * (road + 8);
    ctx.fillRect(drawX + block / 2 - 2, drawY + offset, 4, 18);
    ctx.fillRect(drawX + offset, drawY + block / 2 - 2, 18, 4);

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
 main
  }
}

function drawCityBlock(drawX, drawY, block, road, x, y) {
 codex/-gta-1-cio80j
  ctx.fillStyle = "#2b3442";

  ctx.fillStyle = "#2f343c";
 main
  ctx.fillRect(drawX, drawY, block, block);

  const innerX = drawX + road;
  const innerY = drawY + road;
  const innerSize = block - road * 2;
 codex/-gta-1-cio80j
  const zoneSeed = Math.abs((x / block) * 31 + (y / block) * 17) % 5;

  if (zoneSeed === 0) {
    ctx.fillStyle = "#58a366";
    ctx.fillRect(innerX, innerY, innerSize, innerSize);
    ctx.fillStyle = "#2f7040";


  const zoneSeed = Math.abs((x / block) * 31 + (y / block) * 17) % 5;

  if (zoneSeed === 0) {
    ctx.fillStyle = "#407d49";
    ctx.fillRect(innerX, innerY, innerSize, innerSize);
    ctx.fillStyle = "#2c5a33";
 main
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(innerX + 24 + i * 24, innerY + 28 + (i % 2) * 26, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
 codex/-gta-1-cio80j
    ctx.fillStyle = zoneSeed % 2 ? "#707f93" : "#8290a3";
    ctx.fillRect(innerX, innerY, innerSize, innerSize);

    ctx.fillStyle = "rgba(26,33,46,0.45)";

    ctx.fillStyle = zoneSeed % 2 ? "#59616f" : "#676f7c";
    ctx.fillRect(innerX, innerY, innerSize, innerSize);

    ctx.fillStyle = "rgba(12,16,25,0.35)";
 main
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        ctx.fillRect(innerX + 12 + col * 28, innerY + 10 + row * 28, 16, 12);
      }
    }

 codex/-gta-1-cio80j
    ctx.fillStyle = "#cfd5df";

    ctx.fillStyle = "#8f939c";
 main
    ctx.fillRect(innerX + 8, innerY + innerSize - 20, innerSize - 16, 10);
  }

  drawRoadMarkings(drawX, drawY, block, road);
}

function drawWorld(cameraX, cameraY, viewW, viewH) {
 codex/-gta-1-cio80j
  ctx.fillStyle = "#1b2433";

  ctx.fillStyle = "#232831";

  if (player.mode === "driving") {
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
  } else {
    player.speed = 0;

    const moveLen = Math.hypot(controls.moveX, controls.moveY);
    if (moveLen > 0) {
      const normX = controls.moveX / moveLen;
      const normY = controls.moveY / moveLen;

      player.x += normX * player.onFootSpeed;
      player.y += normY * player.onFootSpeed;
      player.angle = Math.atan2(normY, normX) + Math.PI / 2;
    }
  }

  player.x = clamp(player.x, 40, world.width - 40);
  player.y = clamp(player.y, 40, world.height - 40);

  speedEl.textContent = player.mode === "driving" ? Math.round(Math.abs(player.speed) * 18) : Math.round(player.onFootSpeed * Math.hypot(controls.moveX, controls.moveY) * 10);
  positionEl.textContent = `${Math.round(player.x)}, ${Math.round(player.y)}`;

  syncControlUIByMode();
}

function drawWorld(cameraX, cameraY, viewW, viewH) {
  ctx.fillStyle = "#3e434b";
 main
 main
  ctx.fillRect(0, 0, viewW, viewH);

  const block = world.block;
  const road = world.road;
 codex/-gta-1-cio80j


 main
  const startX = Math.floor(cameraX / block) * block - block;
  const startY = Math.floor(cameraY / block) * block - block;

  for (let x = startX; x < cameraX + viewW + block; x += block) {
    for (let y = startY; y < cameraY + viewH + block; y += block) {
 codex/-gta-1-cio80j
      drawCityBlock(x - cameraX, y - cameraY, block, road, x, y);
    }
  }

  ctx.strokeStyle = "rgba(255,255,255,0.09)";

      const drawX = x - cameraX;
      const drawY = y - cameraY;
 codex/-gta-1-x1i7rv
      drawCityBlock(drawX, drawY, block, road, x, y);
    }
  }

  ctx.strokeStyle = "rgba(255,255,255,0.07)";
 main
  ctx.lineWidth = 1;
  for (let x = startX; x < cameraX + viewW + block; x += block) {
    ctx.beginPath();
    ctx.moveTo(x - cameraX, 0);
    ctx.lineTo(x - cameraX, viewH);
 codex/-gta-1-cio80j
    ctx.stroke();
  }
  for (let y = startY; y < cameraY + viewH + block; y += block) {
    ctx.beginPath();
    ctx.moveTo(0, y - cameraY);
    ctx.lineTo(viewW, y - cameraY);



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
 main
    ctx.stroke();
  }

  for (let y = startY; y < cameraY + viewH + block; y += block) {
    ctx.beginPath();
 codex/-gta-1-x1i7rv
    ctx.moveTo(0, y - cameraY);
    ctx.lineTo(viewW, y - cameraY);

    ctx.moveTo(0, y - cameraY + road / 2);
    ctx.lineTo(viewW, y - cameraY + road / 2);
    ctx.moveTo(0, y - cameraY + block - road / 2);
    ctx.lineTo(viewW, y - cameraY + block - road / 2);
 main
 main
    ctx.stroke();
  }
}

 codex/-gta-1-cio80j

 codex/-gta-1-x1i7rv
 main
function drawCar(cameraX, cameraY) {
  const drawX = car.x - cameraX;
  const drawY = car.y - cameraY;

  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.rotate(car.angle);

 codex/-gta-1-cio80j
  ctx.fillStyle = "#ffd34d";
  ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);

  ctx.fillStyle = "#1f2a3a";
  ctx.fillRect(-car.width / 2 + 4, -car.height / 2 + 7, car.width - 8, car.height - 21);

  ctx.fillStyle = "#e13b4c";
  ctx.fillRect(-3, -car.height / 2 + 2, 6, 10);

  ctx.fillStyle = "#d7c94b";
  ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);

  ctx.fillStyle = "#2a2f38";
  ctx.fillRect(-car.width / 2 + 4, -car.height / 2 + 7, car.width - 8, car.height - 21);

  ctx.fillStyle = "#d83145";
  ctx.fillRect(-3, -car.height / 2 + 2, 6, 10);

 main
  ctx.restore();
}

function drawCharacter(cameraX, cameraY) {
  const drawX = character.x - cameraX;
  const drawY = character.y - cameraY;

  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.rotate(character.angle);

 codex/-gta-1-cio80j
  ctx.fillStyle = "#ffd7b5";

  ctx.fillStyle = "#dfc4a0";
 main
  ctx.beginPath();
  ctx.arc(0, -5, 6, 0, Math.PI * 2);
  ctx.fill();

 codex/-gta-1-cio80j
  ctx.fillStyle = "#67d6ff";

  ctx.fillStyle = "#7fd8ff";
 main
  ctx.fillRect(-5, 2, 10, 12);

  ctx.strokeStyle = "#1f2530";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, -9);
  ctx.stroke();
 codex/-gta-1-cio80j
  ctx.restore();


  ctx.restore();

function drawPlayer(cameraX, cameraY) {
  const drawX = player.x - cameraX;
  const drawY = player.y - cameraY;

  if (player.mode === "driving") {
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
  } else {
    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(player.angle);

    ctx.fillStyle = "#7cc7ff";
    ctx.fillRect(-9, -12, 18, 24);
    ctx.fillStyle = "#f3d9b1";
    ctx.beginPath();
    ctx.arc(0, -18, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
 main
 main
}

function gameLoop() {
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;

  updatePhysics();

 codex/-gta-1-cio80j

 codex/-gta-1-x1i7rv
 main
  const targetX = gameState.mode === "driving" ? car.x : character.x;
  const targetY = gameState.mode === "driving" ? car.y : character.y;
  const cameraX = clamp(targetX - viewW / 2, 0, world.width - viewW);
  const cameraY = clamp(targetY - viewH / 2, 0, world.height - viewH);

  drawWorld(cameraX, cameraY, viewW, viewH);
  drawCar(cameraX, cameraY);
  if (gameState.mode === "onFoot") drawCharacter(cameraX, cameraY);

 codex/-gta-1-cio80j

  const cameraX = clamp(player.x - viewW / 2, 0, world.width - viewW);
  const cameraY = clamp(player.y - viewH / 2, 0, world.height - viewH);

  drawWorld(cameraX, cameraY, viewW, viewH);
  drawPlayer(cameraX, cameraY);
 main

 main
  requestAnimationFrame(gameLoop);
}

setupKeyboard();
setupButtons();
setupJoystick();
 codex/-gta-1-cio80j
setDrivingMode();

 codex/-gta-1-x1i7rv
setDrivingMode();

syncControlUIByMode();
 main
 main
requestAnimationFrame(gameLoop);
