const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const scoreNode = document.querySelector("#score");
const bestScoreNode = document.querySelector("#bestScore");
const boostNode = document.querySelector("#boostMeter");
const startButton = document.querySelector("#startButton");
const pauseButton = document.querySelector("#pauseButton");
const restartButton = document.querySelector("#restartButton");
const overlay = document.querySelector("#messageOverlay");
const messageKicker = document.querySelector("#messageKicker");
const messageTitle = document.querySelector("#messageTitle");
const messageBody = document.querySelector("#messageBody");
const runState = document.querySelector("#runState");
const statusLight = document.querySelector("#statusLight");

const storageKey = "star-sprinter-best";
const keys = new Set();
const pointer = { active: false, x: 0, y: 0 };

const state = {
  mode: "ready",
  score: 0,
  best: Number(localStorage.getItem(storageKey) || 0),
  distance: 0,
  speed: 260,
  spawnTimer: 0,
  starTimer: 0,
  lastTime: 0,
  shake: 0,
  boost: 100,
  grace: 0,
  particles: [],
  hazards: [],
  stars: [],
  lanes: [],
};

const player = {
  x: 160,
  y: 270,
  radius: 18,
  vx: 0,
  vy: 0,
};

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * scale);
  canvas.height = Math.floor(rect.height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function resetGame() {
  const bounds = getBounds();
  state.score = 0;
  state.distance = 0;
  state.speed = 260;
  state.spawnTimer = 0.85;
  state.starTimer = 0.9;
  state.shake = 0;
  state.boost = 100;
  state.grace = 1.8;
  state.particles = [];
  state.hazards = [];
  state.stars = [];
  state.lanes = Array.from({ length: 46 }, (_, index) => ({
    x: Math.random() * bounds.width,
    y: (index / 46) * bounds.height,
    size: Math.random() * 2.2 + 0.6,
    drift: Math.random() * 28 + 18,
  }));
  player.x = Math.min(170, bounds.width * 0.25);
  player.y = bounds.height * 0.5;
  player.vx = 0;
  player.vy = 0;
  updateUi();
}

function getBounds() {
  const rect = canvas.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function setMode(mode) {
  state.mode = mode;
  overlay.classList.toggle("is-visible", mode !== "playing");
  statusLight.classList.toggle("is-live", mode === "playing");
  statusLight.classList.toggle("is-danger", mode === "over");

  if (mode === "ready") {
    messageKicker.textContent = "Ready";
    messageTitle.textContent = "Thread the asteroid lanes";
    messageBody.textContent =
      "Move with arrow keys or WASD. Hold Space for boost. Grab stars, dodge mines, and keep the sprint alive.";
    runState.textContent = "Waiting at launch";
  }

  if (mode === "playing") {
    runState.textContent = "Sprint in progress";
  }

  if (mode === "paused") {
    messageKicker.textContent = "Paused";
    messageTitle.textContent = "Paused";
    messageBody.textContent = "Take a breath. Press P or the play button to jump back in.";
    runState.textContent = "Paused mid-flight";
  }

  if (mode === "over") {
    messageKicker.textContent = "Score saved";
    messageTitle.textContent = "Run ended";
    messageBody.textContent = "Tap restart and chase a cleaner line through the field.";
    runState.textContent = "Ship needs a reset";
  }
}

function startGame() {
  if (state.mode === "over" || state.mode === "ready") {
    resetGame();
  }
  setMode("playing");
  state.lastTime = performance.now();
}

function pauseGame() {
  if (state.mode === "playing") {
    setMode("paused");
  } else if (state.mode === "paused") {
    startGame();
  }
}

function updateUi() {
  scoreNode.textContent = Math.floor(state.score).toLocaleString();
  bestScoreNode.textContent = Math.floor(state.best).toLocaleString();
  boostNode.textContent = `${Math.round(state.boost)}%`;
}

function spawnHazard(bounds) {
  const radius = Math.random() * 18 + 18;
  state.hazards.push({
    x: bounds.width + radius + 8,
    y: Math.random() * (bounds.height - radius * 2 - 20) + radius + 10,
    radius,
    spin: Math.random() * 6.28,
    wobble: Math.random() * 42 + 18,
  });
}

function spawnStar(bounds) {
  state.stars.push({
    x: bounds.width + 22,
    y: Math.random() * (bounds.height - 80) + 40,
    radius: 12,
    pulse: Math.random() * 6.28,
  });
}

function burst(x, y, color, amount = 14) {
  for (let i = 0; i < amount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 160 + 60;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: Math.random() * 0.35 + 0.35,
      maxLife: 0.7,
      color,
      size: Math.random() * 4 + 2,
    });
  }
}

function update(dt) {
  if (state.mode !== "playing") return;

  const bounds = getBounds();
  const boosting = keys.has(" ") && state.boost > 1;
  const currentSpeed = state.speed + (boosting ? 180 : 0);
  state.grace = Math.max(0, state.grace - dt);
  state.speed += dt * 6.4;
  state.distance += currentSpeed * dt;
  state.score += dt * (22 + state.speed * 0.06 + (boosting ? 18 : 0));
  state.boost = Math.max(0, Math.min(100, state.boost + (boosting ? -32 : 18) * dt));

  const ax = (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0);
  const ay = (keys.has("arrowdown") || keys.has("s") ? 1 : 0) - (keys.has("arrowup") || keys.has("w") ? 1 : 0);

  if (pointer.active) {
    player.vx += (pointer.x - player.x) * 9 * dt;
    player.vy += (pointer.y - player.y) * 9 * dt;
  } else {
    player.vx += ax * 880 * dt;
    player.vy += ay * 880 * dt;
  }

  player.vx *= 0.88;
  player.vy *= 0.88;
  player.x = clamp(player.x + player.vx * dt, player.radius + 6, bounds.width - player.radius - 6);
  player.y = clamp(player.y + player.vy * dt, player.radius + 6, bounds.height - player.radius - 6);

  state.spawnTimer -= dt;
  state.starTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnHazard(bounds);
    state.spawnTimer = Math.max(0.34, 1.05 - state.speed / 760);
  }
  if (state.starTimer <= 0) {
    spawnStar(bounds);
    state.starTimer = Math.random() * 0.55 + 0.75;
  }

  state.lanes.forEach((star) => {
    star.x -= star.drift * dt;
    if (star.x < -8) {
      star.x = bounds.width + Math.random() * 60;
      star.y = Math.random() * bounds.height;
    }
  });

  state.hazards.forEach((hazard) => {
    hazard.x -= currentSpeed * dt;
    hazard.spin += dt * 2;
    hazard.y += Math.sin((state.distance + hazard.wobble) * 0.01) * 16 * dt;
  });
  state.stars.forEach((star) => {
    star.x -= (currentSpeed + 60) * dt;
    star.pulse += dt * 5;
  });
  state.particles.forEach((particle) => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.96;
    particle.vy *= 0.96;
    particle.life -= dt;
  });

  state.hazards = state.hazards.filter((hazard) => hazard.x > -hazard.radius - 20);
  state.particles = state.particles.filter((particle) => particle.life > 0);

  state.stars = state.stars.filter((star) => {
    if (distance(player, star) < player.radius + star.radius) {
      state.score += 250;
      state.boost = Math.min(100, state.boost + 16);
      burst(star.x, star.y, "#ffd166", 18);
      return false;
    }
    return star.x > -40;
  });

  const hit =
    state.grace <= 0 &&
    state.hazards.some((hazard) => distance(player, hazard) < player.radius + hazard.radius * 0.74);
  if (hit) {
    burst(player.x, player.y, "#ff6b6b", 28);
    state.shake = 16;
    state.best = Math.max(state.best, Math.floor(state.score));
    localStorage.setItem(storageKey, state.best);
    setMode("over");
  }

  state.shake = Math.max(0, state.shake - dt * 34);
  updateUi();
}

function draw() {
  const bounds = getBounds();
  ctx.clearRect(0, 0, bounds.width, bounds.height);
  ctx.save();

  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }

  const gradient = ctx.createLinearGradient(0, 0, bounds.width, bounds.height);
  gradient.addColorStop(0, "#071014");
  gradient.addColorStop(0.48, "#11262c");
  gradient.addColorStop(1, "#271d2e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, bounds.width, bounds.height);

  drawStars();
  drawSpeedLines(bounds);
  state.stars.forEach(drawCollectible);
  state.hazards.forEach(drawHazard);
  state.particles.forEach(drawParticle);
  drawPlayer();
  ctx.restore();

}

function drawStars() {
  state.lanes.forEach((star) => {
    ctx.fillStyle = `rgba(248, 251, 248, ${0.25 + star.size * 0.12})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawSpeedLines(bounds) {
  ctx.strokeStyle = "rgba(85, 221, 224, 0.12)";
  ctx.lineWidth = 1;
  for (let y = 24; y < bounds.height; y += 42) {
    const offset = (state.distance * 0.18 + y * 7) % bounds.width;
    ctx.beginPath();
    ctx.moveTo(bounds.width - offset, y);
    ctx.lineTo(bounds.width - offset - 84, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.vy * 0.002);
  ctx.fillStyle = "#55dde0";
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(-16, -16);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-16, 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f8fbf8";
  ctx.beginPath();
  ctx.arc(2, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 209, 102, 0.82)";
  ctx.beginPath();
  ctx.moveTo(-18, -8);
  ctx.lineTo(-36 - Math.random() * 12, 0);
  ctx.lineTo(-18, 8);
  ctx.closePath();
  ctx.fill();
  if (state.grace > 0) {
    ctx.strokeStyle = `rgba(122, 229, 130, ${0.3 + Math.sin(state.grace * 12) * 0.16})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHazard(hazard) {
  ctx.save();
  ctx.translate(hazard.x, hazard.y);
  ctx.rotate(hazard.spin);
  ctx.fillStyle = "#ff6b6b";
  ctx.strokeStyle = "rgba(248, 251, 248, 0.32)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI * 2 * i) / 10;
    const radius = i % 2 ? hazard.radius * 0.68 : hazard.radius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCollectible(star) {
  const glow = 1 + Math.sin(star.pulse) * 0.22;
  ctx.save();
  ctx.translate(star.x, star.y);
  ctx.scale(glow, glow);
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
    const radius = i % 2 ? star.radius * 0.44 : star.radius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawParticle(particle) {
  const alpha = Math.max(0, particle.life / particle.maxLife);
  ctx.fillStyle = hexToRgba(particle.color, alpha);
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
  ctx.fill();
}

function loop(time) {
  const dt = Math.min(0.033, (time - state.lastTime) / 1000 || 0);
  state.lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function hexToRgba(hex, alpha) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

window.addEventListener("resize", () => {
  resizeCanvas();
  resetGame();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
  }
  if (key === "p") pauseGame();
  if (key === "enter" && state.mode !== "playing") startGame();
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("pointerdown", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.active = true;
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  canvas.setPointerCapture(event.pointerId);
  if (state.mode !== "playing") startGame();
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointer.active) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
});

canvas.addEventListener("pointerup", () => {
  pointer.active = false;
});

startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", pauseGame);
restartButton.addEventListener("click", () => {
  resetGame();
  startGame();
});

resizeCanvas();
resetGame();
setMode("ready");
requestAnimationFrame(loop);
