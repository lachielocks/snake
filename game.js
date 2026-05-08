const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best-score");
const statusEl = document.getElementById("status");

const newGameBtn = document.getElementById("new-game-btn");
const pauseBtn = document.getElementById("pause-btn");
const touchButtons = document.querySelectorAll(".touch-btn");
const dropdowns = document.querySelectorAll(".dropdown");

const GRID_SIZE = 20;
const TILE_SIZE = canvas.width / GRID_SIZE;
const BEST_KEY = "snake_best_score";

const DIR = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const THEME = {
  boardA: "#16221a",
  boardB: "#1a2820",
  snakeHead: "#67d262",
  snakeBody: "#85de81",
  food: "#e5483f",
  obstacle: "#708676",
};

let snake = [];
let dir = DIR.right;
let queuedDir = DIR.right;
let food = null;
let obstacles = [];
let score = 0;
let bestScore = Number(localStorage.getItem(BEST_KEY) || 0);
let gameOver = false;
let started = false;
let paused = false;
let lastTick = 0;
let prevSnake = [];
let selectedSpeed = 200;
let selectedLayout = "classic";
let foodSpawnedAt = 0;

function randomCell() {
  return {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  };
}

function sameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

function cellBlocked(cell) {
  return (
    snake.some((part) => sameCell(part, cell)) ||
    obstacles.some((o) => sameCell(o, cell))
  );
}

function animateStat(id) {
  const card = id.parentElement;
  card.classList.remove("pop");
  requestAnimationFrame(() => card.classList.add("pop"));
}

function updateScoreDisplay(value) {
  scoreEl.textContent = String(value);
  animateStat(scoreEl);
}

function updateBestDisplay(value) {
  bestEl.textContent = String(value);
  animateStat(bestEl);
}

function setStatus(text) {
  statusEl.textContent = text;
  statusEl.classList.remove("flash");
  requestAnimationFrame(() => statusEl.classList.add("flash"));
}

function spawnFood(spawnTime = performance.now()) {
  let candidate = randomCell();
  let attempts = 0;
  while (cellBlocked(candidate) && attempts < 300) {
    candidate = randomCell();
    attempts += 1;
  }
  food = candidate;
  foodSpawnedAt = spawnTime;
}

function spawnObstacles(count = 8) {
  obstacles = [];
  if (selectedLayout !== "walls") {
    return;
  }
  let attempts = 0;
  while (obstacles.length < count && attempts < 1000) {
    const spot = randomCell();
    const nearSpawn = spot.x < 6 && spot.y < 6;
    if (!nearSpawn && !obstacles.some((o) => sameCell(o, spot))) {
      obstacles.push(spot);
    }
    attempts += 1;
  }
}

function resetGame() {
  snake = [
    { x: 4, y: 10 },
    { x: 3, y: 10 },
    { x: 2, y: 10 },
  ];
  prevSnake = snake.map((part) => ({ ...part }));
  dir = DIR.right;
  queuedDir = DIR.right;
  score = 0;
  gameOver = false;
  started = false;
  paused = false;
  updateScoreDisplay(0);
  bestEl.textContent = String(bestScore);
  pauseBtn.textContent = "Pause";
  setStatus("Press any movement key to begin.");
  spawnObstacles();
  spawnFood(performance.now());
}

function setDirection(next) {
  const opposite =
    dir.x + next.x === 0 && dir.y + next.y === 0 && snake.length > 1;
  if (!opposite) {
    queuedDir = next;
  }
}

function update() {
  if (!started || paused || gameOver) {
    return;
  }

  dir = queuedDir;
  prevSnake = snake.map((part) => ({ ...part }));
  const head = snake[0];
  const nextHead = { x: head.x + dir.x, y: head.y + dir.y };

  if (
    nextHead.x < 0 ||
    nextHead.x >= GRID_SIZE ||
    nextHead.y < 0 ||
    nextHead.y >= GRID_SIZE
  ) {
    endGame("You hit the wall.");
    return;
  }

  if (
    snake.some((part) => sameCell(part, nextHead)) ||
    obstacles.some((o) => sameCell(o, nextHead))
  ) {
    endGame("You crashed.");
    return;
  }

  snake.unshift(nextHead);
  if (sameCell(nextHead, food)) {
    score += 10;
    updateScoreDisplay(score);
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(BEST_KEY, String(bestScore));
      updateBestDisplay(bestScore);
    }
    spawnFood(performance.now());
  } else {
    snake.pop();
  }
}

function endGame(message) {
  gameOver = true;
  setStatus(`${message} Press R or Restart.`);
}

function drawRoundedRect(x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.fill();
}

function renderBoard() {
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? THEME.boardA : THEME.boardB;
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}

function renderSnake(progress) {
  const points = snake.map((part, idx) => {
    const prev = prevSnake[idx] || part;
    return {
      x: (prev.x + (part.x - prev.x) * progress) * TILE_SIZE + TILE_SIZE / 2,
      y: (prev.y + (part.y - prev.y) * progress) * TILE_SIZE + TILE_SIZE / 2,
    };
  });

  if (points.length === 0) {
    return;
  }

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = TILE_SIZE * 0.66;
  ctx.strokeStyle = THEME.snakeBody;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  const head = points[0];
  ctx.fillStyle = THEME.snakeHead;
  ctx.beginPath();
  ctx.arc(head.x, head.y, TILE_SIZE * 0.33, 0, Math.PI * 2);
  ctx.fill();

  const eyeOffsetX = TILE_SIZE * 0.1;
  const eyeOffsetY = TILE_SIZE * 0.08;
  const eyeRadius = TILE_SIZE * 0.045;
  ctx.fillStyle = "#0b0f0c";
  ctx.beginPath();
  ctx.arc(head.x - eyeOffsetX, head.y - eyeOffsetY, eyeRadius, 0, Math.PI * 2);
  ctx.arc(head.x + eyeOffsetX, head.y - eyeOffsetY, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
}

function renderFood(time) {
  const spawnProgress = Math.min(1, (time - foodSpawnedAt) / 120);
  const pop = 0.65 + 0.35 * (1 - Math.pow(1 - spawnProgress, 3));
  const pulse = 1 + Math.sin(time / 170) * 0.05;
  const centerX = food.x * TILE_SIZE + TILE_SIZE / 2;
  const centerY = food.y * TILE_SIZE + TILE_SIZE / 2;
  const radius = TILE_SIZE * 0.25 * pulse * pop;

  ctx.shadowBlur = 0;
  ctx.fillStyle = THEME.food;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff9a93";
  ctx.beginPath();
  ctx.arc(centerX - radius * 0.35, centerY - radius * 0.35, radius * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

function renderObstacles() {
  for (const o of obstacles) {
    const p = 5;
    drawRoundedRect(
      o.x * TILE_SIZE + p,
      o.y * TILE_SIZE + p,
      TILE_SIZE - p * 2,
      TILE_SIZE - p * 2,
      4,
      THEME.obstacle
    );
  }
}

function renderOverlay() {
  if (!started || paused || gameOver) {
    ctx.fillStyle = "#06070dac";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#eceff8";
    ctx.textAlign = "center";
    ctx.font = "600 30px Inter, sans-serif";
    const title = gameOver ? "Game Over" : paused ? "Paused" : "Snake";
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 16);

    ctx.font = "500 16px Inter, sans-serif";
    const subtitle = gameOver
      ? "Press R to restart"
      : paused
        ? "Press Space to continue"
        : "Move to start";
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 16);
  }
}

function render(time) {
  const tickMs = selectedSpeed;
  const progress = Math.min(1, (time - lastTick) / tickMs);
  renderBoard();
  renderObstacles();
  renderFood(time);
  renderSnake(progress);
  renderOverlay();
}

function gameLoop(time) {
  if (time - lastTick >= selectedSpeed) {
    update();
    lastTick = time;
  }
  render(time);
  requestAnimationFrame(gameLoop);
}

function beginIfNeeded() {
  if (!started && !gameOver) {
    started = true;
    setStatus("Eat, grow, and survive.");
  }
}

function onDirection(name) {
  const next = DIR[name];
  if (!next || gameOver) {
    return;
  }
  beginIfNeeded();
  setDirection(next);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
    event.preventDefault();
  }

  if (key === "arrowup" || key === "w") onDirection("up");
  if (key === "arrowdown" || key === "s") onDirection("down");
  if (key === "arrowleft" || key === "a") onDirection("left");
  if (key === "arrowright" || key === "d") onDirection("right");

  if (key === "r") {
    resetGame();
    return;
  }

  if (key === " ") {
    if (!started || gameOver) return;
    paused = !paused;
    pauseBtn.textContent = paused ? "Resume" : "Pause";
    setStatus(paused ? "Paused." : "Eat, grow, and survive.");
  }
});

newGameBtn.addEventListener("click", () => {
  resetGame();
});

pauseBtn.addEventListener("click", () => {
  if (!started || gameOver) return;
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
  setStatus(paused ? "Paused." : "Eat, grow, and survive.");
});

function bindDropdown(dropdown, onChange) {
  const trigger = dropdown.querySelector("[data-trigger]");
  const menu = dropdown.querySelector("[data-menu]");
  const buttons = menu.querySelectorAll("button[data-value]");

  trigger.addEventListener("click", () => {
    dropdowns.forEach((item) => {
      if (item !== dropdown) item.classList.remove("open");
    });
    dropdown.classList.toggle("open");
  });

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.value;
      trigger.textContent = button.textContent;
      dropdown.classList.remove("open");
      onChange(value, button.textContent);
    });
  });
}

dropdowns.forEach((dropdown) => {
  const kind = dropdown.dataset.dropdown;
  if (kind === "speed") {
    bindDropdown(dropdown, (value) => {
      selectedSpeed = Number(value);
      setStatus("Speed updated.");
    });
  }
  if (kind === "layout") {
    bindDropdown(dropdown, (value, label) => {
      selectedLayout = value;
      resetGame();
      setStatus(`${label} layout enabled.`);
    });
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".dropdown")) {
    dropdowns.forEach((dropdown) => dropdown.classList.remove("open"));
  }
});

touchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const dirName = button.dataset.dir;
    if (dirName) onDirection(dirName);
  });
});

resetGame();
requestAnimationFrame(gameLoop);
