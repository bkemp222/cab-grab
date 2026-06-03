const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

function fitCanvas() {
  const scale = Math.min(
    window.innerWidth / GAME_WIDTH,
    window.innerHeight / GAME_HEIGHT
  );

  canvas.style.width = `${GAME_WIDTH * scale}px`;
  canvas.style.height = `${GAME_HEIGHT * scale}px`;
}

window.addEventListener("resize", fitCanvas);
fitCanvas();

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function loadSound(src, loop = false, volume = 1) {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.volume = volume;
  return audio;
}

// Images
const images = {
  diveBar: loadImage("background/dive_bar_bg.png"),

  title: loadImage("title/title.png"),
  rules: loadImage("title/rules.png"),
  gameOver: loadImage("title/game_over.png"),

  pressStart: loadImage("buttons/press_start.png"),
  go: loadImage("buttons/go.png"),
  tryAgain: loadImage("buttons/try_again.png"),

  hesherIdle: loadImage("sprite/hesher/hesher_idle.png"),
  hesherJump: loadImage("sprite/hesher/hesher_jump.png"),
  hesherRun1: loadImage("sprite/hesher/hesher_run1.png"),
  hesherRun2: loadImage("sprite/hesher/hesher_run2.png"),
  hesherRun3: loadImage("sprite/hesher/hesher_run3.png"),

  groupieRun1: loadImage("sprite/groupie/groupie_run1.png"),
  groupieRun2: loadImage("sprite/groupie/groupie_run2.png"),

  hardshell: loadImage("sprite/items/hardshell.png"),
  nitro212: loadImage("sprite/items/nitro_212.png"),
  tiger212: loadImage("sprite/items/tiger_212.png"),
  tiger412: loadImage("sprite/items/tiger_412.png")
};

// Sounds
const sounds = {
  good: loadSound("sounds/good_collect.wav", false, 0.8),
  bad: loadSound("sounds/bad.mp3", false, 0.8),
  introMusic: loadSound("sounds/intro_music.mp3", true, 0.5),
  gameplayMusic: loadSound("sounds/gameplay_music.mp3", true, 0.45),
  gameoverMusic: loadSound("sounds/gameover_music.mp3", true, 0.55),
  groupieAlert: loadSound("sounds/groupie_alert.wav", false, 0.9),
  hit: loadSound("sounds/hit.wav", false, 0.9)
};

let screen = "title";
let usingTouch = false;
let touchJumpWasPressed = false;
let countdownValue = 3;
let countdownTimer = 0;
let score = 0;
let difficulty = 1;
let highScore = Number(localStorage.getItem("cabGrabHighScore")) || 0;
let gameOverReason = "";
let musicEnabled = true;

const keys = {
  left: false,
  right: false,
  jump: false
};

const player = {
  x: 115,
  y: 430,
  width: 100,
  height: 100,
  speed: 4,
  velocityY: 0,
  gravity: 0.7,
  jumpPower: -15,
  grounded: true,
  facing: 1,
  frame: 0,
  frameTimer: 0,
  state: "idle"
};

const groundY = 500;

const items = [];
const scorePopups = [];
const groupies = [];

let itemSpawnTimer = 0;
let itemSpawnDelay = 120;

let groupieTimer = 0;
let nextGroupieTime = randomBetween(700, 1200);

const buttons = {
  pressStart: { x: 85, y: 450, width: 190, height: 45 },
  go: { x: 110, y: 550, width: 140, height: 45 },
  tryAgain: { x: 80, y: 485, width: 200, height: 45 },
  music: { x: 300, y: 18, width: 42, height: 42 },

  left: { x: 10, y: 540, width: 90, height: 55 },
jump: { x: 135, y: 540, width: 90, height: 55 },
right: { x: 260, y: 540, width: 90, height: 55 }
  
};

const itemTable = [
  {
    name: "Tiger 2x12",
    sprite: images.tiger212,
    good: true,
    points: 250,
    width: 70,
    height: 70,
    speed: 2,
    weight: 38
  },
  {
    name: "Nitro 2x12",
    sprite: images.nitro212,
    good: true,
    points: 500,
    width: 75,
    height: 75,
    speed: 2,
    weight: 30
  },
  {
    name: "Tiger 4x12",
    sprite: images.tiger412,
    good: true,
    points: 1000,
    width: 88,
    height: 88,
    speed: 2,
    weight: 18
  },
  {
    name: "Hardshell",
    sprite: images.hardshell,
    good: false,
    points: 0,
    width: 88,
    height: 88,
    speed: 3,
    weight: 24
  }
];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch(() => { });
}

function stopSound(sound) {
  sound.pause();
  sound.currentTime = 0;
}

function startIntroMusic() {
  if (!musicEnabled) return;
  stopSound(sounds.gameplayMusic);
  stopSound(sounds.gameoverMusic);
  sounds.introMusic.play().catch(() => { });
}

function stopIntroMusic() {
  stopSound(sounds.introMusic);
}

function startGameplayMusic() {
  if (!musicEnabled) return;
  stopSound(sounds.gameoverMusic);
  sounds.gameplayMusic.play().catch(() => { });
}

function startGameOverMusic() {
  if (!musicEnabled) return;
  stopSound(sounds.gameplayMusic);
  sounds.gameoverMusic.play().catch(() => { });
}

function resetGameplay() {
  score = 0;
  gameOverReason = "";

  player.x = 115;
  player.y = groundY - player.height;
  player.velocityY = 0;
  player.grounded = true;
  player.facing = 1;
  player.frame = 0;
  player.frameTimer = 0;
  player.state = "idle";

  items.length = 0;
  scorePopups.length = 0;
  groupies.length = 0;

  itemSpawnTimer = 0;
  groupieTimer = 0;
nextGroupieTime = randomBetween(250, 500);

  screen = "game";
  stopSound(sounds.gameoverMusic);
  stopIntroMusic();
  startGameplayMusic();
}

function updateCountdown() {

  countdownTimer--;

  if (countdownTimer <= 0) {

    if (countdownValue === "GRAB!") {
      resetGameplay();
      return;
    }

    if (countdownValue === 1) {
      countdownValue = "GRAB!";
    } else {
      countdownValue--;
    }

    countdownTimer = 90;
  }
}
function updateDifficulty() {
  difficulty = 1 + Math.floor(score / 3000);
  itemSpawnDelay = Math.max(55, 140 - difficulty * 8);
}

function drawControlButton(label, button) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(button.x, button.y, button.width, button.height);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(button.x, button.y, button.width, button.height);

  ctx.fillStyle = "white";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    label,
    button.x + button.width / 2,
    button.y + 35
  );

  ctx.textAlign = "left";
}

function drawMobileControls() {
  drawControlButton("LEFT", buttons.left);
  drawControlButton("JUMP", buttons.jump);
  drawControlButton("RIGHT", buttons.right);
}

function chooseItem() {
  const totalWeight = itemTable.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const item of itemTable) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }

  return itemTable[0];
}

function spawnItem() {
  const item = chooseItem();

  items.push({
    x: Math.random() * (GAME_WIDTH - item.width),
    y: -item.height,

    ...item,

    speed: item.speed + (difficulty * 0.25)
  });
}

function spawnGroupie() {
  const fromLeft = Math.random() > 0.5;
  const width = 120;
  const height = 100;

  groupies.push({
    x: fromLeft ? -width : GAME_WIDTH,
    y: groundY - height + 8,
    width,
    height,
    speed: fromLeft ? 1 : -1,
    facing: fromLeft ? 1 : -1,
    frame: 0,
    frameTimer: 0
  });

  playSound(sounds.groupieAlert);
}

function getHitbox(obj, paddingX = 20, paddingY = 20) {
  return {
    x: obj.x + paddingX,
    y: obj.y + paddingY,
    width: obj.width - paddingX * 2,
    height: obj.height - paddingY * 2
  };
}

function rectsOverlap(a, b, aPadX = 15, aPadY = 15, bPadX = 35, bPadY = 25) {
  const boxA = getHitbox(a, aPadX, aPadY);
  const boxB = getHitbox(b, bPadX, bPadY);

  return (
    boxA.x < boxB.x + boxB.width &&
    boxA.x + boxA.width > boxB.x &&
    boxA.y < boxB.y + boxB.height &&
    boxA.y + boxA.height > boxB.y
  );
}

function triggerGameOver(reason) {
  gameOverReason = reason;
  screen = "gameover";

  stopSound(sounds.gameplayMusic);
  playSound(sounds.hit);
  startGameOverMusic();

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("cabGrabHighScore", highScore);
  }
}

function updatePlayer() {
  let moving = false;

  if (keys.left) {
    player.x -= player.speed;
    player.facing = -1;
    moving = true;
  }

  if (keys.right) {
    player.x += player.speed;
    player.facing = 1;
    moving = true;
  }

  if (keys.jump && player.grounded) {
    player.velocityY = player.jumpPower;
    player.grounded = false;
  }

  keys.jump = false;

  player.velocityY += player.gravity;
  player.y += player.velocityY;

  if (player.y >= groundY - player.height) {
    player.y = groundY - player.height;
    player.velocityY = 0;
    player.grounded = true;
  }

  player.x = Math.max(0, Math.min(GAME_WIDTH - player.width, player.x));

  if (!player.grounded) {
    player.state = "jump";
  } else if (moving) {
    player.state = "run";
  } else {
    player.state = "idle";
  }

  if (player.state === "run") {
    player.frameTimer++;

    if (player.frameTimer > 7) {
      player.frame = (player.frame + 1) % 4;
      player.frameTimer = 0;
    }
  } else {
    player.frame = 0;
    player.frameTimer = 0;
  }
}

function updateItems() {
  itemSpawnTimer++;

  if (itemSpawnTimer >= itemSpawnDelay) {
    spawnItem();
    itemSpawnTimer = 0;
  }

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    item.y += item.speed;

    if (rectsOverlap(item, player, 14, 14, 38, 32)) {
      if (item.good) {
        score += item.points;
        playSound(sounds.good);

        scorePopups.push({
          x: item.x + item.width / 2,
          y: item.y,
          text: `+${item.points}`,
          life: 45
        });

        items.splice(i, 1);
      } else {
        playSound(sounds.bad);
        triggerGameOver("CRUSHED BY THE MUNDANE");
        return;
      }
    }

    if (item.y > GAME_HEIGHT + 100) {
      items.splice(i, 1);
    }
  }
}

function updateGroupies() {
  groupieTimer++;

  if (groupieTimer >= nextGroupieTime) {
    spawnGroupie();
    groupieTimer = 0;
    nextGroupieTime = randomBetween(
      Math.max(140, 520 - difficulty * 30),
      Math.max(260, 900 - difficulty * 45)
    );
  }

  for (let i = groupies.length - 1; i >= 0; i--) {
    const groupie = groupies[i];

    groupie.x += groupie.speed;

    groupie.frameTimer++;
    if (groupie.frameTimer > 8) {
      groupie.frame = (groupie.frame + 1) % 2;
      groupie.frameTimer = 0;
    }

    if (rectsOverlap(groupie, player, 30, 22, 38, 32)) {
      triggerGameOver("NOW YOU HAVE TO BRING HER\nBACK TO HER CAR IN THE MORNING");
      return;
    }

    if (groupie.x < -groupie.width - 40 || groupie.x > GAME_WIDTH + 40) {
      groupies.splice(i, 1);
    }
  }
}

function updateScorePopups() {
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    const popup = scorePopups[i];

    popup.y -= 1.2;
    popup.life--;

    if (popup.life <= 0) {
      scorePopups.splice(i, 1);
    }
  }
}

function updateGame() {

  if (screen === "countdown") {
    updateCountdown();
    return;
  }

  if (screen !== "game") return;

  updateDifficulty();

  updatePlayer();
  updateItems();
  updateGroupies();
  updateScorePopups();
}

function drawCountdown() {

    ctx.drawImage(images.diveBar, 0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = "rgba(0,0,0,.5)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.textAlign = "center";

    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 6;

    ctx.font = "bold 100px Arial";

    let text = countdownValue;
if (countdownValue === "GRAB!") {
    ctx.font = "bold 72px Arial";
    ctx.fillStyle = "#ff4f58";
}
    ctx.strokeText(text, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    ctx.fillText(text, GAME_WIDTH / 2, GAME_HEIGHT / 2);

    ctx.textAlign = "left";
}
function getPlayerSprite() {
  if (player.state === "jump") return images.hesherJump;
  if (player.state === "idle") return images.hesherIdle;

  const runCycle = [
    images.hesherRun1,
    images.hesherRun2,
    images.hesherRun3,
    images.hesherRun2
  ];

  return runCycle[player.frame];
}

function drawImageFlipped(img, x, y, width, height, facing) {
  ctx.save();

  if (facing === -1) {
    ctx.scale(-1, 1);
    ctx.drawImage(img, -x - width, y, width, height);
  } else {
    ctx.drawImage(img, x, y, width, height);
  }

  ctx.restore();
}

function drawPlayer() {
  drawImageFlipped(
    getPlayerSprite(),
    player.x,
    player.y,
    player.width,
    player.height,
    player.facing
  );
}

function drawItems() {
  for (const item of items) {
    ctx.drawImage(item.sprite, item.x, item.y, item.width, item.height);
  }
}

function drawGroupies() {
  for (const groupie of groupies) {
    const sprite = groupie.frame === 0 ? images.groupieRun1 : images.groupieRun2;

    drawImageFlipped(
      sprite,
      groupie.x,
      groupie.y,
      groupie.width,
      groupie.height,
      groupie.facing
    );
  }
}

function drawScorePopups() {
  ctx.textAlign = "center";
  ctx.font = "bold 22px Arial";
  ctx.fillStyle = "#ffd34d";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 4;

  for (const popup of scorePopups) {
    ctx.strokeText(popup.text, popup.x, popup.y);
    ctx.fillText(popup.text, popup.x, popup.y);
  }

  ctx.textAlign = "left";
}

function drawHud() {
  ctx.fillStyle = "white";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 4;
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "left";

  ctx.strokeText(`Score: ${score}`, 16, 32);
  ctx.fillText(`Score: ${score}`, 16, 32);

  ctx.font = "bold 15px Arial";
  ctx.strokeText(`High: ${highScore}`, 16, 55);
  ctx.fillText(`High: ${highScore}`, 16, 55);

  drawMusicButton();
}

function drawMusicButton() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(buttons.music.x, buttons.music.y, buttons.music.width, buttons.music.height);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(buttons.music.x, buttons.music.y, buttons.music.width, buttons.music.height);

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    musicEnabled ? "♫" : "×",
    buttons.music.x + buttons.music.width / 2,
    buttons.music.y + 28
  );

  ctx.textAlign = "left";
}

function drawButton(img, button) {
  ctx.drawImage(img, button.x, button.y, button.width, button.height);
}

function drawTitle() {
  ctx.drawImage(images.title, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  drawButton(images.pressStart, buttons.pressStart);

  ctx.fillStyle = "white";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`HIGH SCORE: ${highScore}`, GAME_WIDTH / 2, 440);
  ctx.textAlign = "left";

  drawMusicButton();
}

function drawRules() {
  ctx.drawImage(images.rules, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  drawButton(images.go, buttons.go);
  drawMusicButton();
}

function drawGameplay() {
  ctx.drawImage(images.diveBar, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  drawItems();
  drawGroupies();
  drawPlayer();
  drawScorePopups();
  drawHud();
  drawMobileControls();
}

function drawGameOver() {
  ctx.drawImage(images.gameOver, 0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = "white";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 5;
  ctx.textAlign = "center";



  ctx.font = "bold 20px Arial";
  ctx.strokeText(`FINAL SCORE: ${score}`, GAME_WIDTH / 2, 50);
  ctx.fillText(`FINAL SCORE: ${score}`, GAME_WIDTH / 2, 50);

  ctx.strokeText(`HIGH SCORE: ${highScore}`, GAME_WIDTH / 2, 70);
  ctx.fillText(`HIGH SCORE: ${highScore}`, GAME_WIDTH / 2, 70);

  ctx.font = "bold 13px Arial";
const lines = gameOverReason.split("\n");

lines.forEach((line, index) => {
  const y = 400 + (index * 22);

  ctx.strokeText(line, GAME_WIDTH / 2, y);
  ctx.fillText(line, GAME_WIDTH / 2, y);
});

  drawButton(images.tryAgain, buttons.tryAgain);

  ctx.textAlign = "left";
  drawMusicButton();
}

function draw() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  if (screen === "title") drawTitle();
  if (screen === "rules") drawRules();
  if (screen === "countdown") drawCountdown();
  if (screen === "game") drawGameplay();
  if (screen === "gameover") drawGameOver();
}

function gameLoop() {
  updateGame();
  draw();
  requestAnimationFrame(gameLoop);
}

function isInsideButton(x, y, button) {
  return (
    x >= button.x &&
    x <= button.x + button.width &&
    y >= button.y &&
    y <= button.y + button.height
  );
}

function getCanvasPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: ((clientX - rect.left) / rect.width) * GAME_WIDTH,
    y: ((clientY - rect.top) / rect.height) * GAME_HEIGHT
  };
}

function handlePress(x, y) {
  if (isInsideButton(x, y, buttons.music)) {
    musicEnabled = !musicEnabled;

    if (!musicEnabled) {
      stopSound(sounds.introMusic);
      stopSound(sounds.gameplayMusic);
      stopSound(sounds.gameoverMusic);
    } else {
      if (screen === "title" || screen === "rules") startIntroMusic();
      if (screen === "game") startGameplayMusic();
      if (screen === "gameover") startGameOverMusic();
    }

    return;
  }

  if (screen === "title" && isInsideButton(x, y, buttons.pressStart)) {
    screen = "rules";
    startIntroMusic();
    return;
  }

  if (screen === "rules" && isInsideButton(x, y, buttons.go)) {

    screen = "countdown";

countdownValue = 3;
countdownTimer = 90;
screen = "countdown";
    return;
  }

  if (screen === "gameover" && isInsideButton(x, y, buttons.tryAgain)) {
    resetGameplay();
    return;
  }

if (screen === "game") {
if (isInsideButton(x, y, buttons.left)) {
    keys.left = true;
}

if (isInsideButton(x, y, buttons.right)) {
    keys.right = true;
}

if (isInsideButton(x, y, buttons.jump)) {
    keys.jump = true;
}
}
}

const activePointers = new Map();

function updatePointerControls() {
  keys.left = false;
  keys.right = false;

  for (const point of activePointers.values()) {
    if (isInsideButton(point.x, point.y, buttons.left)) {
      keys.left = true;
    }

    if (isInsideButton(point.x, point.y, buttons.right)) {
      keys.right = true;
    }
  }
}

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();

  const point = getCanvasPoint(e.clientX, e.clientY);

  if (screen !== "game") {
    handlePress(point.x, point.y);
    return;
  }

  activePointers.set(e.pointerId, point);

  if (isInsideButton(point.x, point.y, buttons.jump)) {
    keys.jump = true;
  }

  updatePointerControls();
});

canvas.addEventListener("pointermove", (e) => {
  e.preventDefault();

  if (screen !== "game") return;

  if (activePointers.has(e.pointerId)) {
    const point = getCanvasPoint(e.clientX, e.clientY);
    activePointers.set(e.pointerId, point);
    updatePointerControls();
  }
});

canvas.addEventListener("pointerup", (e) => {
  e.preventDefault();

  activePointers.delete(e.pointerId);
  updatePointerControls();
});

canvas.addEventListener("pointercancel", (e) => {
  e.preventDefault();

  activePointers.delete(e.pointerId);
  updatePointerControls();
});
// Keyboard controls
window.addEventListener("keydown", (e) => {
  if (screen === "title" && e.key === "Enter") {
    screen = "rules";
    return;
  }

  if (screen === "rules" && e.key === "Enter") {
    resetGameplay();
    return;
  }

  if (screen === "gameover" && e.key === "Enter") {
    resetGameplay();
    return;
  }

  if (screen !== "game") return;

  if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = true;

  if (e.key === " " || e.key === "ArrowUp" || e.key === "w") {
    keys.jump = true;
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
});

gameLoop();