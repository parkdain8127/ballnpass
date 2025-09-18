// script.js - 수정본
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
const totalImages = 3 * playerStates.length + 1; // 3명 * 4상태 + 공

function loadImage(src, onLoadCallback) {
  const img = new Image();
  img.src = src;
  img.onload = onLoadCallback;
  return img;
}

function onImageLoad() {
  imagesLoaded++;
  if (imagesLoaded === totalImages) {
    setTimeout(startGame, 5000); // 로딩 후 5초 뒤 게임 시작
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

// 공 상태
let ball = {x: players[0].x, y: players[0].y, radius: 10, heldBy: 0};
let throws = 0;
const maxThrows = 30;

const inclusionThrows = [1, 2, 3, 4];
let npcConsecutiveNpcPasses = 0;

let userSelected = false;
let targetPlayer = null;

canvas.addEventListener('click', (e) => {
  if (players[0].state !== "idle") return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  for (let i = 1; i < players.length; i++) {
    const dx = players[i].x - mouseX;
    const dy = players[i].y - mouseY;
    if (Math.abs(dx) < 40 && Math.abs(dy) < 40) {
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
  Object.assign(gameOverDiv.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: "80px",
    fontWeight: "bold",
    textAlign: "center",
    color: "black",
    zIndex: "9999"
  });
  document.body.appendChild(gameOverDiv);
}

// NPC 던지기 전 throw 애니메이션 계속 반복
function startNpcThrowLoop(npcIndex) {
  const throwImgs = avatars[npcIndex]["throw"];
  if (!throwImgs) return null;

  players[npcIndex].state = "throw";
  let step = 0;
  const interval = setInterval(() => {
    players[npcIndex].currentThrowImg = throwImgs[step];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayers();
    drawBall();
    step = (step + 1) % throwImgs.length; // 반복
  }, 200);
  return interval;
}

function getThrowDuration(from, to) {
  if (from !== 0 && to !== 0) {
    if (from === 1 && to === 2) return 400;
    if (from === 2 && to === 1) return 700;
  }
  return 500;
}

function animateThrow(from, to, duration = 500, onComplete) {
  const throwImgs = avatars[from]["throw"];
  const steps = (throwImgs && throwImgs.length) ? throwImgs.length : 1;
  const intervalTime = Math.max(20, Math.floor(duration / steps));

  const startX = players[from].x;
  const startY = players[from].y;
  const endX = players[to].x;
  const endY = players[to].y;

  let step = 0;
  const interval = setInterval(() => {
    const progress = (step + 1) / steps;
    ball.x = startX + (endX - startX) * progress;
    ball.y = startY + (endY - startY) * progress;
    if (throwImgs && throwImgs[step]) players[from].currentThrowImg = throwImgs[step];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayers();
    drawBall();

    step++;
    if (step >= steps) {
      clearInterval(interval);
      players[to].state = "catch";
      setTimeout(() => { players[to].state = "idle"; }, 500);
      players[from].state = "idle";
      players[from].currentThrowImg = null;
      if (onComplete) onComplete();
    }
  }, intervalTime);
}

function throwBall() {
  if (throws >= maxThrows) {
    endGame();
    return;
  }
  const current = ball.heldBy;
  let target = null;

  if (current === 0) {
    if (!userSelected) {
      requestAnimationFrame(throwBall);
      return;
    }
    target = targetPlayer;
    userSelected = false;
    targetPlayer = null;

    animateThrow(current, target, getThrowDuration(current, target), () => {
      ball.heldBy = target;
      throws++;
      npcConsecutiveNpcPasses = (target !== 0) ? 1 : 0;
      setTimeout(throwBall, 500);
    });

  } else {
    const nextThrowIndex = throws + 1;
    const isInclusionEarly = inclusionThrows.includes(nextThrowIndex);
    const isFinalThrow = (throws === maxThrows - 1);

    if (isFinalThrow) {
      target = (current === 1) ? 2 : 1;
    } else if (isInclusionEarly) {
      target = 0;
    } else {
      if (npcConsecutiveNpcPasses >= 3) {
        target = 0;
      } else {
        target = (current === 1) ? 2 : 1;
      }
    }

    // 랜덤 대기시간 (1~3초)
    const thinkTime = 1000 + Math.random() * 2000;

    // 던지기 전 throw 애니메이션 반복
    const loop = startNpcThrowLoop(current);

    setTimeout(() => {
      clearInterval(loop); // 반복 중단
      animateThrow(current, target, getThrowDuration(current, target), () => {
        ball.heldBy = target;
        throws++;
        if (current !== 0 && target !== 0) {
          npcConsecutiveNpcPasses++;
        } else {
          npcConsecutiveNpcPasses = 0;
        }
        setTimeout(throwBall, 500);
      });
    }, thinkTime);
  }
}

function drawPlayers() {
  for (let i = 0; i < players.length; i++) {
    let img;
    if (players[i].state === "throw" && players[i].currentThrowImg) {
      img = players[i].currentThrowImg;
    } else {
      img = avatars[i][players[i].state];
    }
    if (img && img.complete) {
      ctx.drawImage(img, players[i].x - 40, players[i].y - 40, 80, 80);
    } else {
      ctx.fillStyle = i === 0 ? "#4A90E2" : (i === 1 ? "#7ED321" : "#F5A623");
      ctx.beginPath();
      ctx.arc(players[i].x, players[i].y, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillText(players[i].name, players[i].x, players[i].y + 6);
    }
    ctx.fillStyle = "black";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(players[i].name, players[i].x, players[i].y + 60);
  }
}

function drawBall() {
  if (ballImg && ballImg.complete) {
    ctx.drawImage(ballImg, ball.x - ball.radius, ball.y - ball.radius, ball.radius * 2, ball.radius * 2);
  } else {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
