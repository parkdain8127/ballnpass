const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 게임 상태 변수
let passCount = 0;
const maxPasses = 30;
let isThrowing = false;
let throwFrame = 0;
let throwTarget = null;
let lastThrowTime = 0;

// 플레이어 정의
const players = [
  { id: "P1", x: 200, y: 300, color: "blue" },
  { id: "P2", x: 600, y: 200, color: "green" },
  { id: "P3", x: 600, y: 400, color: "orange" }
];

// 공 상태
let ball = { x: players[0].x, y: players[0].y, holder: players[0] };

// 로딩 후 6.5초 뒤 게임 시작
setTimeout(() => {
  document.getElementById("loading").style.display = "none";
  canvas.style.display = "block";
  gameLoop();
}, 6500);

// 게임 루프
function gameLoop() {
  if (passCount >= maxPasses) {
    endGame();
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 플레이어 그리기
  players.forEach(player => {
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(player.id, player.x, player.y + 6);
  });

  // 공 그리기
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 15, 0, Math.PI * 2);
  ctx.fill();

  // 던지기 애니메이션
  if (isThrowing && throwTarget) {
    let now = Date.now();
    if (now - lastThrowTime > 200) { // 200ms마다 프레임 전환
      throwFrame++;
      lastThrowTime = now;
    }
    if (throwFrame >= 3) { // 3프레임 지나면 공 이동 완료
      isThrowing = false;
      throwFrame = 0;
      ball.holder = throwTarget;
      ball.x = throwTarget.x;
      ball.y = throwTarget.y;
      passCount++;
    } else {
      // 공을 타겟 쪽으로 이동
      ball.x += (throwTarget.x - ball.x) / (3 - throwFrame);
      ball.y += (throwTarget.y - ball.y) / (3 - throwFrame);
    }
  }

  requestAnimationFrame(gameLoop);
}

// 마우스 클릭 이벤트: P2 또는 P3에게 공 던지기
canvas.addEventListener("click", (e) => {
  if (isThrowing || passCount >= maxPasses) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  players.forEach(player => {
    if (player.id !== "P1") {
      const dx = mouseX - player.x;
      const dy = mouseY - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 40) { // 플레이어 원 안 클릭 시
        throwTarget = player;
        isThrowing = true;
        throwFrame = 0;
        lastThrowTime = Date.now();
      }
    }
  });
});

// 게임 종료 함수
function endGame() {
  canvas.style.display = "none";
  document.getElementById("gameOverScreen").style.display = "block";
}
