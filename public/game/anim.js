/*
  アニメーション用の関数を書くスクリプト
*/

//==================================================
// Canvas初期設定
//==================================================

export function initCanvas(handCardY) {
  //==================================================
  // 初期化処理
  //==================================================
  window.canvas = document.getElementById("gameScene");
  window.ctx = window.canvas.getContext("2d");

  window.handCardList = []; //手元のカード（下）
  window.selectedCardList = []; //選択されたカード（上）

  //並べるカード枚数
  window.totalCardCount = 0;

  //==================================================
  // 変更できる変数
  //==================================================

  //Canvasサイズ（スマホ画面として見える部分）
  window.canvas.width = 450;
  window.canvas.height = 1000;

  // カードサイズ
  const cardAsp = 208 / 142; // アスペクト比
  const size = 100; // 基準サイズ
  window.cardWidth = size;
  window.cardHeight = size * cardAsp;

  //カード列の左右の余白
  window.cardMargin = 30;

  //Y座標を管理する変数
  window.handCardY = handCardY; //手札の位置
  window.selectedCardY = 150; //選択されたカードの位置
}

//--------------------------------------------------
// ウィンドウサイズ変更時の処理
//--------------------------------------------------

export function setDispSize() {
  const area = document.getElementById("area");

  if (
    area.clientHeight * window.canvas.width >
      area.clientWidth * window.canvas.height
  ) {
    window.canvasAspect = area.clientWidth / window.canvas.width;
    window.canvas.style.width = area.clientWidth + "px";
    window.canvas.style.height =
      (area.clientWidth * window.canvas.height / window.canvas.width) +
      "px";
  } else {
    window.canvasAspect = area.clientHeight / window.canvas.height;
    window.canvas.style.width =
      (area.clientHeight * window.canvas.width / window.canvas.height) +
      "px";
    window.canvas.style.height = area.clientHeight + "px";
  }
}

//==================================================
// カード生成設定
//==================================================

// spacing（間隔）を自動調整
function calcCardSpacing(cardCount) {
  if (cardCount <= 1) return 0;

  const minSpacing = -60;
  const maxSpacing = 30;
  const maxCards = 12;
  const t = Math.min(cardCount - 1, maxCards - 1) / (maxCards - 1);
  let spacing = maxSpacing * (1 - t) + minSpacing * t;

  // 幅制限補正
  const availableWidth = window.canvas.width - window.cardMargin * 2;
  const requiredWidth = window.cardWidth * cardCount +
    spacing * (cardCount - 1);

  if (requiredWidth > availableWidth) {
    spacing = (availableWidth - window.cardWidth * cardCount) /
      (cardCount - 1);
  }

  return spacing;
}

// カード列の表示位置を「中央揃え + 両端に余白」で調整
function calcCardCenterPosition() {
  window.handCardSpacing = calcCardSpacing(window.totalCardCount);

  const totalCardWidth = window.totalCardCount > 1
    //true
    ? window.totalCardCount * window.cardWidth +
      (window.totalCardCount - 1) * window.handCardSpacing
    //false
    : window.cardWidth;

  window.cardStartX = (window.canvas.width - totalCardWidth) / 2;
  window.cardStartY = (window.canvas.height - window.cardHeight) / 2 +
    window.handCardY; //手札カードの位置調整
}

// カード配列をカスタムランク順でソート
function sortCardByRank(cardList) {
  // ランク順（3,4,5,6,7,8,9,10,1,2）
  const customOrder = [3, 4, 5, 6, 7, 8, 9, 10, 1, 2];

  cardList.sort((a, b) => { //値が正ならばaがbの前に、値が負ならばaがbの後に来る
    const indexA = customOrder.indexOf(a.rank);
    const indexB = customOrder.indexOf(b.rank);
    return indexA - indexB;
  });
}

export function initCard(playerCardData) {
  window.totalCardCount = playerCardData.length; //送られてきた枚数を取得

  //位置調整
  calcCardSpacing(window.totalCardCount);
  calcCardCenterPosition();

  const tempCardData = playerCardData.map((card) => ({
    suit: card.suit,
    rank: card.rank,
    imgSrc: `./images/Trump/${card.suit}_${card.rank}.png`,
  }));

  // === ランク（rank）で昇順ソート ===
  sortCardByRank(tempCardData);

  // === 画像オブジェクトを読み込み、最終リストに統合 ===
  window.handCardList = tempCardData.map((card) => {
    const img = new Image();
    img.src = card.imgSrc;
    return {
      suit: card.suit,
      rank: card.rank,
      img: img, // 画像オブジェクトを直接保持
    };
  });
}

//==================================================
// 描画関連
//==================================================

function resetStyle() {
  window.ctx.clearRect(0, 0, window.canvas.width, window.canvas.height);
  window.ctx.filter = "none";
  window.ctx.lineWidth = 1;
  window.ctx.strokeStyle = "#ffffffff";
}

function drawBackground() {
  window.ctx.beginPath();
  window.ctx.rect(0, 0, window.canvas.width, window.canvas.height);
  window.ctx.fillStyle = "#31a147ff";
  window.ctx.fill();
  window.ctx.closePath();
}

function drawHandCardRow(handHighlightIndex = -1) {
  for (let i = 0; i < window.totalCardCount; i++) {
    const card = window.handCardList[i];
    const img = card.img;
    if (!img || !(img instanceof HTMLImageElement)) continue; // ← ここで防御

    const x = window.cardStartX +
      i * (window.cardWidth + window.handCardSpacing);
    const y = window.cardStartY;

    window.ctx.drawImage(
      card.img,
      x,
      y,
      window.cardWidth,
      window.cardHeight,
    );

    if (i === handHighlightIndex) {
      window.ctx.beginPath();
      window.ctx.rect(x, y, window.cardWidth, window.cardHeight);
      window.ctx.fillStyle = "#48484888";
      window.ctx.fill();
      window.ctx.closePath();
    }
  }
}

function drawSelectedCardRow(selectedHighlightIndex = -1) {
  const selectedY = window.cardStartY - window.selectedCardY; // 通常列より少し上
  const totalSelected = window.selectedCardList.length;

  window.selectedCardSpacing = calcCardSpacing(totalSelected);

  // === カード列の中央揃え位置計算 ===
  const totalCardWidth = totalSelected * window.cardWidth +
    (totalSelected - 1) * window.selectedCardSpacing;
  const startX = (window.canvas.width - totalCardWidth) / 2;

  // === 描画 ===
  for (let i = 0; i < totalSelected; i++) {
    const x = startX + i * (window.cardWidth + window.selectedCardSpacing);
    const y = selectedY;
    const img = window.selectedCardList[i].img;
    window.ctx.drawImage(img, x, y, window.cardWidth, window.cardHeight);

    // 追加: ハイライト描画
    if (i === selectedHighlightIndex) {
      window.ctx.beginPath();
      window.ctx.rect(x, y, window.cardWidth, window.cardHeight);
      window.ctx.fillStyle = "#48484888"; // 下段と同じ灰色
      window.ctx.fill();
      window.ctx.closePath();
    }
  }
}

//==================================================
// 画像読み込み完了後に描画
//==================================================

export function drawAll(handHighlightIndex = -1, selectedHighlightIndex = -1) {
  Promise.all(
    //handCardList の各要素から img プロパティを取り出して待機
    window.handCardList.map((card) => card.img).map(
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
    resetStyle();
    drawBackground();
    drawHandCardRow(handHighlightIndex);
    drawSelectedCardRow(selectedHighlightIndex);
  });
}

//==================================================
// Canvas内マウス処理
//==================================================

//マウスポジション
function getMousePos(e) {
  const rect = window.canvas.getBoundingClientRect();

  // ★ rectサイズと実際のcanvasサイズの比率を取る
  const scaleX = window.canvas.width / rect.width;
  const scaleY = window.canvas.height / rect.height;

  // ★ これを使って正確なcanvas座標に変換
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  return {
    x: mouseX,
    y: mouseY,
  };
}

// 元のカード列 右→左で当たり判定（見た目で上のカードを優先）
function getHandCardIndexAtPos(mouseX, mouseY) {
  for (let i = window.totalCardCount - 1; i >= 0; i--) {
    const x1 = window.cardStartX +
      i * (window.cardWidth + window.handCardSpacing);
    const y1 = window.cardStartY;
    const x2 = x1 + window.cardWidth;
    const y2 = y1 + window.cardHeight;
    if (mouseX >= x1 && mouseX <= x2 && mouseY >= y1 && mouseY <= y2) {
      return i;
    }
  }
  return -1;
}

// 選択済みカード列の当たり判定
function getSelectedCardIndexAtPos(mouseX, mouseY) {
  const selectedY = window.cardStartY - window.selectedCardY; // drawSelectedCardRowと同じY座標

  const totalSelected = window.selectedCardList.length;

  // 選択済みカード列の描画位置計算 (drawSelectedCardRowからコピー)
  const selectedSpacing = calcCardSpacing(totalSelected);
  const totalCardWidth = totalSelected * window.cardWidth +
    (totalSelected > 0 ? (totalSelected - 1) * selectedSpacing : 0);
  const startX = (window.canvas.width - totalCardWidth) / 2;

  for (let i = totalSelected - 1; i >= 0; i--) {
    const x1 = startX + i * (window.cardWidth + selectedSpacing);
    const y1 = selectedY;
    const x2 = x1 + window.cardWidth;
    const y2 = y1 + window.cardHeight;
    if (mouseX >= x1 && mouseX <= x2 && mouseY >= y1 && mouseY <= y2) {
      return i; // 選択リスト内のインデックスを返す
    }
  }
  return -1;
}

//ホバー時
export function mouseHover() {
  window.canvas.addEventListener("mousemove", (e) => {
    const { x: mouseX, y: mouseY } = getMousePos(e);

    // 1. 上段（選択済み）の当たり判定
    const selectedHoverIndex = getSelectedCardIndexAtPos(mouseX, mouseY);

    // 2. 下段（手札）の当たり判定
    //    ※ 上段が当たっていたら下段のチェックはスキップする
    const handHoverIndex = selectedHoverIndex >= 0
      ? -1
      : getHandCardIndexAtPos(mouseX, mouseY);

    drawAll(handHoverIndex, selectedHoverIndex);
  });

  window.canvas.addEventListener("mouseleave", () => drawAll(-1, -1));
}

//クリック時
export function mouseClick() {
  window.canvas.addEventListener("click", (e) => {
    const { x: mouseX, y: mouseY } = getMousePos(e);

    // 上段のカードがクリックされたかチェック
    const selectedClickedIndex = getSelectedCardIndexAtPos(mouseX, mouseY);
    // 下段のカードがクリックされたかチェック（これはホバー時にも使われている既存の関数）
    const handClickedIndex = getHandCardIndexAtPos(mouseX, mouseY);

    let needsRedraw = false; // 描画更新が必要かどうかのフラグ

    if (selectedClickedIndex >= 0) {
      // ========== 上段のカードがクリックされた場合 (選択解除) ==========
      const cardToMove = window.selectedCardList[selectedClickedIndex];

      // 選択リストから削除
      window.selectedCardList.splice(selectedClickedIndex, 1);

      // 下段のリストに復帰
      window.handCardList.push(cardToMove);

      needsRedraw = true;
    } else if (handClickedIndex >= 0) {
      //対象となるカード情報を取得
      const cardData = window.handCardList[handClickedIndex]; //元のカード情報

      if (!cardData || !cardData.img) return; // ← 念のため防御

      //選択リストに追加
      window.selectedCardList.push(cardData);

      // 下段から削除
      window.handCardList.splice(handClickedIndex, 1);

      needsRedraw = true;
    }

    // 描画更新が必要な場合のみ処理を実行
    if (needsRedraw) {
      // ✅ カード総数を更新
      window.totalCardCount = window.handCardList.length;

      // ⬇️ ⭐️ ここでカード列の再計算を呼び出す ⭐️ ⬇️
      calcCardCenterPosition();

      // === ソートを適用 ===
      sortCardByRank(window.selectedCardList);
      sortCardByRank(window.handCardList);
    }

    //描画
    drawAll(-1, -1);
  });

  // optional: canvas外に出たときは通常表示に戻す（mouseHover と同様）

  window.canvas.addEventListener("mouseleave", () => drawAll(-1, -1));
}

export function returnSelectedCardCount() {
  return window.selectedCardList.length;
}
