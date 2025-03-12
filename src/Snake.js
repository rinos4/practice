window.onload = function () {
	var GAME_FPS = 10, // 難易度調整
		RANK_NUM = 5,
		RANK_MSG = ["EXCELLENT!!", "Fantastic!", "Grate!", "Very good!", "Good!", "Game over"],
		DIR_VEC	 = [[-1, 0], [0, -1], [1, 0], [0, 1]],
		idDiv	 = document.getElementById("idDiv"),
		idCanvas = document.getElementById("idCanvas"),
		ctx		 = idCanvas.getContext('2d'),
		size	 = {},
		gparam	 = {},
		keyque	 = [],
		score	 = [],
		state	 = 0;

	// context2D拡張: 修飾文字センタリング描画
	ctx.centerText = function (str, x, y, rgb, shadow, hover) {
		x -= ctx.measureText(str).width / 2;
		y += size.unit / 2;
		ctx.save();
		if (hover) { // 浮き文字色指定
			ctx.fillStyle = hover;
			ctx.fillText(str, x + size.unit / 10, y + size.unit / 10);
		}
		if (rgb) {	// フォント色指定
			ctx.fillStyle = rgb;
			if (shadow) { // シャドウ色指定
				ctx.shadowColor = shadow;
				ctx.shadowBlur  = size.unit;
			}
		}
		ctx.fillText(str, x, y);
		ctx.restore();
	};
	// context2D拡張: 矩形グラデーション描画
	ctx.gradRect = function (x, y, w, h, gx, gy, rgbs) { // rgbs.length >= 2
		var i = rgbs.length, len1 = i - 1;
		this.save();
		this.fillStyle = this.createLinearGradient(x, y, x + w * gx, y + h * gy);
		while (i--) {
			this.fillStyle.addColorStop(i / len1, rgbs[i]);
		}
		this.fillRect(x, y, w, h);
		this.restore();
	};

	// 描画処理 ///////////////////////////////////////////////////////////////
	function drawSnake() {
		var i = gparam.snake.length,
			col,
			j;
		while ((j = gparam.snake[--i]) !== undefined) {
			col = 255 - i * 256 / gparam.snake.length | 0;
			col += ",255," + col;
			ctx.gradRect(j[0] * size.bx, j[1] * size.by, size.bx, size.by, 1, 1, ["rgb(" + col + ")", "rgba(" + col + ",0.4)"]);
		}
		ctx.gradRect(gparam.target[0] * size.bx, gparam.target[1] * size.by, size.bx, size.by, 1, 1, ["#ff0", "#f80"]); // 餌
	}
	gparam.drawfunc = [function () {
		// 表題描画
		ctx.gradRect(size.hx / 4, size.hy / 2 - size.unit * 2, size.hx * 1.5, size.unit * 4, 1, 1, ["#f00", "#400", "#f00"]);
		ctx.centerText("Snake game",   size.hx, size.hy / 2, "#ff6", "#fd0", "#100");
		ctx.centerText("Push Enter key to start!", size.hx, size.hy + size.unit * 2, "#fff", "#f88");
	}, function () {
		// 本編描画
		drawSnake();
		ctx.centerText("Length: " + gparam.snake.length, size.hx, size.hy, "rgba(255,255,255,0.5)");
	}, function () {
		drawSnake(); // 最後の状態を表示しておく
		// 結果描画
		var sy = idCanvas.height / 9,
			i = RANK_NUM;
		ctx.centerText(RANK_MSG[gparam.rank], size.hx, sy, "#ffd", "#ffa", "#880");
		ctx.centerText("Body length is " + gparam.snake.length, size.hx, sy * 2, "#ddf", "#33f");
		ctx.gradRect(size.hx / 2, sy * 2.5, size.hx, sy, 1, 1, ["#6f6", "#070"]);
		ctx.strokeStyle = "#bfb";
		ctx.strokeRect(size.hx / 2, sy * 2.5, size.hx, sy * 6);
		ctx.centerText("RANKING", size.hx, sy * 3, "#fff", "#8f8");
		while (i--) {
			ctx.centerText(i + 1 + ": " + (score[i] ? "Length = " + score[i] : "--------"), size.hx, sy * (i + 4),
						   (i === gparam.rank) ? "rgba(255,255,128," + (Date.now() % 1000 / 500) + ")" : "#fff", "#ff0");
		}
	}];
	function draw() {
		ctx.gradRect(0, 0, idCanvas.width, idCanvas.height, 0, 1, ["#000", "#700"]); // 背景
		gparam.drawfunc[state]();
	}

	// 蛇/餌の制御 ////////////////////////////////////////////////////////////
	function gameEnd() {
		var len = gparam.snake.length,
			i;
		// ランキングチェック
		for (i = 0; i < RANK_NUM; ++i) {
			if (!score[i] || score[i] < len) {
				score.splice(i, 0, len);
				score.splice(RANK_NUM);
				break;
			}
		}
		state = 2;
		gparam.rank = i;
		draw();
	}
	// 衝突判定
	function checkBody(pos, i) {
		while (i--) {
			if (gparam.snake[i][0] === pos[0] && gparam.snake[i][1] === pos[1]) {
				return true; // 衝突あり
			}
		}
		return false; // 衝突無し
	}
	// 餌を(現在の胴体以外の場所へ)ランダムに置く
	function setTarget() {
		do { // 無限loopを100%回避するには別アルゴリズムが必要
			gparam.target = [Math.random() * size.bw | 0, Math.random() * size.bh | 0];
		} while (checkBody(gparam.target, gparam.snake.length));
	}

	// タイマー処理 ///////////////////////////////////////////////////////////
	function ontimer() {
		var next;
		if (state < 2) {
			// 方向転換あり (90°方向のみ許可)
			if ((next = keyque.pop()) !== undefined && ((next ^ gparam.vec) & 1)) {
				gparam.vec = next;
			}
			next = DIR_VEC[gparam.vec];
			next = [gparam.snake[0][0] + next[0], gparam.snake[0][1] + next[1]]; // 次位置

			// 壁or胴体判定 (胴体末尾は判定から除外)
			if (next[0] < 0 || size.bw <= next[0] || next[1] < 0 || size.bh <= next[1] || checkBody(next, gparam.snake.length - 1)) {
				gameEnd();
				return;
			}
			// 捕食判定
			gparam.snake.unshift(next); // 頭前進
			if (gparam.snake[0][0] === gparam.target[0] && gparam.snake[0][1] === gparam.target[1]) {
				setTarget();		// 捕食 (1つ成長)
			} else {
				gparam.snake.pop(); // しっぽ後退
			}
		}
		draw(); // 毎回全画面を再描画
	}

	// キー押下 ///////////////////////////////////////////////////////////////
	gparam.keyfunc = [function (e) {
		// タイトル画面
		if (e.keyCode === 0x0d) { // Enterキー
			gparam.snake = [[0, size.bh / 2 | 0]]; // 左中からスタート
			gparam.vec = 2;// 右向きで開始
			setTarget();
			gparam.timerid = setInterval(ontimer, 1000 / GAME_FPS);
			state = 1; // ゲームスタート
		}
	}, function (e) {
		// ゲーム中
		var vec = e.keyCode - 0x25;	// ←キーを起点にする
		if (0 <= vec && vec < 4) {	// カーソルキー(←↑→↓))
			keyque.unshift(vec);	// 多重押下を考慮してキューイングのみ
		}
	}, function (e) {
		// スタート画面復帰
		if (e.keyCode === 0x0d) { // Enterキー
			clearTimeout(gparam.timerid);
			state = 0; // 開始し戻る
			draw();
		}
	}];

	// 画面サイズ依存のパラメータ設定 //////////////////////////////////////////
	function onresize() {
		// ブロックサイズ、文字サイズ設定等
		size.hx		= (idCanvas.width  = idDiv.offsetWidth)  / 2;
		size.hy		= (idCanvas.height = idDiv.offsetHeight) / 2;
		size.unit	= Math.min(size.hx, size.hy) / 10;
		size.bw		= idCanvas.width  / size.unit | 0;
		size.bh		= idCanvas.height / size.unit | 0;
		size.bx		= idCanvas.width  / size.bw;
		size.by		= idCanvas.height / size.bh;

		// サイズ変更後は再描画
		ctx.font  = size.unit * 1.2 + "pt Arial";
		ctx.lineWidth = 3;
		draw();
	}

	// 初期化処理 /////////////////////////////////////////////////////////////
	onresize();
	window.addEventListener("resize", onresize, false);
	window.addEventListener("keydown", function (e) {
		gparam.keyfunc[state](e);
	}, false);
};
