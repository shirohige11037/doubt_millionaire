/*
 * Card Animation and Drawing Script
 * * ⭐️ Configuration: Player 1 (front) and Player 2 (diagonal back)
 */

// ==================================================
// I. 外部公開関数 (Public API)
// ==================================================

/**
 * ランダムなカードデータを生成します。
 */
export const generateCardData = (count) => {
  const data = [];
  const suits = ["C", "D", "H", "S"];
  for (let i = 0; i < count; i++) {
    data.push({
      suit: suits[Math.floor(Math.random() * 4)],
      rank: Math.floor(Math.random() * 10) + 1,
    });
  }
  return data;
};

/**
 * Canvasとグローバル変数を初期化します。
 */
export function initCanvas(playerHandYOffset) {
  // 1. Canvas初期化
  window.canvas = document.getElementById("gameScene");
  if (!window.canvas) {
    console.error("Canvas element with ID 'gameScene' not found.");
    return;
  }
  window.ctx = window.canvas.getContext("2d");

  // 2. グローバルデータ初期化 (Global State)
  window.playerHandList = []; // P1 手札
  window.playedCardList = []; // 場札
  window.playerHandCardCount = 0;
  window.selectedCards = { p1: [], p2: [] }; // P1/P2 選択中カードリスト
  window.playerSelectedList = window.selectedCards.p1; // P1 選択中リストのエイリアス
  window.opponentCardLists = {}; // 相手 (P2) の手札枚数管理用

  // 3. Canvas/カードサイズ設定
  window.canvas.width = 500;
  window.canvas.height = 1000;
  const cardAsp = 208 / 142; // カードアスペクト比 (縦/横)
  const size = 60;
  window.cardWidth = size;
  window.cardHeight = size * cardAsp;
  window.OPPONENT_SCALE = 1.0; // 相手カードの縮尺
  window.opponentCardWidth = window.cardWidth * window.OPPONENT_SCALE;
  window.opponentCardHeight = window.cardHeight * window.OPPONENT_SCALE;

  // 4. 画像読み込み
  window.handRImage = new Image();
  window.handRImage.src = "./images/Others/Hand_R.png";
  window.handLImage = new Image();
  window.handLImage.src = "./images/Others/Hand_L.png";
  window.cardBackImg = new Image();
  window.cardBackImg.src = "./images/Trump/back.png";
  window.doubtImage = new Image(); // ダウト画像
  window.doubtImage.src = "./images/Others/Doubt.png";

  // 5. 手/ダウト画像サイズ設定
  const handSize = 120; // P1 手の基準サイズ
  window.handRImageWidth = handSize;
  window.handRImageHeight = handSize;
  const OPPONENT_HAND_RATIO = window.handRImageWidth / window.cardWidth;
  window.opponentHandWidth = window.opponentCardWidth * OPPONENT_HAND_RATIO;
  window.opponentHandHeight = window.opponentCardHeight * OPPONENT_HAND_RATIO;
  window.doubtImageWidth = window.canvas.width * 0.8;
  window.doubtImageHeight = window.canvas.width * 0.8;

  // 6. レイアウト/位置設定
  window.cardMargin = 30; // カード列の左右余白
  window.playerHandYOffset = 350; // P1 手札のYオフセット
  window.selectedCardCenterYOffset = 180; // 選択中カードのYオフセット
  window.playedCardCenterYOffset = 0; // 場札のYオフセット

  // P1/P2 手の静的な位置 (Canvas中央からのオフセット)
  window.handCenterXOffset = 0;
  window.handCenterYOffset = 450;
  window.handStaticRotation = 0;
  window.hand2CenterXOffset = 0;
  window.hand2CenterYOffset = -450;
  window.hand2StaticRotation = 180;

  // 7. アニメーション制御変数
  window.isAnimating = false;
  window.animationStartTime = 0;
  window.animationDuration = 500;
  window.cardsToAnimate = [];

  // 手アニメーション制御 (P1/P2)
  window.isHandRImageAnimating = false;
  window.handRImageStartTime = 0;
  window.isHand2RImageAnimating = false;
  window.hand2RImageStartTime = 0;

  // P1/P2 手のアニメーション軌道オフセット (Static Centerからの相対値)
  window.handRImage_startXOffset = 100;
  window.handRImage_startYOffset = 0;
  window.handRImage_endXOffset = 100;
  window.handRImage_endYOffset = 400;
  window.handRImageRotate = 0;
  window.hand2RImage_startXOffset = 100;
  window.hand2RImage_startYOffset = 0;
  window.hand2RImage_endXOffset = 100;
  window.hand2RImage_endYOffset = -400;
  window.hand2RImageRotate = 180;

  // ダウト演出制御
  window.isDoubtAnimating = false;
  window.doubtStartTime = 0;
  window.doubtDuration = 1000;
  window.doubtFlashCount = 5;

  window.animateAndDraw = animateAndDraw;
}

/**
 * Canvasの表示サイズを親要素に合わせて設定します。
 */
export function setDispSize() {
  const area = document.getElementById("area");
  const canvas = window.canvas;

  if (!area || !canvas) return;

  if (area.clientHeight * canvas.width > area.clientWidth * canvas.height) {
    window.canvasAspect = area.clientWidth / canvas.width;
    canvas.style.width = area.clientWidth + "px";
    canvas.style.height = (area.clientWidth * canvas.height / canvas.width) +
      "px";
  } else {
    window.canvasAspect = area.clientHeight / canvas.height;
    canvas.style.width = (area.clientHeight * canvas.width / canvas.height) +
      "px";
    canvas.style.height = area.clientHeight + "px";
  }
}

/**
 * プレイヤーの手札を初期化し、画像をプリロードします。
 */
export function initCard(playerCardData) {
  window.playerHandCardCount = playerCardData.length;
  const tempCardData = playerCardData.map((card) => ({
    suit: card.suit,
    rank: card.rank,
    imgSrc: getCardImagePath(card.suit, card.rank),
  }));
  sortCardByRank(tempCardData);

  const imagePromises = [];

  window.playerHandList = tempCardData.map((card) => {
    const img = new Image();
    img.src = card.imgSrc;
    const loadPromise = new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => {
        console.error(`Failed to load card image: ${card.imgSrc}`);
        resolve();
      };
      if (img.complete) resolve();
    });
    imagePromises.push(loadPromise);
    return { suit: card.suit, rank: card.rank, img: img };
  });

  // 画像ロード完了後、レイアウト計算と描画を開始
  Promise.all(imagePromises).then(() => {
    calculatePlayerCardLayout();
    animateAndDraw(-1, -1);
    console.log("Player cards loaded and initial draw performed.");
  });
}

/**
 * P1の選択中カードを場に出すアニメーションを開始します。
 */
export function playSelectedCard1() {
  playCardAnimation(1);
}

/**
 * P2のカードを場に出すアニメーションを開始します。
 * (カード枚数は index.html のデータに基づいて自動で循環)
 */
export function playSelectedCard2(cardCount = 1) {
  const p2Groups = window.playedCardGroups?.p2;
  const index = window.playedCardIndex?.p2 || 0;

  if (p2Groups && p2Groups[index]) {
    const nextCards = p2Groups[index];
    const count = nextCards.length;

    // P2の手札を減らす (シミュレーション)
    if (window.opponentCardLists.hand2) {
      window.opponentCardLists.hand2.splice(
        window.opponentCardLists.hand2.length - count,
        count,
      );
    }

    window.playedCardIndex.p2 = (index + 1) % p2Groups.length;
    playCardAnimation(2, count);
  } else {
    console.log("P2: 次に場に出すカードグループがありません。");
    playCardAnimation(2, 1);
  }
}

/**
 * 外部から場札を追加します。
 */
export function setPlayedCard(playedCardRawData) {
  const cardListWithImages = playedCardRawData.map((card) => {
    const img = new Image();
    img.src = getCardImagePath(card.suit, card.rank);
    return {
      suit: card.suit,
      rank: card.rank,
      img: img,
      offsetX: undefined,
      offsetY: undefined,
      rotation: undefined,
      isOpponent: false,
      playerNum: 1,
    };
  });
  window.playedCardList = window.playedCardList.concat(cardListWithImages);
  animateAndDraw(-1, -1);
}

/**
 * ダウト演出を開始します。
 */
export function startDoubtEffect() {
  if (window.isDoubtAnimating) return;
  window.isDoubtAnimating = true;
  window.doubtStartTime = Date.now();
  animateAndDraw();
  console.log("Doubt effect started.");
}

// ==================================================
// II. マウス/イベント処理 (Mouse/Events)
// ==================================================

export function mouseHover() {
  window.canvas.addEventListener("mousemove", (e) => {
    const { x: mouseX, y: mouseY } = getMousePos(e);
    const fixedSelectedY = window.canvas.height / 2 +
      window.selectedCardCenterYOffset;
    const selectedClickedIndexAtFixedY = getSelectedCardIndexAtFixedY(
      mouseX,
      mouseY,
      fixedSelectedY,
    );

    const handHoverIndex = selectedClickedIndexAtFixedY >= 0
      ? -1
      : getHandCardIndexAtPos(mouseX, mouseY);

    animateAndDraw(handHoverIndex, selectedClickedIndexAtFixedY);
  });
  window.canvas.addEventListener("mouseleave", () => animateAndDraw(-1, -1));
}

export function mouseClick() {
  // 右クリック (選択中/手札のカードを場に出す)
  window.canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (window.isAnimating) return;

    const { x: mouseX, y: mouseY } = getMousePos(e);
    const fixedSelectedY = window.canvas.height / 2 +
      window.selectedCardCenterYOffset;
    const selectedClickedIndex = getSelectedCardIndexAtFixedY(
      mouseX,
      mouseY,
      fixedSelectedY,
    );
    const handClickedIndex = selectedClickedIndex >= 0
      ? -1
      : getHandCardIndexAtPos(mouseX, mouseY);

    let cardToMove = null;
    const p1Selected = window.playerSelectedList;

    if (selectedClickedIndex >= 0) {
      cardToMove = p1Selected[selectedClickedIndex];
      p1Selected.splice(selectedClickedIndex, 1);
    } else if (handClickedIndex >= 0) {
      cardToMove = window.playerHandList[handClickedIndex];
      if (!cardToMove || !cardToMove.img) return;
      window.playerHandList.splice(handClickedIndex, 1);
    }

    if (cardToMove) {
      cardToMove.offsetX = undefined;
      cardToMove.offsetY = undefined;
      cardToMove.rotation = undefined;
      cardToMove.isOpponent = false;
      cardToMove.playerNum = 1;
      window.playedCardList.push(cardToMove);

      updateCardLayout(true);
      animateAndDraw(-1, -1);
    }
  });

  // 左クリック (手札 ↔ 選択中 の移動)
  window.canvas.addEventListener("click", (e) => {
    if (window.isAnimating) return;

    const { x: mouseX, y: mouseY } = getMousePos(e);
    const fixedSelectedY = window.canvas.height / 2 +
      window.selectedCardCenterYOffset;
    const selectedClickedIndex = getSelectedCardIndexAtFixedY(
      mouseX,
      mouseY,
      fixedSelectedY,
    );
    const handClickedIndex = selectedClickedIndex >= 0
      ? -1
      : getHandCardIndexAtPos(mouseX, mouseY);

    let cardToMove = null;
    let targetList = null;
    const p1Selected = window.playerSelectedList;

    if (selectedClickedIndex >= 0) {
      cardToMove = p1Selected[selectedClickedIndex];
      p1Selected.splice(selectedClickedIndex, 1);
      targetList = window.playerHandList;
    } else if (handClickedIndex >= 0) {
      cardToMove = window.playerHandList[handClickedIndex];
      if (!cardToMove || !cardToMove.img) return;
      window.playerHandList.splice(handClickedIndex, 1);
      targetList = p1Selected;
    }

    if (cardToMove) {
      targetList.push(cardToMove);
      updateCardLayout(true);
      animateAndDraw(-1, -1);
    }
  });
}

// ==================================================
// III. 描画/アニメーション (Drawing/Animation)
// ==================================================

/**
 * P1またはP2のカードを場に出すアニメーションを開始します。
 */
function playCardAnimation(playerNum, cardCount = 1) {
  if (
    window.isAnimating || window.isHandRImageAnimating ||
    window.isHand2RImageAnimating
  ) {
    console.log("アニメーション中です。");
    return;
  }

  let sourceList;
  if (playerNum === 1) {
    sourceList = window.playerSelectedList;
    if (sourceList.length === 0) {
      console.log("カードが選択されていません。");
      return;
    }
    window.isHandRImageAnimating = true;
  } else if (playerNum === 2) {
    if (cardCount <= 0) return;

    // P2の選択中カードとしてダミーを生成
    const dummyCards = Array.from({ length: cardCount }).map(() => ({
      suit: "S",
      rank: 1,
      img: window.cardBackImg,
    }));
    window.selectedCards.p2.length = 0;
    window.selectedCards.p2.push(...dummyCards);
    sourceList = window.selectedCards.p2;
    window.isHand2RImageAnimating = true;
  } else {
    return;
  }

  window.cardsToAnimate = sourceList.map((card) => ({
    ...card,
    isOpponent: playerNum === 2,
    playerNum: playerNum,
  }));
  sourceList.length = 0;

  // アニメーション開始処理
  window.isAnimating = true;
  window.animationStartTime = Date.now();
  if (playerNum === 1) {
    window.handRImageStartTime = Date.now();
  } else if (playerNum === 2) {
    window.hand2RImageStartTime = Date.now();
  }

  // アニメーション用の初期パラメータ設定 (ランダムなオフセットと回転)
  window.cardsToAnimate.forEach((card) => {
    const MAX_OFFSET = 30;
    const MAX_ROTATION = 30;
    card.offsetX = (Math.random() * 2 - 1) * MAX_OFFSET;
    card.offsetY = (Math.random() * 2 - 1) * MAX_OFFSET;
    card.rotation = (Math.random() * 2 - 1) * MAX_ROTATION * Math.PI / 180;
  });

  animateAndDraw();
}

/**
 * シーン全体を静的に描画します。（手を除く）
 */
export function drawSceneExcludingHands(
  handHighlightIndex = -1,
  selectedHighlightIndex = -1,
) {
  resetStyle();
  drawBackground();
  drawCardRows(handHighlightIndex, selectedHighlightIndex);
}

/**
 * 互換性のためのラッパー関数。
 */
export function drawScene(...args) {
  return drawSceneExcludingHands(...args);
}

/**
 * メインアニメーションループ。状態を更新し、シーン全体を描画します。
 */
function animateAndDraw(handHighlightIndex = -1, selectedHighlightIndex = -1) {
  let cardAnimationProgress = 0;
  let hand1AnimationProgress = 0;
  let hand2AnimationProgress = 0;
  let doubtAnimationProgress = 0;

  // 1. 進捗計算
  const now = Date.now();

  if (window.isAnimating) {
    const elapsed = now - window.animationStartTime;
    cardAnimationProgress = Math.min(1, elapsed / window.animationDuration);

    if (cardAnimationProgress >= 1) {
      window.isAnimating = false;
      // アニメーション終了時に場札に追加
      window.playedCardList.push(...window.cardsToAnimate.map((card) => {
        const MAX_OFFSET = 30;
        card.offsetX = (Math.random() * 2 - 1) * MAX_OFFSET;
        card.offsetY = (Math.random() * 2 - 1) * MAX_OFFSET;
        card.rotation = (Math.random() * 2 - 1) * 30 * Math.PI / 180;
        return card;
      }));
      window.cardsToAnimate.length = 0;
      updateCardLayout(false);
    }
  }

  if (window.isHandRImageAnimating) {
    hand1AnimationProgress = Math.min(
      1,
      (now - window.handRImageStartTime) / window.animationDuration,
    );
  }
  if (window.isHand2RImageAnimating) {
    hand2AnimationProgress = Math.min(
      1,
      (now - window.hand2RImageStartTime) / window.animationDuration,
    );
  }
  if (window.isDoubtAnimating) {
    doubtAnimationProgress = Math.min(
      1,
      (now - window.doubtStartTime) / window.doubtDuration,
    );
    if (doubtAnimationProgress >= 1) {
      window.isDoubtAnimating = false;
    }
  }

  // 2. 描画順序 (奥から手前へ)
  drawSceneExcludingHands(handHighlightIndex, selectedHighlightIndex); // 背景/カード列

  if (window.cardsToAnimate.length > 0) { // アニメーション中のカード
    drawAnimatedCards(cardAnimationProgress);
  }

  drawStaticHands(); // 静的な手

  // アニメーション中の手
  if (window.isHandRImageAnimating) {
    drawHandRImageAnimation(hand1AnimationProgress);
  }
  if (window.isHand2RImageAnimating) {
    drawHand2RImageAnimation(hand2AnimationProgress);
  }

  if (window.isDoubtAnimating) { // ダウト演出 (最前面)
    drawDoubtImageEffect(doubtAnimationProgress);
  }

  // 3. ループ継続判定
  if (
    window.isAnimating ||
    window.isHandRImageAnimating ||
    window.isHand2RImageAnimating ||
    window.isDoubtAnimating
  ) {
    requestAnimationFrame(() =>
      animateAndDraw(handHighlightIndex, selectedHighlightIndex)
    );
  }
}

// --------------------------------------------------
// 描画ヘルパー関数 (Drawing Helpers)
// --------------------------------------------------

function resetStyle() {
  window.ctx.clearRect(0, 0, window.canvas.width, window.canvas.height);
  window.ctx.filter = "none";
}

function drawBackground() {
  window.ctx.fillStyle = "#31a147ff";
  window.ctx.fillRect(0, 0, window.canvas.width, window.canvas.height);
}

/**
 * すべてのカード列 (手札、選択中、場札) を描画します。
 */
function drawCardRows(handHighlightIndex, selectedHighlightIndex) {
  drawHandCardRow(handHighlightIndex);
  drawSelectedCardRow(selectedHighlightIndex);

  // P2 選択中カード (アニメーションの開始位置としてのみ使用)
  drawOpponentSelectedCardRow(
    2,
    window.hand2CenterXOffset,
    window.hand2CenterYOffset + window.hand2RImage_endYOffset,
    window.hand2StaticRotation,
  );

  drawPlayedCardRow(); // 場のカード
}

function drawHandCardRow(handHighlightIndex = -1) {
  for (let i = 0; i < window.playerHandCardCount; i++) {
    const card = window.playerHandList[i];
    const x = window.cardStartX +
      i * (window.cardWidth + window.handCardSpacing);
    const y = window.cardStartY;
    window.ctx.drawImage(card.img, x, y, window.cardWidth, window.cardHeight);

    if (i === handHighlightIndex) {
      window.ctx.fillStyle = "#48484888";
      window.ctx.fillRect(x, y, window.cardWidth, window.cardHeight);
    }
  }
}

function drawSelectedCardRow(selectedHighlightIndex = -1) {
  const p1Selected = window.playerSelectedList;
  const selectedY = (window.canvas.height / 2) +
    window.selectedCardCenterYOffset;
  const totalSelected = p1Selected.length;
  const selectedSpacing = calcCardSpacing(totalSelected, window.cardWidth);

  const totalCardWidth = totalSelected * window.cardWidth +
    (totalSelected > 0 ? (totalSelected - 1) * selectedSpacing : 0);
  const startX = (window.canvas.width - totalCardWidth) / 2;

  for (let i = 0; i < totalSelected; i++) {
    const x = startX + i * (window.cardWidth + selectedSpacing);
    const y = selectedY;
    const img = p1Selected[i].img;

    window.ctx.drawImage(img, x, y, window.cardWidth, window.cardHeight);

    if (i === selectedHighlightIndex) {
      window.ctx.fillStyle = "#48484888";
      window.ctx.fillRect(x, y, window.cardWidth, window.cardHeight);
    }
  }
}

/**
 * 相手プレイヤーの選択中カード列 (裏向き) を描画します。
 */
function drawOpponentSelectedCardRow(
  playerNum,
  centerXOffset,
  centerYOffset,
  rotation,
) {
  const cardList = window.selectedCards[`p${playerNum}`];
  if (cardList.length === 0) return;

  for (let i = 0; i < cardList.length; i++) {
    const { x, y, width, height } = calcCardPosition(
      cardList,
      i,
      centerXOffset,
      centerYOffset,
      rotation,
      true, // isOpponent
    );
    const imgToDraw = window.cardBackImg;

    window.ctx.save();
    window.ctx.translate(x + width / 2, y + height / 2);
    window.ctx.rotate(rotation * Math.PI / 180);
    window.ctx.drawImage(
      imgToDraw,
      -width / 2,
      -height / 2,
      width,
      height,
    );
    window.ctx.restore();
  }
}

function drawPlayedCardRow() {
  const playedY_Base = window.canvas.height / 2 +
    window.playedCardCenterYOffset;
  const totalPlayed = window.playedCardList.length;
  if (totalPlayed === 0) return;

  const startX_Base = (window.canvas.width - window.cardWidth) / 2;
  const MAX_OFFSET = 30;

  for (let i = 0; i < totalPlayed; i++) {
    const card = window.playedCardList[i];
    const isTopCard = i === totalPlayed - 1;
    const imgToDraw = isTopCard ? card.img : window.cardBackImg;

    if (card.offsetX === undefined) {
      card.offsetX = (Math.random() * 2 - 1) * MAX_OFFSET;
      card.offsetY = (Math.random() * 2 - 1) * MAX_OFFSET;
      card.rotation = (Math.random() * 2 - 1) * 30 * Math.PI / 180;
    }

    const finalX = startX_Base + card.offsetX;
    const finalY = playedY_Base + card.offsetY;

    window.ctx.save();
    window.ctx.translate(
      finalX + window.cardWidth / 2,
      finalY + window.cardHeight / 2,
    );
    window.ctx.rotate(card.rotation);
    window.ctx.drawImage(
      imgToDraw,
      -window.cardWidth / 2,
      -window.cardHeight / 2,
      window.cardWidth,
      window.cardHeight,
    );
    window.ctx.restore();
  }
}

/**
 * P1/P2の静的な左右の手を描画します。
 */
function drawStaticHands() {
  const canvasCenterX = window.canvas.width / 2;
  const canvasCenterY = window.canvas.height / 2;
  const separationDistanceFixed = window.handRImageWidth * 0.9;
  const separationX_Fixed = separationDistanceFixed;
  const separationY_Fixed = 0;

  // P2 手の描画 (左右を入れ替え)
  const x2 = canvasCenterX + window.hand2CenterXOffset;
  const y2 = canvasCenterY + window.hand2CenterYOffset;
  const rotation2 = window.hand2StaticRotation;
  const handWidth2 = window.handRImageWidth;
  const handHeight2 = window.handRImageHeight;

  // P2 右手の画像 (アニメーションで消える手)
  if (!window.isHand2RImageAnimating) {
    drawSingleHand(
      window.handRImage,
      x2 - separationX_Fixed, // 画面上 左側 へ
      y2 - separationY_Fixed,
      rotation2,
      handWidth2,
      handHeight2,
    );
  }
  // P2 左手の画像 (常に描画される手)
  drawSingleHand(
    window.handLImage,
    x2 + separationX_Fixed, // 画面上 右側 へ
    y2 + separationY_Fixed,
    rotation2,
    handWidth2,
    handHeight2,
  );

  // P1 手の描画
  const x1 = canvasCenterX + window.handCenterXOffset;
  const y1 = canvasCenterY + window.handCenterYOffset;
  const rotation1 = window.handStaticRotation;
  const handWidth1 = window.handRImageWidth;
  const handHeight1 = window.handRImageHeight;

  // P1 左手 (常に描画される手)
  drawSingleHand(
    window.handLImage,
    x1 - separationX_Fixed,
    y1 - separationY_Fixed,
    rotation1,
    handWidth1,
    handHeight1,
  );
  // P1 右手 (アニメーションで消える手)
  if (!window.isHandRImageAnimating) {
    drawSingleHand(
      window.handRImage,
      x1 + separationX_Fixed,
      y1 + separationY_Fixed,
      rotation1,
      handWidth1,
      handHeight1,
    );
  }
}

/**
 * 回転と位置を指定して単一の手の画像をCanvasに描画します。
 */
function drawSingleHand(img, x, y, rotation, width, height) {
  window.ctx.save();
  window.ctx.translate(x, y);
  window.ctx.rotate(rotation * Math.PI / 180);
  window.ctx.drawImage(
    img,
    -width / 2,
    -height / 2,
    width,
    height,
  );
  window.ctx.restore();
}

/**
 * P1/P2が場に出すカードのアニメーションを描画します。
 */
function drawAnimatedCards(progress) {
  const endY_Base = window.canvas.height / 2 + window.playedCardCenterYOffset;
  const startX_Base = (window.canvas.width - window.cardWidth) / 2;

  window.cardsToAnimate.forEach((card, i) => {
    let startX, startY;
    const playerNum = card.playerNum;
    const totalCardsToAnimate = window.cardsToAnimate.length;

    const startCardWidth = playerNum === 1
      ? window.cardWidth
      : window.opponentCardWidth;
    const startCardHeight = playerNum === 1
      ? window.cardHeight
      : window.opponentCardHeight;

    // 開始位置計算 (P1: 選択中カードの位置, P2: 手の終了位置)
    if (playerNum === 1) {
      startY = (window.canvas.height / 2) + window.selectedCardCenterYOffset;
      const selectedSpacing = calcCardSpacing(
        totalCardsToAnimate,
        window.cardWidth,
      );
      const totalCardWidth = totalCardsToAnimate * window.cardWidth +
        (totalCardsToAnimate > 0
          ? (totalCardsToAnimate - 1) * selectedSpacing
          : 0);
      const startX_Selected = (window.canvas.width - totalCardWidth) / 2;
      startX = startX_Selected + i * (window.cardWidth + selectedSpacing);
    } else {
      let centerXOffset = window.hand2CenterXOffset;
      let centerYOffset = window.hand2CenterYOffset +
        window.hand2RImage_endYOffset;
      let rotation = window.hand2StaticRotation;

      const pos = calcCardPosition(
        window.cardsToAnimate,
        i,
        centerXOffset,
        centerYOffset,
        rotation,
        true,
      );
      startX = pos.x;
      startY = pos.y;
    }

    // 終点 (場札の位置)
    const endX = startX_Base + card.offsetX;
    const endY = endY_Base + card.offsetY;
    const endRotation = card.rotation;
    const startRotation = playerNum === 2
      ? window.hand2StaticRotation * Math.PI / 180
      : 0;

    // 補間
    const currentX = startX + (endX - startX) * progress;
    const currentY = startY + (endY - startY) * progress;
    // P2のカード回転補間を修正 (180度からendRotationへ)
    const currentRotationFixed = startRotation +
      (endRotation - startRotation) * progress;

    // サイズ補間 (P2: 相手サイズ -> P1サイズ, P1: P1サイズを維持)
    const currentCardWidth = startCardWidth +
      (window.cardWidth - startCardWidth) * progress;
    const currentCardHeight = startCardHeight +
      (window.cardHeight - startCardHeight) * progress;

    const imgToDraw = playerNum === 2 ? window.cardBackImg : card.img;

    window.ctx.save();
    window.ctx.translate(
      currentX + currentCardWidth / 2,
      currentY + currentCardHeight / 2,
    );
    window.ctx.rotate(currentRotationFixed);
    window.ctx.drawImage(
      imgToDraw,
      -currentCardWidth / 2,
      -currentCardHeight / 2,
      currentCardWidth,
      currentCardHeight,
    );
    window.ctx.restore();
  });
}

/**
 * P1の右手アニメーションを描画します。
 */
function drawHandRImageAnimation(handRImageProgress) {
  if (!window.handRImage.complete || window.handRImage.naturalWidth === 0) {
    return;
  }

  const handWidth = window.handRImageWidth;
  const handHeight = window.handRImageHeight;
  const canvasCenterX = window.canvas.width / 2;
  const canvasCenterY = window.canvas.height / 2;

  const staticRHandX = canvasCenterX + window.handCenterXOffset;
  const staticRHandY = canvasCenterY + window.handCenterYOffset;
  const rotation = window.handRImageRotate;

  // 開始/終了位置
  const startX_Base = staticRHandX + window.handRImage_startXOffset;
  const startY_Base = staticRHandY - window.handRImage_startYOffset;
  const endX_Base = staticRHandX + window.handRImage_endXOffset;
  const endY_Base = staticRHandY - window.handRImage_endYOffset;

  // 補間
  const currentX = startX_Base + (endX_Base - startX_Base) * handRImageProgress;
  const currentY = startY_Base + (endY_Base - startY_Base) * handRImageProgress;

  drawSingleHand(
    window.handRImage,
    currentX,
    currentY,
    rotation,
    handWidth,
    handHeight,
  );

  if (handRImageProgress >= 1) {
    window.isHandRImageAnimating = false;
    if (!window.isAnimating) {
      animateAndDraw();
    }
  }
}

/**
 * P2の右手アニメーションを描画します。 (回転を考慮した座標変換あり)
 */
function drawHand2RImageAnimation(hand2RImageProgress) {
  if (!window.handRImage.complete || window.handRImage.naturalWidth === 0) {
    return;
  }

  const handWidth = window.handRImageWidth;
  const handHeight = window.handRImageHeight;
  const canvasCenterX = window.canvas.width / 2;
  const canvasCenterY = window.canvas.height / 2;

  const staticRHandX = canvasCenterX + window.hand2CenterXOffset;
  const staticRHandY = canvasCenterY + window.hand2CenterYOffset;
  const rotation = window.hand2RImageRotate;
  const rotationRad = rotation * Math.PI / 180;

  const startOffsetX = window.hand2RImage_startXOffset;
  const startOffsetY = window.hand2RImage_startYOffset;
  const endOffsetX = window.hand2RImage_endXOffset;
  const endOffsetY = window.hand2RImage_endYOffset;

  // オフセットの回転変換
  const rotatedStartOffsetX = startOffsetX * Math.cos(rotationRad) -
    startOffsetY * Math.sin(rotationRad);
  const rotatedStartOffsetY = startOffsetX * Math.sin(rotationRad) +
    startOffsetY * Math.cos(rotationRad);
  const rotatedEndOffsetX = endOffsetX * Math.cos(rotationRad) -
    endOffsetY * Math.sin(rotationRad);
  const rotatedEndOffsetY = endOffsetX * Math.sin(rotationRad) +
    endOffsetY * Math.cos(rotationRad);

  // 開始/終了位置
  const startX_Base = staticRHandX + rotatedStartOffsetX;
  const startY_Base = staticRHandY + rotatedStartOffsetY;
  const endX_Base = staticRHandX + rotatedEndOffsetX;
  const endY_Base = staticRHandY + rotatedEndOffsetY;

  // 補間
  const currentX = startX_Base +
    (endX_Base - startX_Base) * hand2RImageProgress;
  const currentY = startY_Base +
    (endY_Base - startY_Base) * hand2RImageProgress;

  drawSingleHand(
    window.handRImage,
    currentX,
    currentY,
    rotation,
    handWidth,
    handHeight,
  );

  if (hand2RImageProgress >= 1) {
    window.isHand2RImageAnimating = false;
    if (!window.isAnimating) {
      animateAndDraw();
    }
  }
}

/**
 * ダウト画像を点滅描画します。
 */
function drawDoubtImageEffect(progress) {
  if (!window.doubtImage.complete || window.doubtImage.naturalWidth === 0) {
    return;
  }

  // 点滅 (0.5 から 1.0 の範囲で変動) と徐々にフェードアウト
  const sinValue = Math.sin(progress * window.doubtFlashCount * 2 * Math.PI);
  const alpha = (sinValue * 0.25 + 0.75) * (1 - progress);

  if (alpha <= 0) return;

  const x = (window.canvas.width - window.doubtImageWidth) / 2;
  const y = (window.canvas.height - window.doubtImageHeight) / 2;

  window.ctx.save();
  window.ctx.globalAlpha = alpha;
  window.ctx.drawImage(
    window.doubtImage,
    x,
    y,
    window.doubtImageWidth,
    window.doubtImageHeight,
  );
  window.ctx.restore();
}

// ==================================================
// IV. ユーティリティ/レイアウトヘルパー (Utility/Layout Helpers)
// ==================================================

/**
 * 手札や選択中カードのレイアウトを更新し、必要に応じてソートします。
 */
function updateCardLayout(needsSort) {
  window.playerHandCardCount = window.playerHandList.length;
  calculatePlayerCardLayout();
  if (needsSort) {
    sortCardByRank(window.playerSelectedList);
    sortCardByRank(window.playerHandList);
  }
}

/**
 * カードの間隔を計算します。（カード枚数が多いほど狭くなる）
 */
function calcCardSpacing(cardCount, cardWidth) {
  if (cardCount <= 1) return 0;
  const minSpacing = -3;
  const maxSpacing = 0.6;
  const maxCards = 15;
  const t = Math.min(cardCount - 1, maxCards - 1) / (maxCards - 1);
  let spacing = maxSpacing * (1 - t) + minSpacing * t;

  const availableWidth = window.canvas.width - window.cardMargin * 2;
  const requiredWidth = cardWidth * cardCount + spacing * (cardCount - 1);

  if (requiredWidth > availableWidth) {
    spacing = (availableWidth - cardWidth * cardCount) / (cardCount - 1);
  }
  return spacing;
}

/**
 * プレイヤーの手札の開始位置と間隔を計算します。
 */
function calculatePlayerCardLayout() {
  window.handCardSpacing = calcCardSpacing(
    window.playerHandCardCount,
    window.cardWidth,
  );

  const totalCardWidth = window.playerHandCardCount > 1
    ? window.playerHandCardCount * window.cardWidth +
      (window.playerHandCardCount - 1) * window.handCardSpacing
    : window.cardWidth;

  const availableWidthWithMargin = window.canvas.width - window.cardMargin * 2;

  window.cardStartX = (totalCardWidth > availableWidthWithMargin)
    ? window.cardMargin
    : (window.canvas.width - totalCardWidth) / 2;

  window.cardStartY = (window.canvas.height / 2) + window.playerHandYOffset;
}

/**
 * ランクに基づいてカードリストをソートします。
 */
function sortCardByRank(cardList) {
  const customOrder = [3, 4, 5, 6, 7, 8, 9, 10, 1, 2];
  cardList.sort((a, b) =>
    customOrder.indexOf(a.rank) - customOrder.indexOf(b.rank)
  );
}

/**
 * カード画像のファイルパスを取得します。
 */
function getCardImagePath(suit, rank) {
  return `./images/Trump/${suit}_${rank}.png`;
}

/**
 * マウスのCanvas座標を取得します。
 */
function getMousePos(e) {
  const rect = window.canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / window.canvasAspect) *
    (window.canvas.width / 500);
  const y = ((e.clientY - rect.top) / window.canvasAspect) *
    (window.canvas.height / 1000);
  return { x: x, y: y };
}

/**
 * 固定されたY座標で選択中カードのインデックスを取得します。
 */
function getSelectedCardIndexAtFixedY(x, y, fixedSelectedY) {
  const p1Selected = window.playerSelectedList;
  if (p1Selected.length === 0) return -1;

  const totalSelected = p1Selected.length;
  const selectedSpacing = calcCardSpacing(totalSelected, window.cardWidth);

  const totalCardWidth = totalSelected * window.cardWidth +
    (totalSelected > 0 ? (totalSelected - 1) * selectedSpacing : 0);
  const startX = (window.canvas.width - totalCardWidth) / 2;

  const endX = startX + totalCardWidth;
  const endY = fixedSelectedY + window.cardHeight;

  if (x < startX || x > endX || y < fixedSelectedY || y > endY) {
    return -1;
  }

  for (let i = 0; i < totalSelected; i++) {
    const cardX = startX + i * (window.cardWidth + selectedSpacing);
    const nextCardX = cardX + window.cardWidth + selectedSpacing;
    const currentEnd = (i === totalSelected - 1)
      ? cardX + window.cardWidth
      : nextCardX;

    if (x >= cardX && x <= currentEnd) {
      return i;
    }
  }
  return -1;
}

/**
 * マウス座標から手札のカードインデックスを取得します。
 */
function getHandCardIndexAtPos(x, y) {
  if (window.playerHandList.length === 0) return -1;

  const startX = window.cardStartX;
  const endX = startX +
    window.playerHandCardCount * window.cardWidth +
    (window.playerHandCardCount - 1) * window.handCardSpacing;
  const startY = window.cardStartY;
  const endY = startY + window.cardHeight;

  if (x < startX || x > endX || y < startY || y > endY) {
    return -1;
  }

  for (let i = 0; i < window.playerHandCardCount; i++) {
    const cardX = startX + i * (window.cardWidth + window.handCardSpacing);
    const nextCardX = cardX + window.cardWidth + window.handCardSpacing;
    const currentEnd = (i === window.playerHandCardCount - 1)
      ? cardX + window.cardWidth
      : nextCardX;

    if (x >= cardX && x <= currentEnd) {
      return i;
    }
  }
  return -1;
}

/**
 * 相手のカードの回転されたCanvas座標(左上)を計算します。
 */
function calcCardPosition(
  cardList,
  cardIndex,
  centerXOffset,
  centerYOffset,
  rotation,
  isOpponent = false,
) {
  const canvasCenterX = window.canvas.width / 2;
  const canvasCenterY = window.canvas.height / 2;
  const cardWidth = isOpponent ? window.opponentCardWidth : window.cardWidth;
  const cardHeight = isOpponent ? window.opponentCardHeight : window.cardHeight;
  const { spacing } = calcOpponentCardCenterPosition(cardList.length);
  const totalCardWidth = cardList.length * cardWidth +
    (cardList.length - 1) * spacing;

  const rotationCenterX = canvasCenterX + centerXOffset;
  const rotationCenterY = canvasCenterY + centerYOffset;
  const rotationRad = rotation * Math.PI / 180;

  const drawStartX = -totalCardWidth / 2;
  const cardRelativeX = drawStartX + cardIndex * (cardWidth + spacing);
  const cardRelativeY = -cardHeight / 2;

  const rotX = cardRelativeX + cardWidth / 2;
  const rotY = cardRelativeY + cardHeight / 2;

  // 回転変換
  const transformedX = rotationCenterX + rotX * Math.cos(rotationRad) -
    rotY * Math.sin(rotationRad);
  const transformedY = rotationCenterY + rotX * Math.sin(rotationRad) +
    rotY * Math.cos(rotationRad);

  const finalX = transformedX - cardWidth / 2;
  const finalY = transformedY - cardHeight / 2;

  return { x: finalX, y: finalY, width: cardWidth, height: cardHeight };
}

/**
 * 相手カード列の描画に必要な中央位置と間隔を計算します。
 */
function calcOpponentCardCenterPosition(cardCount) {
  if (cardCount === 0) {
    return {
      startX: 0,
      spacing: 0,
      cardWidth: window.opponentCardWidth,
      cardHeight: window.opponentCardHeight,
    };
  }
  const cardWidth = window.opponentCardWidth;
  const cardHeight = window.opponentCardHeight;
  const spacing = calcCardSpacing(cardCount, cardWidth);
  const totalCardWidth = cardCount * cardWidth + (cardCount - 1) * spacing;
  const startX = (window.canvas.width - totalCardWidth) / 2;

  return { startX, spacing, cardWidth, cardHeight };
}
