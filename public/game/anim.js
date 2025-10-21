/*
 * カードアニメーションと描画を行うスクリプト
 *
 * ⭐️ プレイヤー1 (手前) と相手プレイヤー2 (対角奥) の2名構成
 */

//==================================================
// 外部公開関数 (Public Functions)
//==================================================

/**
 * 外部ファイル (index.html) の初期化処理で使うため公開
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

export function initCanvas(playerHandYOffset) {
  // Canvas初期化
  window.canvas = document.getElementById("gameScene");
  // 最初の 'getContext' エラー対策: nullチェックを追加 (DOMが完全にロードされることを想定)
  if (!window.canvas) {
    console.error("Canvas element with ID 'gameScene' not found.");
    return;
  }
  window.ctx = window.canvas.getContext("2d");

  // データリスト (Global Data)
  window.playerHandList = []; // プレイヤー1の手札
  window.playedCardList = []; // 場に出たカード
  window.playerHandCardCount = 0;

  // 選択中カードリスト (P1, P2のみ)
  window.selectedCards = {
    p1: [],
    p2: [], // P2のみ残す
  };
  // P1選択中カードリストのエイリアスを定義
  window.playerSelectedList = window.selectedCards.p1;

  // 相手の手札リスト (P2のみ)
  // グローバル変数エラー対策: オブジェクトを明示的に初期化
  window.opponentCardLists = {};

  // Canvasサイズ
  window.canvas.width = 500;
  window.canvas.height = 1000;

  // プレイヤーのカードサイズ (基準サイズ)
  const cardAsp = 208 / 142; // アスペクト比 (縦/横)
  const size = 60;
  window.cardWidth = size;
  window.cardHeight = size * cardAsp;

  // 相手のカードの縮尺設定
  window.OPPONENT_SCALE = 1.0;
  window.opponentCardWidth = window.cardWidth * window.OPPONENT_SCALE;
  window.opponentCardHeight = window.cardHeight * window.OPPONENT_SCALE;

  // 画像読み込み
  window.handRImage = new Image();
  window.handRImage.src = "./images/Others/Hand_R.png";
  window.handLImage = new Image();
  window.handLImage.src = "./images/Others/Hand_L.png";
  window.cardBackImg = new Image();
  window.cardBackImg.src = "./images/Trump/back.png";

  // 手の画像サイズ設定
  const handSize = 120; // プレイヤー1用の手の固定サイズ (基準サイズ)
  window.handRImageWidth = handSize;
  window.handRImageHeight = handSize;

  // 相手プレイヤー用の手のサイズとカードに対する相対的な縮小率
  const OPPONENT_HAND_RATIO = window.handRImageWidth / window.cardWidth;
  window.opponentHandWidth = window.opponentCardWidth * OPPONENT_HAND_RATIO;
  window.opponentHandHeight = window.opponentCardHeight * OPPONENT_HAND_RATIO;

  // プレイヤー/相手の手の位置と回転設定 (Canvas中央からの相対オフセット)
  window.handCenterXOffset = 0;
  window.handCenterYOffset = 450;
  window.handStaticRotation = 0;

  // プレイヤー2の設定を対角奥中央に変更
  window.hand2CenterXOffset = 0;
  window.hand2CenterYOffset = -450;
  window.hand2StaticRotation = 180; // 回転 (180度で逆さま)

  // レイアウト設定
  window.cardMargin = 30; // カード列の左右の余白
  // ⭐️ 修正: 手札の位置 (Canvas中央Yからのオフセット)
  window.playerHandYOffset = 350;

  // ⭐️ 修正: 選択されたカードの位置をCanvas中央からの固定オフセットで定義
  window.selectedCardCenterYOffset = 180; // Canvas中央Y + 180 (手札より中央寄り)

  //window.selectedCardY = 400; // (アニメーションのオフセットとして保持)
  // 場のカードの位置をCanvas垂直中央基準で設定
  window.playedCardCenterYOffset = 0; // 場のカードの位置 (Canvas中央Yからのオフセット)

  // アニメーション制御変数
  window.isAnimating = false;
  window.animationStartTime = 0;
  window.animationDuration = 500;
  window.cardsToAnimate = [];

  // P1 右手アニメーション
  window.isHandRImageAnimating = false;
  window.handRImageStartTime = 0;

  // P2 右手アニメーション
  window.isHand2RImageAnimating = false;
  window.hand2RImageStartTime = 0;

  // P1 右手のアニメーション設定 (静的な手の位置から、カード列の位置へ移動)
  window.handRImage_startXOffset = 100;
  window.handRImage_startYOffset = 0;
  window.handRImage_endXOffset = 100;
  window.handRImage_endYOffset = 400; // selectedCardYはオフセットとして利用
  window.handRImageRotate = 0;

  // P2 右手のアニメーション設定 (静的な手の位置から、カードを出す位置へ移動)
  window.hand2RImage_startXOffset = 100;
  window.hand2RImage_startYOffset = 0;
  window.hand2RImage_endXOffset = 100;
  // ⭐️ 修正: P2の手アニメーションの終了Yオフセットをより下（画面中央寄り）に調整
  window.hand2RImage_endYOffset = -400; // -270 に設定
  window.hand2RImageRotate = 180; // P2は常に180度回転

  window.animateAndDraw = animateAndDraw;
}

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

export function initCard(playerCardData) {
  window.playerHandCardCount = playerCardData.length;
  // calculatePlayerCardLayout(); // 読み込み完了後に移動

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

    // ⭐️ 修正: 画像の読み込み完了を待つPromiseを作成
    const loadPromise = new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => {
        console.error(`Failed to load card image: ${card.imgSrc}`);
        resolve(); // エラーでも描画をブロックしないために resolve
      };
      // 既にキャッシュされている場合は即座に resolve
      if (img.complete) resolve();
    });
    imagePromises.push(loadPromise);

    return { suit: card.suit, rank: card.rank, img: img };
  });

  // ⭐️ 修正: すべての画像がロードされるのを待機
  Promise.all(imagePromises).then(() => {
    // 画像ロード完了後、レイアウトを計算し、描画を開始
    calculatePlayerCardLayout();
    animateAndDraw(-1, -1);
    console.log("Player cards loaded and initial draw performed.");
  });
}

/**
 * 左右の手の画像をペアで描画します。
 * (drawStaticHandsで使用)
 */
export function drawBothHand(x, y, rotation, centerXOffset) {
  const handR = window.handRImage;
  const handL = window.handLImage;

  let handWidth, handHeight;
  const isOpponentHand = centerXOffset !== window.handCenterXOffset;

  // この if/else ブロックで handWidth, handHeight は P1/P2 の描画サイズに設定される
  if (isOpponentHand) {
    // ⭐️ 修正: サイズを統一するため、P1の基準サイズを使用
    handWidth = window.handRImageWidth;
    handHeight = window.handRImageHeight;
  } else {
    handWidth = window.handRImageWidth;
    handHeight = window.handRImageHeight;
  }

  // ⭐️ 修正 1: 分離距離を常にP1の手の幅を基準に計算し、間隔を統一する
  const separationDistance = window.handRImageWidth * 0.9;

  // ⭐️ 修正 2: 分離ベクトルを常にX軸方向 (回転角 0度) で計算し、手を水平に広げる
  const separationX = separationDistance;
  const separationY = 0;

  // 従来の回転を使用した計算ロジック（この2行は削除またはコメントアウトすべき）
  // const rotationRad = rotation * Math.PI / 180;
  // const separationX = separationDistance * Math.cos(rotationRad);
  // const separationY = separationDistance * Math.sin(rotationRad);

  drawSingleHand(
    handR,
    x + separationX, // 中心から右へ
    y + separationY,
    rotation,
    handWidth,
    handHeight,
  );

  drawSingleHand(
    handL,
    x - separationX, // 中心から左へ
    y - separationY,
    rotation,
    handWidth,
    handHeight,
  );
}

/**
 * シーン全体を静的に描画します。（手を除く）
 */
export function drawSceneExcludingHands(
  handHighlightIndex = -1,
  selectedHighlightIndex = -1,
) {
  // 1. 環境のリセットと背景の描画
  resetStyle();
  drawBackground();

  // 2. 相手の手札 (裏向き) の描画 (削除済み)

  // 3. 静的な手の描画 (drawStaticHands) は animateAndDraw の最後に移動

  // 4. プレイヤーのカード列の描画 (手札、選択中、場札)
  drawCardRows(handHighlightIndex, selectedHighlightIndex);
}

export function drawScene(...args) {
  // 互換性のため、元の名前でラップ
  return drawSceneExcludingHands(...args);
}

export function mouseHover() {
  window.canvas.addEventListener("mousemove", (e) => {
    const { x: mouseX, y: mouseY } = getMousePos(e);
    // ⭐️ 修正: 選択中カードの位置判定に新しい fixedSelectedY を使用
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

// ⭐️ 新規追加: 固定されたY座標で選択中カードのインデックスを取得する関数
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

    // 最後のカードの場合、右端はカード幅の終点
    const currentEnd = (i === window.playerHandCardCount - 1)
      ? cardX + window.cardWidth
      : nextCardX;

    if (x >= cardX && x <= currentEnd) {
      return i;
    }
  }

  return -1;
}

function getMousePos(e) {
  const rect = window.canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / window.canvasAspect) *
    (window.canvas.width / 500);
  const y = ((e.clientY - rect.top) / window.canvasAspect) *
    (window.canvas.height / 1000);
  return { x: x, y: y };
}

export function mouseClick() {
  // 右クリック (場に出す) -> P1のみ機能として残す
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
      cardToMove.playerNum = 1; // プレイヤー番号を設定
      window.playedCardList.push(cardToMove);

      updateCardLayout(true);
      animateAndDraw(-1, -1);
    }
  });

  // 左クリック (選択/選択解除)
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

/**
 * 指定されたプレイヤーのカードを場に出すアニメーションを開始します。
 * P2は、引数でカード枚数を受け取り、ダミーカードを生成してアニメーションを実行します。
 * @param {number} playerNum - 1 (プレイヤー) または 2 (相手)
 * @param {number} [cardCount] - P2が場に出すカードの枚数 (playerNum=2 の場合のみ使用)
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
  const pKey = `p${playerNum}`;

  // P1: 選択中カードを場に出す
  if (playerNum === 1) {
    sourceList = window.playerSelectedList;
    if (sourceList.length === 0) {
      console.log("カードが選択されていません。");
      return;
    }
    window.cardsToAnimate = sourceList.map((card) => ({
      ...card,
      isOpponent: false,
      playerNum: 1,
    }));
    sourceList.length = 0;
    window.isHandRImageAnimating = true;

    // P2: 引数の枚数に応じてダミーカードを生成し、場に出すアニメーションを実行
  } else if (playerNum === 2) {
    if (cardCount <= 0) {
      console.log("P2: 有効なカード枚数が指定されていません。");
      return;
    }

    // 選択中カードリスト (P2) をクリアし、指定枚数分のダミーカードを生成
    const dummyCards = Array.from({ length: cardCount }).map(() => ({
      suit: "S", // ダミーの値
      rank: 1, // ダミーの値
      img: window.cardBackImg, // P2の選択中カードは裏向きで描画されるため、ダミーのカード画像を設定
    }));

    // 選択中リストP2に追加 (これにより drawOpponentSelectedCardRow で描画される)
    window.selectedCards.p2.length = 0;
    window.selectedCards.p2.push(...dummyCards);

    // アニメーション実行
    sourceList = window.selectedCards.p2;
    window.cardsToAnimate = sourceList.map((card) => ({
      ...card,
      isOpponent: true, // アニメーションは相手として実行
      playerNum: playerNum, // プレイヤー番号を格納
    }));

    // 元リスト (P2の選択中リスト) を空にする
    sourceList.length = 0;
    window.isHand2RImageAnimating = true;
  } else {
    // P1/P2以外のコールを無視
    return;
  }

  // アニメーション開始処理 (P1またはP2)
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

    // ⭐️ 修正: P1/P2共通でランダムな終点回転を設定 (P2は180度からこれへ補間)
    card.rotation = (Math.random() * 2 - 1) * MAX_ROTATION * Math.PI / 180;
  });

  animateAndDraw();
}

/**
 * P1が場に出すボタンがクリックされたときに呼び出されます。
 */
export function playSelectedCard1() {
  playCardAnimation(1);
}

/**
 * P2が場に出すボタンがクリックされたときに呼び出されます。
 * index.htmlから、P2が場に出すカード枚数を受け取ります。
 * @param {number} cardCount - 場に出すカードの枚数
 */
export function playSelectedCard2(cardCount = 1) {
  // グローバル変数の定義がない可能性を考慮してオプショナルチェイニングを使用
  const p2Groups = window.playedCardGroups?.p2;
  const index = window.playedCardIndex?.p2 || 0;

  if (p2Groups && p2Groups[index]) {
    const nextCards = p2Groups[index];
    const count = nextCards.length;

    // P2の手札を減らす (ダミー処理)
    if (window.opponentCardLists.hand2) {
      window.opponentCardLists.hand2.splice(
        window.opponentCardLists.hand2.length - count,
        count,
      );
    }

    // P2の進捗インデックスを更新
    window.playedCardIndex.p2 = (index + 1) % p2Groups.length;

    playCardAnimation(2, count);
  } else {
    console.log("P2: 次に場に出すカードグループがありません。");
    playCardAnimation(2, 1); // デフォルトの1枚で実行
  }
}

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

  // ⭐️ 修正: カード設定後に描画を更新
  animateAndDraw(-1, -1);
}

//==================================================
// 内部関数 (Private/Helper Functions)
//==================================================

function updateCardLayout(needsSort) {
  window.playerHandCardCount = window.playerHandList.length;
  calculatePlayerCardLayout();
  if (needsSort) {
    sortCardByRank(window.playerSelectedList);
    sortCardByRank(window.playerHandList);
  }
}

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

  // 手札の位置計算
  window.cardStartY = (window.canvas.height / 2) +
    window.playerHandYOffset;
}

function sortCardByRank(cardList) {
  const customOrder = [3, 4, 5, 6, 7, 8, 9, 10, 1, 2];
  cardList.sort((a, b) =>
    customOrder.indexOf(a.rank) - customOrder.indexOf(b.rank)
  );
}

function getCardImagePath(suit, rank) {
  return `./images/Trump/${suit}_${rank}.png`;
}

//--------------------------------------------------
// 描画ヘルパー関数 (Drawing Helpers)
//--------------------------------------------------

function resetStyle() {
  window.ctx.clearRect(0, 0, window.canvas.width, window.canvas.height);
  window.ctx.filter = "none";
}

function drawBackground() {
  window.ctx.fillStyle = "#31a147ff";
  window.ctx.fillRect(0, 0, window.canvas.width, window.canvas.height);
}

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
 * 相手プレイヤー2の山札 (裏向きのカードの束) を描画 (中身は空)
 */

// ----------------------------------------------------
// ⭐️ drawStaticHands: P2の左右アサインと消失制御が修正された最終版 ⭐️
// ----------------------------------------------------
function drawStaticHands() {
  const canvasCenterX = window.canvas.width / 2;
  const canvasCenterY = window.canvas.height / 2;

  // 1. 間隔/方向の固定（P1の手の幅を基準に108pxに固定）
  const separationDistanceFixed = window.handRImageWidth * 0.9;
  const separationX_Fixed = separationDistanceFixed;
  const separationY_Fixed = 0;

  // ----------------------------------------------------
  // 相手プレイヤー2の手の描画 (左右の位置を入れ替え)
  // ----------------------------------------------------

  // P2の位置と回転設定
  const x2 = canvasCenterX + window.hand2CenterXOffset;
  const y2 = canvasCenterY + window.hand2CenterYOffset;
  const rotation2 = window.hand2StaticRotation;

  // 2. サイズ保証: P2の手のサイズをP1の基準サイズで上書きし、サイズを一致させる
  const handWidth2 = window.handRImageWidth;
  const handHeight2 = window.handRImageHeight;

  // --- P2の描画 (左右の画像アサインと制御) ---

  // 描画位置 A: 画面中心から右へオフセット (P2自身から見て左側 = アニメーションで消えるべき手)
  // ⭐️ 修正: 静的に残るHand LとHand Rを入れ替えます。
  // ⭐️ 画像: Hand L, 制御あり (アニメーションで消える手)
  if (!window.isHand2RImageAnimating) {
    drawSingleHand(
      window.handRImage, // Hand R の画像を使用
      x2 - separationX_Fixed, // 画面上 左側 へ移動
      y2 - separationY_Fixed,
      rotation2,
      handWidth2,
      handHeight2,
    );
  }

  // 描画位置 B: 画面中心から左へオフセット (P2自身から見て右側 = 静的に残るべき手)
  // ⭐️ 修正: 静的に残るHand LとHand Rを入れ替えます。
  // ⭐️ 画像: Hand R, 制御なし (常に描画)
  drawSingleHand(
    window.handLImage, // Hand L の画像を使用
    x2 + separationX_Fixed, // 画面上 右側 へ移動
    y2 + separationY_Fixed,
    rotation2,
    handWidth2,
    handHeight2,
  );

  // ----------------------------------------------------
  // プレイヤー1の手の描画 (変更なし)
  // ----------------------------------------------------

  // P1の位置と回転設定
  const x1 = canvasCenterX + window.handCenterXOffset;
  const y1 = canvasCenterY + window.handCenterYOffset;
  const rotation1 = window.handStaticRotation;

  // P1の手のサイズ (基準サイズ)
  const handWidth1 = window.handRImageWidth;
  const handHeight1 = window.handRImageHeight;

  // P1 左手 (Hand L) は中心から左へ (静的に残るべき手)
  drawSingleHand(
    window.handLImage,
    x1 - separationX_Fixed,
    y1 - separationY_Fixed,
    rotation1,
    handWidth1,
    handHeight1,
  );

  // P1 右手 (Hand R) は中心から右へ (アニメーションで消えるべき手)
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
// ----------------------------------------------------
// ⭐️ drawStaticHands 終了 ⭐️
// ----------------------------------------------------

/**
 * 相手プレイヤーの選択中カード列 (裏向き) を描画します。
 */
function drawOpponentSelectedCardRow(
  playerNum,
  centerXOffset,
  centerYOffset,
  rotation,
) {
  const handKey = `p${playerNum}`;
  const cardList = window.selectedCards[handKey];
  if (cardList.length === 0) return;

  for (let i = 0; i < cardList.length; i++) {
    const card = cardList[i];

    // 描画位置とサイズを計算
    const { x, y, width, height } = calcCardPosition(
      cardList,
      i,
      centerXOffset,
      centerYOffset,
      rotation,
      true,
    );

    // P2の選択中カードは裏向き
    const imgToDraw = window.cardBackImg;

    // 回転の中心はカードの中心
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

/**
 * すべてのカード列 (手札、選択中、場札) を描画します。
 */
function drawCardRows(handHighlightIndex, selectedHighlightIndex) {
  drawHandCardRow(handHighlightIndex); // プレイヤー1の手札
  drawSelectedCardRow(selectedHighlightIndex); // プレイヤー1の選択中のカード

  // 相手プレイヤー2の選択中カード列のみ描画
  // P2の手がカードを出しに行く位置に固定
  drawOpponentSelectedCardRow(
    2,
    window.hand2CenterXOffset,
    window.hand2CenterYOffset + window.hand2RImage_endYOffset, // hand2RImage_endYOffsetは負の値
    window.hand2StaticRotation,
  );

  drawPlayedCardRow(); // 場のカード (アニメーション中のカードの下に描画される)
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

  // ⭐️ 修正: Canvas中央Yからの固定オフセットでY位置を計算
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

function drawPlayedCardRow() {
  // 場のカードの基準Y座標をCanvas垂直中央に設定
  const playedY_Base = window.canvas.height / 2 +
    window.playedCardCenterYOffset; // playedCardCenterYOffsetは0

  const totalPlayed = window.playedCardList.length;

  if (totalPlayed === 0) return;

  const startX_Base = (window.canvas.width - window.cardWidth) / 2;
  const MAX_OFFSET = 30;

  for (let i = 0; i < totalPlayed; i++) {
    const card = window.playedCardList[i];

    // 最後に場に出たカード（一番上）のみ表、それ以外は裏
    const isTopCard = i === totalPlayed - 1;
    const imgToDraw = isTopCard ? card.img : window.cardBackImg;

    if (card.offsetX === undefined) {
      card.offsetX = (Math.random() * 2 - 1) * MAX_OFFSET;
      card.offsetY = (Math.random() * 2 - 1) * MAX_OFFSET;

      // ⭐️ 修正: P1/P2共通で場札の初期回転を乱数に設定
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
  // P2は回転しているので、表示上の中央位置を返す
  const startX = (window.canvas.width - totalCardWidth) / 2;

  return { startX, spacing, cardWidth, cardHeight };
}

/**
 * 回転されたカード列内の特定インデックスのカードのCanvas座標(左上)を計算します。
 * @param {boolean} isOpponent - 相手プレイヤーのカードか (サイズを opponentCardWidth にする)
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

  // P1のカードサイズか相手のカードサイズかを選択
  const cardWidth = isOpponent ? window.opponentCardWidth : window.cardWidth;
  const cardHeight = isOpponent ? window.opponentCardHeight : window.cardHeight;

  // 相手プレイヤーのカード列の間隔を使用
  const { spacing } = calcOpponentCardCenterPosition(cardList.length);
  const totalCardWidth = cardList.length * cardWidth +
    (cardList.length - 1) * spacing;

  // 描画中心点
  const rotationCenterX = canvasCenterX + centerXOffset;
  const rotationCenterY = canvasCenterY + centerYOffset;
  const rotationRad = rotation * Math.PI / 180;

  // 回転の中心から見たカードの相対位置 (左上)
  const drawStartX = -totalCardWidth / 2;
  const cardRelativeX = drawStartX + cardIndex * (cardWidth + spacing);
  const cardRelativeY = -cardHeight / 2;

  // カードの中心を計算
  const rotX = cardRelativeX + cardWidth / 2;
  const rotY = cardRelativeY + cardHeight / 2;

  // 回転変換を適用し、カードの中心座標を取得
  const transformedX = rotationCenterX + rotX * Math.cos(rotationRad) -
    rotY * Math.sin(rotationRad);
  const transformedY = rotationCenterY + rotX * Math.sin(rotationRad) +
    rotY * Math.cos(rotationRad);

  // 描画はカードの左上基準なので、中心位置からカード幅を引く
  const finalX = transformedX - cardWidth / 2;
  const finalY = transformedY - cardHeight / 2;

  return { x: finalX, y: finalY, width: cardWidth, height: cardHeight };
}

function drawAnimatedCards(progress) {
  // 場のカードの位置 (アニメーションの終点) を Canvas 中央Yで計算
  const endY_Base = window.canvas.height / 2 + window.playedCardCenterYOffset; // playedCardCenterYOffsetは0
  const startX_Base = (window.canvas.width - window.cardWidth) / 2;

  window.cardsToAnimate.forEach((card, i) => {
    let startX, startY;
    const playerNum = card.playerNum;
    const totalCardsToAnimate = window.cardsToAnimate.length;

    // カードサイズを決定
    const startCardWidth = card.playerNum === 1
      ? window.cardWidth
      : window.opponentCardWidth;
    const startCardHeight = card.playerNum === 1
      ? window.cardHeight
      : window.opponentCardHeight;

    // アニメーションの開始位置を計算
    if (playerNum === 1) {
      // P1: 選択中カード列の描画Y座標をそのまま開始Y座標とする
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
      // 相手 P2 のみ
      let centerXOffset, centerYOffset, rotation;

      // P2専用の設定
      centerXOffset = window.hand2CenterXOffset;
      centerYOffset = window.hand2CenterYOffset;
      rotation = window.hand2StaticRotation;

      // P2は手が「カードを出す」位置へ移動した状態からアニメーションが始まる
      centerYOffset += window.hand2RImage_endYOffset; // ⭐️ 修正: より下方へ

      // calcCardPosition に isOpponent=true を渡し、等倍サイズで開始位置を計算
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

    // 終点 (場札の位置) は常にP1の基準サイズで計算
    const endX = startX_Base + card.offsetX;
    const endY = endY_Base + card.offsetY;
    const endRotation = card.rotation; // ランダム回転 R (約 ± 30度)

    // P2の場合、開始時の回転は180度(ラジアン)
    const startRotation = playerNum === 2
      ? window.hand2StaticRotation * Math.PI / 180
      : 0;

    // サイズと回転も補間する
    const currentX = startX + (endX - startX) * progress;
    const currentY = startY + (endY - startY) * progress;

    let currentRotationFixed;
    if (playerNum === 2) {
      // ⭐️ 修正: P2の回転補間 (180度を基準に、P1と同じ変化量を加える)
      // P2は180度から始まり、P1と同じランダム回転 R の変化量だけ回転させる
      // 最終回転角は 180度 + R となり、回転の変化量が小さくなる
      currentRotationFixed = startRotation + endRotation * progress;
    } else {
      // P1/P2共通で、開始回転から終点回転まで補間する (P1は 0度から R へ)
      currentRotationFixed = startRotation +
        (endRotation - startRotation) * progress;
    }

    // サイズ補間 (P2の場合は相手サイズからP1サイズへ、P1の場合は常にP1サイズ)
    const currentCardWidth = startCardWidth +
      (window.cardWidth - startCardWidth) * progress;
    const currentCardHeight = startCardHeight +
      (window.cardHeight - startCardHeight) * progress;

    // P2 (playerNum === 2) の場合、裏向きの画像を使用する
    const imgToDraw = playerNum === 2 ? window.cardBackImg : card.img;

    window.ctx.save();
    window.ctx.translate(
      currentX + currentCardWidth / 2,
      currentY + currentCardHeight / 2,
    );
    window.ctx.rotate(currentRotationFixed); // ⭐️ 修正を適用
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

// P1の右手アニメーションロジック (静的な手の位置から、カード列の位置へ移動)
function drawHandRImageAnimation(handRImageProgress) {
  if (!window.handRImage.complete || window.handRImage.naturalWidth === 0) {
    return;
  }

  const handWidth = window.handRImageWidth;
  const handHeight = window.handRImageHeight;

  const canvasCenterX = window.canvas.width / 2;
  const canvasCenterY = window.canvas.height / 2;

  // P1静的な手の中心位置
  const staticRHandX = canvasCenterX + window.handCenterXOffset;
  const staticRHandY = canvasCenterY + window.handCenterYOffset;
  const rotation = window.handRImageRotate;

  // P1アニメーションの開始位置 (静的な右手の中心 + スタートオフセット)
  const startX_Base = staticRHandX + window.handRImage_startXOffset;
  // startYOffsetは0なので、staticRHandY - 0 = staticRHandY (静的な手の定位置)
  const startY_Base = staticRHandY - window.handRImage_startYOffset;

  // P1アニメーションの終了位置
  const endX_Base = staticRHandX + window.handRImage_endXOffset;
  // endYOffsetはselectedCardY (150) なので、staticRHandY - 150 (カード列の位置)
  const endY_Base = staticRHandY - window.handRImage_endYOffset;

  // 補間
  const currentX = startX_Base + (endX_Base - startX_Base) * handRImageProgress;
  const currentY = startY_Base + (endY_Base - startY_Base) * handRImageProgress;

  // 描画 (回転は0度なので簡易版)
  drawSingleHand(
    window.handRImage,
    currentX,
    currentY,
    rotation,
    handWidth,
    handHeight,
  );

  // アニメーション終了判定
  if (handRImageProgress >= 1) {
    window.isHandRImageAnimating = false;
    // カードアニメーションがまだ続いている場合は、そちらの進捗もチェック
    if (!window.isAnimating) {
      animateAndDraw(); // 最終描画
    }
  }
}

// P2の右手アニメーションロジック (静的な手の位置から、カード列の位置へ移動)
function drawHand2RImageAnimation(hand2RImageProgress) {
  if (!window.handRImage.complete || window.handRImage.naturalWidth === 0) {
    return;
  }

  // ⭐️ 修正: P2の描画サイズはP1と同じ基準サイズを使用する
  const handWidth = window.handRImageWidth;
  const handHeight = window.handRImageHeight;

  const canvasCenterX = window.canvas.width / 2;
  const canvasCenterY = window.canvas.height / 2;

  // P2静的な手の中心位置
  const staticRHandX = canvasCenterX + window.hand2CenterXOffset;
  const staticRHandY = canvasCenterY + window.hand2CenterYOffset;
  const rotation = window.hand2RImageRotate;
  const rotationRad = rotation * Math.PI / 180;

  // オフセット (回転させる前のローカル座標)
  const startOffsetX = window.hand2RImage_startXOffset;
  const startOffsetY = window.hand2RImage_startYOffset;
  const endOffsetX = window.hand2RImage_endXOffset;
  const endOffsetY = window.hand2RImage_endYOffset;

  // P2は回転しているため、オフセット自体も回転行列で変換する必要がある

  // 開始オフセットの回転変換
  const rotatedStartOffsetX = startOffsetX * Math.cos(rotationRad) -
    startOffsetY * Math.sin(rotationRad);
  const rotatedStartOffsetY = startOffsetX * Math.sin(rotationRad) +
    startOffsetY * Math.cos(rotationRad);

  // 終了オフセットの回転変換
  const rotatedEndOffsetX = endOffsetX * Math.cos(rotationRad) -
    endOffsetY * Math.sin(rotationRad);
  const rotatedEndOffsetY = endOffsetX * Math.sin(rotationRad) +
    endOffsetY * Math.cos(rotationRad);

  // P2アニメーションの開始位置 (静的な右手の中心 + 回転後のスタートオフセット)
  const startX_Base = staticRHandX + rotatedStartOffsetX;
  const startY_Base = staticRHandY + rotatedStartOffsetY;

  // P2アニメーションの終了位置
  const endX_Base = staticRHandX + rotatedEndOffsetX;
  const endY_Base = staticRHandY + rotatedEndOffsetY;

  // 補間
  const currentX = startX_Base +
    (endX_Base - startX_Base) * hand2RImageProgress;
  const currentY = startY_Base +
    (endY_Base - startY_Base) * hand2RImageProgress;

  // 描画
  drawSingleHand(
    window.handRImage, // P2も同じ画像を使用
    currentX,
    currentY,
    rotation,
    handWidth,
    handHeight,
  );

  // アニメーション終了判定
  if (hand2RImageProgress >= 1) {
    window.isHand2RImageAnimating = false;
    if (!window.isAnimating) {
      animateAndDraw();
    }
  }
}

//--------------------------------------------------
// メインアニメーションループ (Main Animation Loop)
//--------------------------------------------------

/**
 * アニメーションの状態を更新し、シーン全体を描画します。
 */
function animateAndDraw(handHighlightIndex = -1, selectedHighlightIndex = -1) {
  let cardAnimationProgress = 0;
  let hand1AnimationProgress = 0;
  let hand2AnimationProgress = 0;

  // 1. カードアニメーションの進捗計算
  if (window.isAnimating) {
    const elapsed = Date.now() - window.animationStartTime;
    cardAnimationProgress = Math.min(1, elapsed / window.animationDuration);

    if (cardAnimationProgress >= 1) {
      window.isAnimating = false;
      // アニメーション終了時に場札に追加
      window.playedCardList.push(...window.cardsToAnimate.map((card) => {
        // アニメーション後の位置と回転を静的な場札として記録
        const MAX_OFFSET = 30;
        const MAX_ROTATION = 30;
        card.offsetX = (Math.random() * 2 - 1) * MAX_OFFSET;
        card.offsetY = (Math.random() * 2 - 1) * MAX_OFFSET;

        // ⭐️ 修正: P1/P2共通でランダム回転を設定
        card.rotation = (Math.random() * 2 - 1) * 30 * Math.PI / 180;

        return card;
      }));
      window.cardsToAnimate.length = 0;
      updateCardLayout(false);
    }
  }

  // 2. P1 手アニメーションの進捗計算
  if (window.isHandRImageAnimating) {
    const elapsed = Date.now() - window.handRImageStartTime;
    hand1AnimationProgress = Math.min(1, elapsed / window.animationDuration);
  }

  // 3. P2 手アニメーションの進捗計算
  if (window.isHand2RImageAnimating) {
    const elapsed = Date.now() - window.hand2RImageStartTime;
    hand2AnimationProgress = Math.min(1, elapsed / window.animationDuration);
  }

  // 4. シーンの描画 (手を除く、背景、山札、カード列)
  drawSceneExcludingHands(handHighlightIndex, selectedHighlightIndex);

  // 5. アニメーション中のカード描画
  if (window.cardsToAnimate.length > 0) {
    drawAnimatedCards(cardAnimationProgress);
  }

  // 6. ⭐️ 最前面に静的な手を描画する
  drawStaticHands();

  // 7. ⭐️ 最前面にアニメーション中の手を描画する
  if (window.isHandRImageAnimating) {
    drawHandRImageAnimation(hand1AnimationProgress);
  }
  if (window.isHand2RImageAnimating) {
    drawHand2RImageAnimation(hand2AnimationProgress);
  }

  // 8. アニメーションが継続する場合、次のフレームをリクエスト
  if (
    window.isAnimating || window.isHandRImageAnimating ||
    window.isHand2RImageAnimating
  ) {
    requestAnimationFrame(() =>
      animateAndDraw(handHighlightIndex, selectedHighlightIndex)
    );
  }
}
