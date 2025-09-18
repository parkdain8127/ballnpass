// script.js - 전체 (붙여넣기 가능)
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
// (주의: throw 상태 이미지는 3프레임으로 가정)
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
    // 이미지가 모두 로드되면 5초 뒤 게임 시작
    setTimeout(startGame, 5000);
  }
}

// 플레이어 이미지 로딩 (assets 경로 구조: assets/player/{state}/{1..n}.png)
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

// 공 이미지
let ballImg = loadImage('assets/ball.png', onImageLoad);

// 공 상태
let ball = {x: players[0].x, y: players[0].y, radius: 10, heldBy: 0};
let throws = 0;
const maxThrows = 30;

// P1(참여자) 초반 수신 횟수 강제(최초 4회만)
const inclusionThrows = [1, 2, 3, 4]; // throws+1에 포함되면 강제 P1 수신

// NPC 연속 패스 제한(실제 전달 기준)
let npcConsecutiveNpcPasses = 0; // 연속으로 NPC→NPC로 실제 전달된 횟수
let lastNpcPair = null; // 사용하지는 않지만 보관(확장 가능)

// 참여자(사용자)가 클릭으로 던질 대상 선택
let userSelected = false;
let targetPlayer = null;

canvas.addEventListener('click', (e) => {
  if (players[0].state !== "idle") return; // 던지는 중이면 선택 불가
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

// 게임 시작
function startGame() {
  const loadingEl = document.getElementById("loading-screen");
  if (loadingEl) loadingEl.classList.add("hidden");
  const gameEl = document.getElementById("game-screen");
  if (gameEl) gameEl.classList.remove("hidden");

  drawPlayers();
  drawBall();
  // 잠깐 뒤에 첫 던지기 시작
  setTimeout(throwBall, 1000);
}

// 게임 종료
function endGame() {
  const gameEl = document.getElementById("game-screen");
  if (gameEl) gameEl.classList.add("hidden");

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

// NPC 던지기 '시늉' 애니메이션 (실제 공 이동 없이 시늉만)
function fakeThrowAnimation(npcIndex, onComplete) {
  const throwImgs = avatars[npcIndex]["throw"];
  if (!throwImgs) { if (onComplete) onComplete(); return; }
  let step = 0;
  const steps = throwImgs.length;
  const intervalTime = 150;

  players[npcIndex].state = "throw";
  const interval = setInterval(() => {
    players[npcIndex].currentThrowImg = throwImgs[step];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayers();
    drawBall();
    step++;
    if (step >= steps) {
      clearInterval(interval);
      players[npcIndex].state = "idle";
      players[npcIndex].currentThrowImg = null;
      if (onComplete) onComplete();
    }
  }, intervalTime);
}

// 던지기 속도(전체 duration, ms) 결정: NPC끼리일 때 다른 속도 적용
function getThrowDuration(from, to) {
  // from/to are indices: 0=You,1=P2,2=P3
  if (from !== 0 && to !== 0) {
    // NPC -> NPC
    if (from === 1 && to === 2) return 400; // P2 -> P3 빠름
    if (from === 2 && to === 1) return 700; // P3 -> P2 느림
  }
  // 기본
  return 500;
}

// 실제 공 던지기 애니메이션 (from -> to), duration은 전체 ms
function animateThrow(from, to, duration = 500, onComplete) {
  const throwImgs = avatars[from]["throw"];
  const steps = (throwImgs && throwImgs.length) ? throwImgs.length : 1;
  const intervalTime = Math.max(20, Math.floor(duration / steps));

  const startX = players[from].x;
  const startY = players[from].y;
  const endX = players[to].x;
  const endY = players[to].y;

  players[from].state = "throw";
  let step = 0;

  const interval = setInterval(() => {
    const progress = (step + 1) / steps;
    // 공 위치 보간
    ball.x = startX + (endX - startX) * progress;
    ball.y = startY + (endY - startY) * progress;

    // throw 프레임
    if (throwImgs && throwImgs[step]) players[from].currentThrowImg = throwImgs[step];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayers();
    drawBall();

    step++;
    if (step >= steps) {
      clearInterval(interval);
      // 받는 사람 상태
      players[to].state = "catch";
      setTimeout(() => { players[to].state = "idle"; }, 1000);
      players[from].state = "idle";
      players[from].currentThrowImg = null;
      if (onComplete) onComplete();
    }
  }, intervalTime);
}

// 공 던지기 로직
function throwBall() {
  if (throws >= maxThrows) {
    endGame();
    return;
  }

  const current = ball.heldBy;
  let target = null;

  if (current === 0) {
    // 참여자가 공을 가지고 있으면 사용자 선택 대기
    if (!userSelected) {
      // 계속 대기하면서 화면 갱신 루프 유지
      requestAnimationFrame(throwBall);
      return;
    }
    // 사용자가 선택한 대상에게 바로 던짐 (P1 -> NPC)
    target = targetPlayer;
    userSelected = false;
    targetPlayer = null;

    const duration = getThrowDuration(current, target);
    animateThrow(current, target, duration, () => {
      // 실제 전달 완료
      ball.heldBy = target;
      throws++;
      // NPC끼리 연속 전달 카운트 초기화(다음에 NPC간 전달이면 새로 카운트 시작)
      if (target !== 0) {
        npcConsecutiveNpcPasses = 1; // P1->NPC 다음 NPC->NPC는 1로 시작
      } else {
        npcConsecutiveNpcPasses = 0;
      }
      // 다음 동작
      setTimeout(throwBall, 500);
    });

  } else {
    // NPC가 공을 가지고 있음
    // 우선: 만약 지금 전달이 초반 inclusionThrows(1..4)에 해당하면 강제로 P1 수신
    const nextThrowIndex = throws + 1; // 1-based
    const isInclusionEarly = inclusionThrows.includes(nextThrowIndex);

    // 만약 마지막(마지막 실제 전달)이라면 P1 받지 않게 설정 (요청하신 조건)
    const isFinalThrow = (throws === maxThrows - 1);

    if (isFinalThrow) {
      // 마지막은 절대 P1으로 가지 않도록 강제 NPC 대상 선택
      target = (current === 1) ? 2 : 1;
    } else if (isInclusionEarly) {
      // 초반 강제 P1 수신
      target = 0;
    } else {
      // 일반 NPC 동작:
      // 만약 NPC->NPC 연속 실제 전달이 이미 3회 이상이면(=3) 체인을 깨기 위해 P1으로 보냄
      if (npcConsecutiveNpcPasses >= 3) {
        // 체인 깨기: P1으로 전달 (단, 최종 예외는 위에서 처리)
        target = 0;
      } else {
        // 평상시: NPC -> NPC (두 NPC뿐이므로 상대 NPC 선택)
        target = (current === 1) ? 2 : 1;
      }
    }

    // NPC가 고민하는 시간 (0.5~1.5초)
    const thinkTime = 500 + Math.random() * 1000;

    setTimeout(() => {
      // NPC가 던지는 '시늉'을 먼저 하고(시늉은 실제 전달 아님), 그 뒤 실제 전달
      fakeThrowAnimation(current, () => {
        // 작은 딜레이 후 실제 전달 시작
        setTimeout(() => {
          const duration = getThrowDuration(current, target);

          // 만약 target이 NPC이고, 현재 npcConsecutiveNpcPasses >=3 일 때
          // (이 코드는 위에서 이미 방지하려 했으므로 대부분 통과)
          // 실제로 전달을 수행
          animateThrow(current, target, duration, () => {
            // 실제 전달이 일어났을 때만 throws 증가
            ball.heldBy = target;
            throws++;

            // 연속 NPC→NPC 실제 전달 카운트 업데이트
            if (current !== 0 && target !== 0) {
              // NPC->NPC가 실제로 일어나면 증가
              npcConsecutiveNpcPasses++;
            } else {
              // P1이 개입하면 NPC 연속 전달 수 리셋
              npcConsecutiveNpcPasses = 0;
            }

            // 다음 동작
            setTimeout(throwBall, 500);
          });
        }, 300);
      });
    }, thinkTime);
  }
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
    // 이미지가 없을 수도 있으므로 안전하게 처리
    if (img && img.complete) {
      ctx.drawImage(img, players[i].x - 40, players[i].y - 40, 80, 80);
    } else {
      // 대체: 원 그리기
      ctx.fillStyle = i === 0 ? "#4A90E2" : (i === 1 ? "#7ED321" : "#F5A623");
      ctx.beginPath();
      ctx.arc(players[i].x, players[i].y, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillText(players[i].name, players[i].x, players[i].y + 6);
    }
    // 이름 (이미지로 덮여있으면 중복되도 괜찮음)
    ctx.fillStyle = "black";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(players[i].name, players[i].x, players[i].y + 60);
  }
}

// 공 그리기
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
