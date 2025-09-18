const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 600;
canvas.height = 400;

// 플레이어 설정
let players = [
  {name: "You", x: 300, y: 350, state: "idle", currentThrowImg: null, throwAnim: null},
  {name: "P2", x: 150, y: 150, state: "idle", currentThrowImg: null, throwAnim: null},
  {name: "P3", x: 450, y: 150, state: "idle", currentThrowImg: null, throwAnim: null}
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
    setTimeout(startGame, 5000); // 최소 5초 로딩
  }
}

// 플레이어 이미지 로딩
for (let i = 0; i < 3; i++) {
  avatars[i] = {};
  playerStates.forEach(state => {
    let numImages = 1;
    if (state === "throw") numImages = 3;

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

// 공 이미지
let ballImg = loadImage('assets/ball.png', onImageLoad);

// 공 정보
let ball = {x: 300, y: 350, radius: 10, heldBy: 0};
let throws = 0;
const maxThrows = 30;

// 조건 설정
let condition = "inclusion"; // "exclusion" 가능

// NPC 제약 관리 변수
let npcChainCount = 0;
let lastNpcPair = null;

// 참여자가 던질 대상 선택
let userSelected = false;
let targetPlayer = null;

canvas.addEventListener('click', (e) => {
  if (players[0].state !== "idle") return; // 던지는 중엔 선택 불가
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

// 게임 시작
function startGame() {
  document.getElementById("loading-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");
  drawPlayers();
  drawBall();
  setTimeout(throwBall, 1000);
}

// 게임 종료
function endGame() {
  document.getElementById("game-screen").classList.add("hidden"); // 게임 화면 숨김

  // Game Over 표시
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

// 공 던지기
function throwBall() {
  if (throws >= maxThrows) {
    endGame();
    return;
  }

  let current = ball.heldBy;
  let target;

  if (current === 0) { 
    // 참가자가 공을 가지고 있으면 선택 대기
    if (!userSelected) {
      requestAnimationFrame(throwBall);
      return;
    }
    target = targetPlayer;
    userSelected = false;
    targetPlayer = null;
    npcChainCount = 0; // NPC 체인 초기화
    lastNpcPair = null;
  } else { 
    // NPC 자동 던지기
    if (condition === "inclusion") {
      if (throws === maxThrows - 1) {
        target = 0; // 마지막은 참가자
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
    } else {
      if (throws < 6) target = Math.random() < 0.2 ? 0 : (Math.random() < 0.5 ? 1 : 2);
      else target = Math.random() < 0.05 ? 0 : (Math.random() < 0.5 ? 1 : 2);
    }
  }

  animateThrow(current, target);
  ball.heldBy = target;
  throws++;
}

// 공 애니메이션
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

  // NPC라면 던지기 전 throw 애니메이션 반복
  if (from !== 0) {
    if (players[from].throwAnim) clearInterval(players[from].throwAnim);
    players[from].throwAnim = setInterval(() => {
      players[from].currentThrowImg = throwImgs[step];
      step = (step + 1) % steps;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawPlayers();
      drawBall();
    }, intervalTime);

    const randomDelay = Math.random() * 1200 + 800; // 800~2000ms
    setTimeout(() => {
      clearInterval(players[from].throwAnim);
      players[from].throwAnim = null;
      runThrowAnimation(from, to, throwImgs);
    }, randomDelay);

  } else {
    // 참가자는 즉시 한 번만 던짐
    runThrowAnimation(from, to, throwImgs);
  }
}

// 실제 던지는 동작
function runThrowAnimation(from, to, throwImgs) {
  let step = 0;
  const steps = throwImgs.length;
  const intervalTime = 200;

  const startX = players[from].x;
  const startY = players[from].y;
  const endX = players[to].x;
  const endY = players[to].y;

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
      setTimeout(() => { players[to].state = "idle"; }, 500);
      players[from].state = "idle";
      players[from].currentThrowImg = null;

      if (to !== 0) {
        // NPC는 랜덤 딜레이 후 던짐
        const randomDelay = Math.random() * 1200 + 800;
        setTimeout(throwBall, randomDelay);
      } else {
        setTimeout(throwBall, 500);
      }
    }
  }, intervalTime);
}

// 플레이어 그리기
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

// 공 그리기
function drawBall() {
  ctx.drawImage(ballImg, ball.x - ball.radius, ball.y - ball.radius, ball.radius*2, ball.radius*2);
}
