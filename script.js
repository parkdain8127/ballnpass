window.onload = function () {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    const loadingScreen = document.getElementById("loadingScreen");
    const gameOverScreen = document.getElementById("gameOverScreen");

    // 초기 상태 확실히 설정
    canvas.style.display = "none";
    gameOverScreen.style.display = "none";
    loadingScreen.style.display = "flex";

    canvas.width = 800;
    canvas.height = 600;

    // 게임 상태
    let players = [];
    let ball = null;
    let currentPlayer = 0;
    let passCount = 0;
    const maxPasses = 30;
    let gameOver = false;

    // 이미지 로드
    const images = {
        p1: {
            idle: new Image(),
            throw: [new Image(), new Image(), new Image()],
            catch: new Image()
        },
        p2: { idle: new Image() },
        p3: { idle: new Image() },
        ball: new Image()
    };

    images.p1.idle.src = "assets/player/idle/1.png";
    images.p1.throw[0].src = "assets/player/throw/1.png";
    images.p1.throw[1].src = "assets/player/throw/2.png";
    images.p1.throw[2].src = "assets/player/throw/3.png";
    images.p1.catch.src = "assets/player/catch/1.png";

    images.p2.idle.src = "assets/player.png";
    images.p3.idle.src = "assets/player.png";
    images.ball.src = "assets/ball.png";

    // Player 클래스
    class Player {
        constructor(x, y, img, id) {
            this.x = x;
            this.y = y;
            this.img = img;
            this.width = 120;
            this.height = 120;
            this.id = id;
            this.throwing = false;
            this.throwFrame = 0;
        }

        draw() {
            if (this.id === 1 && this.throwing) {
                ctx.drawImage(
                    images.p1.throw[this.throwFrame],
                    this.x, this.y,
                    this.width, this.height
                );
            } else {
                ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
            }
        }

        playThrowAnimation(callback) {
            this.throwing = true;
            this.throwFrame = 0;

            const interval = setInterval(() => {
                this.throwFrame++;
                if (this.throwFrame >= images.p1.throw.length) {
                    clearInterval(interval);
                    this.throwing = false;
                    callback();
                }
            }, 200); // 각 프레임 200ms
        }
    }

    // Ball 클래스
    class Ball {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.width = 40;
            this.height = 40;
            this.target = null;
            this.speed = 5;
        }

        update() {
            if (this.target) {
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 5) {
                    this.target = null;
                    currentPlayer = (currentPlayer + 1) % players.length;
                } else {
                    this.x += (dx / dist) * this.speed;
                    this.y += (dy / dist) * this.speed;
                }
            }
        }

        draw() {
            ctx.drawImage(images.ball, this.x, this.y, this.width, this.height);
        }
    }

    function initGame() {
        players = [
            new Player(100, 250, images.p1.idle, 1), // P1
            new Player(600, 100, images.p2.idle, 2), // P2
            new Player(600, 400, images.p3.idle, 3)  // P3
        ];
        ball = new Ball(players[0].x + 60, players[0].y + 60);

        canvas.addEventListener("click", (event) => {
            if (gameOver || currentPlayer !== 0) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            [1, 2].forEach(i => {
                const p = players[i];
                if (
                    mouseX >= p.x && mouseX <= p.x + p.width &&
                    mouseY >= p.y && mouseY <= p.y + p.height
                ) {
                    players[0].playThrowAnimation(() => {
                        ball.target = { x: p.x + 60, y: p.y + 60 };
                        passCount++;
                        if (passCount >= maxPasses) endGame();
                    });
                }
            });
        });

        requestAnimationFrame(gameLoop);
    }

    function gameLoop() {
        if (gameOver) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        players.forEach(player => player.draw());
        ball.update();
        ball.draw();

        requestAnimationFrame(gameLoop);
    }

    function endGame() {
        gameOver = true;
        canvas.style.display = "none";
        gameOverScreen.style.display = "flex";
    }

    // 로딩 → 게임 시작 (6초 후)
    setTimeout(() => {
  document.getElementById("loading").style.display = "none";
  canvas.style.display = "block";
  gameLoop();
}, 6500);
};
