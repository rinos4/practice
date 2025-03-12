window.onload = function () {
    var BALL_NUM = 15,  // ゲームに使用するボールの数
        RANK_NUM = 5,   // 表示するランキング数
        RANK_MSG = ["EXCELLENT!!", "Fantastic!", "Grate!", "Very good!", "Good!", "Clear!"],
        idBody   = document.getElementById("idBody"),
        idCanvas = document.getElementById("idCanvas"),
        ctx      = idCanvas.getContext('2d'),
        size     = {},  // サイズ依存情報
        gparam   = {},  // ゲームパラメータ
        balls    = [],  // ボール情報
        score    = [],  // スコアランキング
        state    = 0;   // ゲーム状態(0:開始前、1:ゲーム中、2:終了)

    // 範囲指定での乱数取得
    function randRange(min, max) {
        return Math.random() * (max - min) + min;
    }
    // ボールの色範囲定義
    function ballRGB() {
        return (randRange(80, 255) | 0) + ",";
    }
    // ミリ秒整数をs.xxx形式の文字列に変換
    function msec2str(v) {
        return (v >= 0) ? ("000" + v).replace(/0*(.+)(...)/, "$1.$2s") : "---------";
    }
    // context2D拡張: 修飾文字センタリング描画
    ctx.centerText = function (str, x, y, rgb, shadow, hover) {
        x -= this.measureText(str).width / 2;
        y += size.ball / 4;
        this.save();
        if (hover) { // 浮き文字色指定
            this.fillStyle = hover;
            this.fillText(str, x + size.ball / 20, y + size.ball / 20);
        }
        if (rgb) {  // フォント色指定
            this.fillStyle = rgb;
            if (shadow) { // シャドウ色指定
                this.shadowColor = shadow;
                this.shadowBlur  = size.ball / 3;
            }
        }
        this.fillText(str, x, y);
        this.restore();
    };
    // context2D拡張: 矩形グラデーション描画
    ctx.gradRect = function (x, y, w, h, gx, gy, rgbs) { // rgbs.length >= 2
        var i    = rgbs.length,
            len1 = i - 1;
        this.save();
        this.fillStyle = this.createLinearGradient(x, y, x + w * gx, y + h * gy);
        while (i--) {
            this.fillStyle.addColorStop(i / len1, rgbs[i]);
        }
        this.fillRect(x, y, w, h);
        this.restore();
    };

    // 描画処理 ///////////////////////////////////////////////////////////////
    function drawBalls() {
        var i = BALL_NUM, b;
        while ((b = balls[--i]) !== undefined) {
            if (b.r > 0.1) {
                ctx.beginPath();
                ctx.arc(b.vec[0].pos, b.vec[1].pos, size.ball / b.r, 0, Math.PI * 2, true);
                ctx.fillStyle = b.rgb + (b.r * 0.9) + ")"; // 塗りつぶし色
                ctx.fill();
                ctx.strokeStyle = "rgba(255,255,255," + b.r + ")"; // 枠色
                ctx.stroke();
                ctx.centerText(i + 1, b.vec[0].pos, b.vec[1].pos, (b.r < 1) ? 0 : "#000"); // ボール番号
            }
        }
    }
    gparam.drawfunc = [function () {
        // 表題描画
        ctx.gradRect(size.hx / 4, size.hy / 2 - size.ball, size.hx * 1.5, size.ball * 2, 1, 1, ["#f00", "#400", "#f00"]);
        ctx.centerText("REFLEXES TEST",   size.hx, size.hy / 2, "#ff6", "#fd0", "#100");
        ctx.centerText("Click to start!", size.hx, size.hy + size.ball, "#fff", "#f88");
    }, function () {
        // 本編描画
        drawBalls();
        ctx.centerText("Time: " + msec2str(Date.now() - gparam.startms), size.hx, size.hy, "rgba(255,255,255,0.5)");
    }, function () {
        // 結果描画
        var sy = idCanvas.height / 9,
            i = RANK_NUM;
        ctx.centerText(RANK_MSG[gparam.rank], size.hx, sy, "#ffd", "#ffa", "#880");
        ctx.centerText("Your score is " + msec2str(gparam.startms), size.hx, sy * 2, "#ddf", "#33f");

        // ランキング
        ctx.gradRect(size.hx / 2, sy * 2.5, size.hx, sy, 1, 1, ["#6f6", "#070"]);
        ctx.strokeStyle = "#bfb";
        ctx.strokeRect(size.hx / 2, sy * 2.5, size.hx, sy * 6);
        ctx.centerText("RANKING", size.hx, sy * 3, "#fff", "#8f8");
        while (i--) {
            ctx.centerText(i + 1 + ": " + msec2str(score[i]), size.hx, sy * (i + 4),
                           (i === gparam.rank) ? "rgba(255,255,128," + (Date.now() % 1000 / 500) + ")" : "#fff", "#ff0");
        }
        drawBalls(); // ボールは残像があるためクリア後も描画しておく
    }];

    function draw() {
        ctx.gradRect(0, 0, idCanvas.width, idCanvas.height, 0, 1, ["#000", "#700"]); // 背景
        gparam.drawfunc[state]();
    }

    // タイマー更新 ///////////////////////////////////////////////////////////
    function ontimer() {
        var i = BALL_NUM, j, k, b;
        while ((b = balls[--i]) !== undefined) {
            if (i < gparam.count) {
                // ボールのフェードアウト
                b.r *= 0.8;
            } else {
                // ボール移動(加速度ランダム変化)
                for (j = 0; j < 2; ++j) { // (x,y)
                    k = b.vec[j];
                    k.pos += (k.v = Math.min(Math.max(k.v + randRange(-size.accel, size.accel), -size.speed), size.speed));
                    if (k.pos < size.ball || size.area[j] <= k.pos) {
                        // 壁衝突
                        k.pos = ((k.pos < size.ball) ? size.ball : size.area[j]) * 2 - k.pos;
                        k.v  *= -1;
                    }
                }
            }
        }
        draw();
    }

    // クリック or タッチ制御 /////////////////////////////////////////////////
    gparam.clickfunc = [function () {
        // ゲーム開始
        var i;
        for (i = 0; i < BALL_NUM; i++) { // 全ボールをランダムに設置
            balls[i] = {vec : [{pos: randRange(size.ball, size.area[0]), v: 0},
                               {pos: randRange(size.ball, size.area[1]), v: 0}],
                        r   : 1,
                        rgb : "rgba(" + ballRGB() + ballRGB() + ballRGB()};
        }
        gparam.count    = 0;
        gparam.timerid  = setInterval(ontimer, 1000 / 30); // 30fps
        gparam.startms  = Date.now();
        state = 1;
    }, function (e) {
        // ボールヒット判定
        var i = (e.touches) ? e.targetTouches[0] : e,   // タッチ or マウス
            vec = balls[gparam.count].vec;
        if (Math.pow(vec[0].pos - i.clientX, 2) + Math.pow(vec[1].pos - i.clientY, 2) <= Math.pow(size.ball, 2)) {
            // ボールヒット!
            if (++gparam.count >= BALL_NUM) { // クリア(最終ボール)判定
                gparam.startms = Date.now() - gparam.startms;

                // ランキングチェック
                for (i = 0; i < RANK_NUM; ++i) {
                    if (!score[i] || score[i] > gparam.startms) { // ランキング更新?
                        score.splice(i, 0, gparam.startms);
                        score.splice(RANK_NUM);
                        break;
                    }
                }
                gparam.rank = i; // 今回のランキング位置 (ランク外はRANK_NUM)
                state = 2;
            }
        }
        //else {お手つきのペナルティは特に無し}
    }, function () {
        // スタート画面復帰
        clearTimeout(gparam.timerid);
        state = 0;
    }];

    // 画面サイズ依存のパラメータ設定 //////////////////////////////////////////
    function onresize() {
        // 画面サイズ、ボールサイズ設定等
        size.hx     = idBody.offsetWidth  / 2;
        size.hy     = idBody.offsetHeight / 2;
        size.ball   = Math.min(size.hx, size.hy) / 5 | 0; // ボールサイズ
        size.area   = [(idCanvas.width  = idBody.offsetWidth)  - size.ball,
                       (idCanvas.height = idBody.offsetHeight) - size.ball];
        size.speed  = size.ball / 5;    // 最大速度  (ここで難易度調整)
        size.accel  = size.ball / 100;  // 最大加速度(ここで難易度調整)

        // 描画サイズパラメータはボールサイズ基準でスケーリング
        ctx.font  = size.ball * 0.6 + "pt Arial";
        ctx.lineWidth = size.ball / 40;

        // サイズ変更後は再描画
        draw();
    }

    // 初期化処理 /////////////////////////////////////////////////////////////
    onresize();
    window.addEventListener("resize", onresize, false);
    idBody.addEventListener((navigator.userAgent.search(/Android|iPad|iPhone|iPod/) < 0) ? "mousedown" : "touchstart",  function (e) {
        gparam.clickfunc[state](e);
        draw();
        e.preventDefault(); // iOSでのフリック動作抑制のため
    }, false);
};
