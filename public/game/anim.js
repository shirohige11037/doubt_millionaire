/*
  アニメーション用の関数を書くスクリプト
*/

//==================================================
// Canvas初期設定
//==================================================

export function initCanvas(canvas) {
  canvas.width = 450;
  canvas.height = 1000;
  window.aspect = 1;
}

//--------------------------------------------------
// ウィンドウサイズ変更時の処理
//--------------------------------------------------

export function setDispSize(canvas) {
  const area = document.getElementById("area");

  if (area.clientHeight * canvas.width > area.clientWidth * canvas.height) {
    aspect = area.clientWidth / canvas.width;
    canvas.style.width = area.clientWidth + "px";
    canvas.style.height = (area.clientWidth * canvas.height / canvas.width) +
      "px";
  } else {
    aspect = area.clientHeight / canvas.height;
    canvas.style.width = (area.clientHeight * canvas.width / canvas.height) +
      "px";
    canvas.style.height = area.clientHeight + "px";
  }
}

//==================================================
// カード生成設定
//==================================================

export function initCard() {
  window.totalCards = 10; // 並べるカード枚数
  const cardAsp = 208 / 142; // アスペクト比
  const size = 100; // 基準サイズ
  const margin = 20; // 両端の余白

  // カードサイズ
  window.cardWidth = size;
  window.cardHeight = size * cardAsp;

  // spacing（間隔）を自動調整
  if (window.totalCards === 1) {
    window.spacing = 0;
  } else {
    // spacingが正の値だと離れ、負の値だと重なる
    // 少ない枚数は離して、多い枚数は重ねるように線形補間
    const minSpacing = -60; // たくさんの枚数のときの重なり量
    const maxSpacing = 30; // 少ない枚数のときの自然な間隔
    const maxCards = 12; // この枚数以上は完全に重ねる想定

    const t = Math.min(window.totalCards - 1, maxCards - 1) / (maxCards - 1);
    window.spacing = maxSpacing * (1 - t) + minSpacing * t;

    // spacingがcanvas幅を超えないよう補正
    const availableWidth = window.canvas.width - margin * 2;
    const requiredWidth = window.cardWidth * window.totalCards +
      window.spacing * (window.totalCards - 1);
    if (requiredWidth > availableWidth) {
      window.spacing = (availableWidth - window.cardWidth * window.totalCards) /
        (window.totalCards - 1);
    }
  }

  // カード列の表示位置を「中央揃え + 両端に余白」で調整
  const totalCardWidth = window.totalCards > 1
    //true
    ? window.totalCards * window.cardWidth +
      (window.totalCards - 1) * window.spacing
    //false
    : window.cardWidth;

  const fullWidth = totalCardWidth + margin * 2;
  window.startX = (window.canvas.width - fullWidth) / 2 + margin;
  window.startY = (window.canvas.height - window.cardHeight) / 2 + 80;

  // カード画像読み込み
  window.cardImgs = [];

  for (let i = 0; i < window.totalCards; i++) {
    const SuitRandom = Math.floor(Math.random() * 4) + 1;
    const RankRandom = Math.floor(Math.random() * 10) + 1;

    let Suit = "";
    if (SuitRandom === 1) Suit = "C";
    else if (SuitRandom === 2) Suit = "D";
    else if (SuitRandom === 3) Suit = "H";
    else if (SuitRandom === 4) Suit = "S";

    const cardImg = new Image();
    cardImg.src = `./images/Trump/${Suit}_${RankRandom}.png`;
    window.cardImgs.push(cardImg);
  }
}

//==================================================
// 描画関連
//==================================================

export function resetStyle(ctx) {
  ctx.clearRect(0, 0, window.canvas.width, window.canvas.height);
  ctx.filter = "none";
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#ffffffff";
}

export function drawBackground(ctx) {
  ctx.beginPath();
  ctx.rect(0, 0, window.canvas.width, window.canvas.height);
  ctx.fillStyle = "#31a147ff";
  ctx.fill();
  ctx.closePath();
}

export function drawCards(highlightIndex = -1, ctx) {
  for (let i = 0; i < window.totalCards; i++) {
    const x = window.startX + i * (window.cardWidth + window.spacing);
    const y = window.startY;

    /*  ctx.beginPath();
    ctx.rect(x, y, window.cardWidth, window.cardHeight);
    ctx.fillStyle = "#ffffffff";
    ctx.fill();
    ctx.closePath(); */

    ctx.drawImage(
      window.cardImgs[i],
      x,
      y,
      window.cardWidth,
      window.cardHeight,
    );

    if (i === highlightIndex) {
      ctx.beginPath();
      ctx.rect(x, y, window.cardWidth, window.cardHeight);
      ctx.fillStyle = "#48484888";
      ctx.fill();
      ctx.closePath();
    }
  }
}

//==================================================
// 画像読み込み完了後に描画
//==================================================

export function drawAll() {
  Promise.all(
    window.cardImgs.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = resolve;
            img.onerror = resolve;
          }
        }),
    ),
  ).then(() => {
    resetStyle(window.ctx);
    drawBackground(window.ctx);
    drawCards(-1, window.ctx);
  });
}

//==================================================
// Canvas内マウスホバー処理
//==================================================

export function mouseHover() {
  window.canvas.addEventListener("mousemove", (e) => {
    const rect = window.canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / window.aspect;
    const mouseY = (e.clientY - rect.top) / window.aspect;

    let hoverIndex = -1;
    for (let i = 0; i < totalCards; i++) {
      const x1 = window.startX + i * (window.cardWidth + window.spacing);
      const y1 = window.startY;
      const x2 = x1 + window.cardWidth;
      const y2 = y1 + window.cardHeight;

      if (mouseX >= x1 && mouseX <= x2 && mouseY >= y1 && mouseY <= y2) {
        hoverIndex = i;
        break;
      }
    }

    resetStyle(window.ctx);
    drawBackground(window.ctx);
    drawCards(hoverIndex, window.ctx);
  });

  canvas.addEventListener("mouseleave", () => {
    resetStyle(window.ctx);
    drawBackground(window.ctx);
    drawCards(-1, window.ctx);
  });
}
