const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 600;
canvas.height = 400;

// 플레이어 설정
let players = [
  {name: "You", x: 300, y: 350, state: "idle", currentThrowImg: null},
  {name: "P2", x: 150, y: 150, state: "idle", currentThrowImg: null},
  {name: "P3", x: 450, y: 150, state: "idle", currentThrowImg: null}
];

const playerStates = ['idle', 'active', 'throw', 'catch'];
let avatars = [];

// 이미지 로딩
let imagesLoaded = 0;
const totalImages = 3 * playerStates.length + 1;

function loadImage(src, onLoadCallback) {
  const img = new Image();
  img.src = src;
  img.onload = onLoadCallback;
  return img;
}

function onImageLoad() {
  imagesLoaded++;
  if (imagesLoaded === totalImages) {
    setTimeout(startGame, 5000);
  }
}

for (let i = 0; i < 3; i++) {
  avatars[i] = {};
  playerStates.forEach(state => {
    let numImages = (state === "throw") ? 3 : 1;
    if (numImages === 1) {
      avatars[i][state] = loadImage(`assets/player/${state}/1.png`, onImageLoad);
    } else {
      avatars[i][state] = [];
      for (let j = 1; j <= numImages; j++) {
        avatars[i][state].push(loadImage(`assets/player/${state}/${j}.png`, onImageLoad));
      }
    }
  });
}

let ballImg = loadImage('assets/ball.png', onImageLoad);

let ball = {x: 300, y: 350, radius: 10, heldBy: 0};
let throws = 0;
const maxThrows = 30;

let condition = "exclusion"; // "inclusion" / "exclusion"
let npcChainCount = 0;
let lastNpcPair = null;

let userSelected = false;
let targetPlayer = null;

canvas.addEventListener('click', (e) => {
  if (players[0].state !== "idle") return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  for (let i = 1; i < players.length; i++) {
    if (Math.abs(players[i].x - mouseX) < 40 && Math.abs(players[i].y - mouseY) < 40) {
      targetPlayer = i;
      userSelected = true;
      break;
    }
  }
});

function startGame() {
  document.getElementById("loading-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");
  drawPlayers();
  drawBall();
  setTimeout(throwBall, 1000);
}

function endGame() {
  document.getElementById("game-screen").classList.add("hidden");
  const gameOverDiv = document.createElement("div");
  gameOverDiv.innerText = "Game Over";
  gameOverDiv.style.position = "fixed";
  gameOverDiv.style.top = "50%";
  gameOverDiv.style.left = "50%";
  gameOverDiv.style.transform = "translate(-50%, -50%)";
  gameOverDiv.style.fontSize = "80px";
  gameOverDiv.style.fontWeight = "bold";
  gameOverDiv.style.textAlign = "center";
  gameOverDiv.style.color = "black";
  gameOverDiv.style.zIndex = "9999";
  document.body.appendChild(gameOverDiv);
}

function throwBall() {
  if (throws >= maxThrows) {
    endGame();
    return;
  }

  let current = ball.heldBy;
  let target;

  if (current === 0) {
    if (!userSelected) {
      requestAnimationFrame(throwBall);
      return;
    }
    target = targetPlayer;
    userSelected = false;
    targetPlayer = null;
    npcChainCount = 0;
    lastNpcPair = null;
  } else {
    if (condition === "inclusion") {
      if (throws === maxThrows - 1) {
        target = 0;
      } else {
        do {
          target = Math.random() < 0.4 ? 0 : (Math.random() < 0.5 ? 1 : 2);
          if (target === 0) {
            npcChainCount = 0;
            lastNpcPair = null;
            break;
          } else {
            const newPair = [current, target].sort().join("-");
            if (newPair === lastNpcPair) {
              npcChainCount++;
            } else {
              npcChainCount = 1;
              lastNpcPair = newPair;
            }
          }
        } while (npcChainCount > 3);
      }
    } else if (condition === "exclusion") {
      if (throws < 8) {
        target = 0; // 처음 8번은 참여자가 무조건 받음
      } else {
        target = (Math.random() < 0.5 ? 1 : 2); // 그 이후는 NPC끼리만
      }

      setTimeout(() => {
        animateThrow(current, target);
        ball.heldBy = target;
        throws++;
      }, 500); // 고정 지연
      return;
    }
  }

  animateThrow(current, target);
  ball.heldBy = target;
  throws++;
}

function animateThrow(from, to) {
  const throwImgs = avatars[from]["throw"];
  let step = 0;
  const steps = throwImgs.length;
  const intervalTime = 200;

  const startX = players[from].x;
  const startY = players[from].y;
  const endX = players[to].x;
  const endY = players[to].y;

  players[from].state = "throw";

  const interval = setInterval(() => {
    const progress = (step + 1)/steps;
    ball.x = startX + (endX - startX) * progress;
    ball.y = startY + (endY - startY) * progress;

    players[from].currentThrowImg = throwImgs[step];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayers();
    drawBall();

    step++;
    if (step >= steps) {
      clearInterval(interval);
      players[to].state = "catch";
      setTimeout(() => { players[to].state = "idle"; }, 1000);
      players[from].state = "idle";
      players[from].currentThrowImg = null;
      setTimeout(throwBall, 500);
    }
  }, intervalTime);
}

function drawPlayers() {
  for (let i = 0; i < players.length; i++) {
    let img;
    if (players[i].state === "throw" && players[i].currentThrowImg) {
      img = players[i].currentThrowImg;
    } else {
      img = avatars[i][players[i].state];
    }
    ctx.drawImage(img, players[i].x - 40, players[i].y - 40, 80, 80);
    ctx.fillStyle = "black";
    ctx.font = "16px Arial";
    ctx.fillText(players[i].name, players[i].x - 20, players[i].y + 60);
  }
}

function drawBall() {
  ctx.drawImage(ballImg, ball.x - ball.radius, ball.y - ball.radius, ball.radius*2, ball.radius*2);
}
