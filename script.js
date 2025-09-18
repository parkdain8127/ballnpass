// script.js
window.onload = function () {
  const loadingScreen = document.getElementById("loading-screen");
  const gameContainer = document.getElementById("game-container");
  const gameCanvas = document.getElementById("gameCanvas");
  const ctx = gameCanvas.getContext("2d");
  const gameOverScreen = document.getElementById("game-over");

  // 로딩 화면 6.5초 후 게임 시작
  setTimeout(() => {
    loadingScreen.style.display = "none";
    gameContainer.style.display = "flex";
    startGame();
  }, 6500);

  function startGame() {
    const players = [
      { x: 300, y: 500, label: "P1 (You)" }, // 실험 참여자
      { x: 100, y: 200, label: "P2" },       // NPC
      { x: 500, y: 200, label: "P3" }        // NPC
    ];

    let ball = { x: players[0].x, y: players[0].y, radius: 10, visible: false };

    let passCount = 0;
    const maxPasses = 30;

    let ballHolder = 0; // 처음 P1이 공을 가짐
    let playerReceives = 0; // P1이 받은 횟수 (초반 4회 제한)
    let lastTwoNPC = []; // 최근 NPC 패스 기록

    function drawPlayers() {
