const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 600;
canvas.height = 400;

// --- 변경 가능한 파라미터 ---
const catchDuration = 1000;   // catch 애니메이션 지속시간 (ms)
const participantDelay = 500; // 참가자가 공을 받을 때 고정 대기 (ms)
const npcMinDelay = 800;      // NPC가 던지기 전 최소 고민 시간 (ms)
const npcMaxDelay = 2000;     // NPC가 던지기 전 최대 고민 시간 (ms)
// -----------------------------

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
let condition = "exclusion"

// 참여자가 던질 대상 선택
let userSelected = false;
let targetPlayer = null;

canvas.addEventListener('click', (e) => {
  // 참가자가 공을 가지고 있고 idle 상태일 때만 선택 허용
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

  if (current === 0) { // 참여자가 공을 가지고 있으면 선택 대기
    if (!userSelected) {
      // 참가자가 선택할 때까지 계속 체크
      requestAnimationFrame(throwBall);
      return;
    }
    target = targetPlayer;
    userSelected = false;
    targetPlayer = null;
  } else { // NPC 자동 던지기
    if (condition === "exclusion") {
      // 반드시 참가자가 받는 throw 번호 지정
      const mustGoToUser = [1, 3, 5, 8, 11, 14];
      if (mustGoToUser.includes(throws + 1)) {
        target = 0; // 참가자에게
      } else {
        // 나머지는 참가자 제외 → P2 ↔ P3만
        target = current === 1 ? 2 : 1;
      }
    }
  }

  // animate 진행
  animateThrow(current, target);
  // 공 소유자 정보는 바로 갱신 (animate 내에서 참조 가능하도록)
  ball.heldBy = target;
  throws++;
}

// 공 애니메이션 (throw 상태 이미지 순차 표시, 각 200ms)
function animateThrow(from, to) {
  const throwImgs = avatars[from]["throw"]; // 3개 이미지 배열
  let step = 0;
  const steps = throwImgs.length;
  const intervalTime = 200; // 각 이미지 표시 시간(ms)

  const startX = players[from].x;
  const startY = players[from].y;
  const endX = players[to].x;
  const endY = players[to].y;

  players[from].state = "throw";

  const interval = setInterval(() => {
    // 공 위치 진행
    const progress = (step + 1)/steps;
    ball.x = startX + (endX - startX) * progress;
    ball.y = startY + (endY - startY) * progress;

    // 현재 throw 이미지
    players[from].currentThrowImg = throwImgs[step];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayers();
    drawBall();

    step++;
    if (step >= steps) {
      clearInterval(interval);

      // 수신자 상태를 catch로 변경
      players[to].state = "catch";

      // 던진 사람 초기화
      players[from].state = "idle";
      players[from].currentThrowImg = null;

      // --- 핵심: catchDuration 이후에 idle로 바꾸고, 그 시점에서 생각시간을 적용 ---
      setTimeout(() => {
        // catch가 끝나고 idle로 변경
        players[to].state = "idle";

        if (to === 0) {
          // 참가자가 받음: 참가자가 선택하도록 기다리는 루프를 participantDelay 후 시작
          setTimeout(() => {
            // 참가자가 클릭할 때까지 requestAnimationFrame 루프로 대기
            requestAnimationFrame(throwBall);
          }, participantDelay);
        } else {
          // NPC가 받음: idle이 된 뒤 NPC의 '고민 시간' 동안 기다렸다가 자동으로 던지기
          const randomDelay = npcMinDelay + Math.random() * (npcMaxDelay - npcMinDelay);
          setTimeout(throwBall, randomDelay);
        }

      }, catchDuration);
      // ---------------------------------------------------------------------------
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
