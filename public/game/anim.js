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
  window.playedCardList = []; //場に出されたカード

  //並べるカード枚数
  window.totalCardCount = 0;

  //==================================================
  // 変更できる変数
  //==================================================

  //Canvasサイズ（スマホ画面として見える部分）
  window.canvas.width = 500;
  window.canvas.height = 1000;

  // カードサイズ
  const cardAsp = 208 / 142; // アスペクト比
  const size = 60; // 基準サイズ
  window.cardWidth = size;
  window.cardHeight = size * cardAsp;

  //オフセット用
  window.allOffsetSize = size / 100;

  const handSize = 300 * window.allOffsetSize;
  // 右手の画像、サイズ
  window.handRImage = new Image();
  window.handRImage.src = "./images/Others/Hand_R.png";
  window.handRImageWidth = handSize;
  window.handRImageHeight = handSize;
  window.handRImage_XOffset = 250; // 画面中央から右にずらす
  window.handRImage_YOffset = 350; // 画面下寄りの位置からさらに下にずらす
  window.handRImageRotate = 0; // 30度回転（右手と対称になるように）
  // 左手の画像、サイズ
  window.handLImage = new Image();
  window.handLImage.src = "./images/Others/Hand_L.png";
  window.handLImageWidth = handSize;
  window.handLImageHeight = handSize;
  window.handLImage_XOffset = -250; // 画面中央から左にずらす
  window.handLImage_YOffset = 350; // 画面下寄りの位置からさらに下にずらす
  window.handLImageRotate = 0; // 30度回転（右手と対称になるように）

  //右手のアニメーション用
  window.handRImage_startXOffset = 75;
  window.handRImage_startYOffset = -350;
  window.handRImage_endXOffset = 75;
  window.handRImage_endYOffset = 0;
  window.handRImageRotate = 0; //向き

  //カード列の左右の余白
  window.cardMargin = 30;

  //Y座標を管理する変数
  window.handCardY = handCardY; //手札の位置
  window.selectedCardY = 150; //選択されたカードの位置
  window.playedCardY = 350; //場に出すカードの位置（選択カードより更に上）

  //==================================================
  // アニメーション制御変数
  //==================================================
  window.isAnimating = false; // アニメーション中フラグ
  window.animationStartTime = 0; // アニメーション開始時間
  window.animationDuration = 500; // アニメーション時間 (ms)
  window.cardsToAnimate = []; // アニメーション対象のカードリスト

  //右手のアニメーション制御変数と画像;
  window.isHandRImageAnimating = false; // 右手の画像アニメーション中フラグ
  window.handRImageStartTime = 0; // 右手の画像アニメーション開始時間
  window.handRImagePosition = { x: 0, y: 0 }; // 現在の右手の座標

  window.animateAndDraw = animateAndDraw; // mouseHoverなどから呼び出すためグローバルに公開
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

  const minSpacing = -50 * window.allOffsetSize;
  const maxSpacing = 10 * window.allOffsetSize;
  const maxCards = 15;
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
// カード列の表示位置を「中央揃え + 両端に余白」で調整
function calcCardCenterPosition() {
  window.handCardSpacing = calcCardSpacing(window.totalCardCount);

  const totalCardWidth = window.totalCardCount > 1
    //true
    ? window.totalCardCount * window.cardWidth +
      (window.totalCardCount - 1) * window.handCardSpacing
    //false
    : window.cardWidth;

  // ⭐️ 修正ロジック ⭐️
  const availableWidthWithMargin = window.canvas.width - window.cardMargin * 2;

  if (totalCardWidth > availableWidthWithMargin) {
    // カードの総幅が利用可能幅を超えている場合 (spacingで調整済み)
    // 左端のMarginから描画を開始する
    window.cardStartX = window.cardMargin;
  } else {
    // カードの総幅が利用可能幅よりも小さい場合
    // 中央揃えで描画する
    window.cardStartX = (window.canvas.width - totalCardWidth) / 2;
  }

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

//カード画像パスを生成するヘルパー関数
function getCardImagePath(suit, rank) {
  return `./images/Trump/${suit}_${rank}.png`;
}

export function initCard(playerCardData) {
  window.totalCardCount = playerCardData.length; //送られてきたカードを取得

  //位置調整
  calcCardSpacing(window.totalCardCount);
  calcCardCenterPosition();

  const tempCardData = playerCardData.map((card) => ({
    suit: card.suit,
    rank: card.rank,
    imgSrc: getCardImagePath(card.suit, card.rank),
  }));

  //カードの裏面を取得
  window.cardBackImg = new Image();
  window.cardBackImg.src = "./images/Trump/back.png";

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

//カード列の表示
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
  if (window.isAnimating) return; // アニメーション中は、`drawAnimatedCards`が描画するためスキップ

  const selectedY = window.cardStartY - window.selectedCardY; // 通常列より少し上
  const totalSelected = window.selectedCardList.length;

  window.selectedCardSpacing = calcCardSpacing(totalSelected);

  // === カード列の中央揃え位置計算（Marginを考慮） ===
  const totalCardWidth = totalSelected * window.cardWidth +
    (totalSelected > 0 ? (totalSelected - 1) * window.selectedCardSpacing : 0);

  const availableWidthWithMargin = window.canvas.width - window.cardMargin * 2;
  let startX;

  if (totalCardWidth > availableWidthWithMargin) {
    // カードの総幅が利用可能幅を超えている場合
    startX = window.cardMargin;
  } else {
    // カードの総幅が利用可能幅よりも小さい場合
    startX = (window.canvas.width - totalCardWidth) / 2;
  }

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

function drawPlayedCardRow() {
  // 場のカードのY座標を計算（中央揃えの基準位置）
  const playedY_Base = window.cardStartY - window.playedCardY;
  const totalPlayed = window.playedCardList.length;

  if (totalPlayed === 0) return;

  // 中央揃えの基準X座標
  const startX_Base = (window.canvas.width - window.cardWidth) / 2;

  // ランダムオフセットと回転の範囲設定
  const MAX_OFFSET = 30; // 基準位置からの最大ズレ (px)
  const MAX_ROTATION = 30; // 最大回転角度 (度)

  // 描画順序: 古いカードから順に描画（リストの先頭から）
  for (let i = 0; i < totalPlayed; i++) {
    const card = window.playedCardList[i];

    // 最後のカード (i === totalPlayed - 1) のみ表向き、それ以外は裏向き
    const imgToDraw = (i === totalPlayed - 1) ? card.img : window.cardBackImg;

    // カードごとのランダム値を生成/取得
    // 初回描画時にランダム値を生成し、カードオブジェクトに保存
    if (card.offsetX === undefined) {
      // -MAX_OFFSET から +MAX_OFFSET の範囲でランダムなX, Yオフセットを生成
      card.offsetX = (Math.random() * 2 - 1) * MAX_OFFSET;
      card.offsetY = (Math.random() * 2 - 1) * MAX_OFFSET;
      // -MAX_ROTATION から +MAX_ROTATION の範囲でランダムな角度を生成 (ラジアンに変換)
      card.rotation = (Math.random() * 2 - 1) * MAX_ROTATION * Math.PI / 180;
    }

    // 最終描画位置と角度を計算
    const finalX = startX_Base + card.offsetX;
    const finalY = playedY_Base + card.offsetY;
    const rotation = card.rotation;

    // Canvasの描画設定を変更して回転と移動を行う
    window.ctx.save(); // 現在のCanvas状態を保存

    // カードの中心を原点に移動 (回転の中心にするため)
    window.ctx.translate(
      finalX + window.cardWidth / 2,
      finalY + window.cardHeight / 2,
    );

    // 回転
    window.ctx.rotate(rotation);

    // 回転した中心から、描画の開始位置に戻る (カードの左上隅の位置)
    window.ctx.drawImage(
      imgToDraw,
      -window.cardWidth / 2, // 基準点(0,0)からカード左上隅までのオフセット
      -window.cardHeight / 2,
      window.cardWidth,
      window.cardHeight,
    );

    window.ctx.restore(); // Canvasの状態を元に戻す
  }
}

// アニメーション中のカードを描画
function drawAnimatedCards(progress) {
  const startY = window.cardStartY - window.selectedCardY; // 選択カード列のY座標
  const endY_Base = window.cardStartY - window.playedCardY; // 場札列のY座標（中央基準）
  const startX_Base = (window.canvas.width - window.cardWidth) / 2;

  // アニメーション中のカードを描画
  window.cardsToAnimate.forEach((card, i) => {
    // 初期位置（選択カード列）
    const totalSelected = window.cardsToAnimate.length;
    const selectedSpacing = calcCardSpacing(totalSelected);
    const totalCardWidth = totalSelected * window.cardWidth +
      (totalSelected - 1) * selectedSpacing;
    const startX_Selected = (window.canvas.width - totalCardWidth) / 2;

    const startX = startX_Selected + i * (window.cardWidth + selectedSpacing);

    // 最終位置（場札列） - drawPlayedCardRow と同じロジックでランダム位置を計算
    // 最終的な描画開始座標を計算
    const endX = startX_Base + card.offsetX; // card.offsetX を使用
    const endY = endY_Base + card.offsetY; // card.offsetY を使用
    const endRotation = card.rotation; // card.rotation を使用

    // 補間された座標
    const currentX = startX + (endX - startX) * progress;
    const currentY = startY + (endY - startY) * progress;
    const currentRotation = endRotation * progress;

    // 描画処理 (drawPlayedCardRowのロジックを簡略化して使用)
    window.ctx.save();

    window.ctx.translate(
      currentX + window.cardWidth / 2,
      currentY + window.cardHeight / 2,
    );

    window.ctx.rotate(currentRotation);

    window.ctx.drawImage(
      card.img,
      -window.cardWidth / 2,
      -window.cardHeight / 2,
      window.cardWidth,
      window.cardHeight,
    );

    window.ctx.restore();
  });
}

//アニメーション用の右手
function drawHandRImageAnimation(handRImageProgress) {
  if (!window.handRImage.complete || window.handRImage.naturalWidth === 0) {
    // 画像がロードされていない、またはエラーが発生している
    console.log("Hand image not yet loaded or failed to load.");
    return;
  }

  // アニメーションの開始位置
  const startX = (window.canvas.width - window.handRImageWidth) / 2 +
    window.handRImage_startXOffset;
  const startY = window.cardStartY + window.cardHeight +
    window.handRImage_startYOffset;

  // アニメーションの終了位置 (キャンバス中央あたり)
  const endX = (window.canvas.width - window.handRImageWidth) / 2 +
    window.handRImage_endXOffset;
  const endY = (window.canvas.height - window.handRImageHeight) / 2 +
    window.handRImage_endYOffset;

  // 補間された座標
  const currentX = startX + (endX - startX) * handRImageProgress;
  const currentY = startY + (endY - startY) * handRImageProgress;

  // -30度をラジアンに変換 (左回りなのでマイナス)
  const rotationAngleRad = window.handRImageRotate * Math.PI / 180;

  // Canvasの状態を保存
  window.ctx.save();
  // 回転の中心へ原点を移動
  window.ctx.translate(
    currentX + window.handRImageWidth / 2,
    currentY + window.handRImageHeight / 2,
  );

  window.ctx.rotate(rotationAngleRad);

  // 手の画像を描画
  window.ctx.drawImage(
    window.handRImage,
    -window.handRImageWidth / 2,
    -window.handRImageHeight / 2,
    window.handRImageWidth,
    window.handRImageHeight,
  );

  // Canvasの状態を元に戻す
  window.ctx.restore();
}

//アニメーション以外の右手
function drawHandRImageStatic() {
  if (!window.handRImage.complete || window.handRImage.naturalWidth === 0) {
    return;
  }

  // キャンバスの中央座標
  const canvasCenterX = window.canvas.width / 2;
  const canvasCenterY = window.canvas.height / 2;

  // 最終的な手の中心座標（カード列の左下付近に配置するため、オフセットを適用
  const finalCenterX = canvasCenterX + window.handRImage_XOffset;
  const finalCenterY = canvasCenterY + window.handCardY / 2 +
    window.handRImage_YOffset;

  const rotationAngleRad = window.handRImageRotate * Math.PI / 180;

  // Canvasの状態を保存
  window.ctx.save();

  // 回転の中心へ原点を移動
  window.ctx.translate(finalCenterX, finalCenterY);

  // 回転を適用
  window.ctx.rotate(rotationAngleRad);

  // 画像を、新しい原点 (finalCenterX, finalCenterY) を中心に描画
  window.ctx.drawImage(
    window.handRImage,
    -window.handRImageWidth / 2,
    -window.handRImageHeight / 2,
    window.handRImageWidth,
    window.handRImageHeight,
  );

  // Canvasの状態を元に戻す
  window.ctx.restore();
}

function drawHandLImage() {
  if (!window.handLImage.complete || window.handLImage.naturalWidth === 0) {
    return;
  }

  // キャンバスの中央座標
  const canvasCenterX = window.canvas.width / 2;
  const canvasCenterY = window.canvas.height / 2;

  // 最終的な手の中心座標（カード列の左下付近に配置するため、オフセットを適用
  const finalCenterX = canvasCenterX + window.handLImage_XOffset;
  const finalCenterY = canvasCenterY + window.handCardY / 2 +
    window.handLImage_YOffset;

  const rotationAngleRad = window.handLImageRotate * Math.PI / 180;

  // Canvasの状態を保存
  window.ctx.save();

  // 回転の中心へ原点を移動
  window.ctx.translate(finalCenterX, finalCenterY);

  // 回転を適用
  window.ctx.rotate(rotationAngleRad);

  // 画像を、新しい原点 (finalCenterX, finalCenterY) を中心に描画
  window.ctx.drawImage(
    window.handLImage,
    -window.handLImageWidth / 2,
    -window.handLImageHeight / 2,
    window.handLImageWidth,
    window.handLImageHeight,
  );

  // Canvasの状態を元に戻す
  window.ctx.restore();
}

function drawSingleHand(handImage, x, y, rotation) {
  if (!handImage.complete || handImage.naturalWidth === 0) {
    return;
  }

  const rotationAngleRad = rotation * Math.PI / 180;
  const handWidth = window.handRImageWidth; // 右手のサイズを使用
  const handHeight = window.handRImageHeight; // 右手のサイズを使用

  // Canvasの状態を保存
  window.ctx.save();

  // 回転の中心へ原点を移動 (引数で渡されたx, yが画像の中心になるように設定)
  window.ctx.translate(x, y);

  // 回転を適用
  window.ctx.rotate(rotationAngleRad);

  // 画像を、新しい原点 (x, y) を中心に描画
  window.ctx.drawImage(
    handImage,
    -handWidth / 2, // 画像の中心を合わせる
    -handHeight / 2, // 画像の中心を合わせる
    handWidth,
    handHeight,
  );

  // Canvasの状態を元に戻す
  window.ctx.restore();
}

export function drawBothHand(x, y, rotation) {
  // 左右の手の画像を準備（既存のwindow変数から取得）
  const handR = window.handRImage;
  const handL = window.handLImage;

  // 両手の中心からのオフセットを決定（既存のhandRImageWidthを基準に調整）
  // 例: カード幅の1.5倍を左右に広げる距離とする
  const separationDistance = window.cardWidth * 1.5;

  // 右手の描画
  // X座標: 中央X + 分離距離
  drawSingleHand(
    handR,
    x + separationDistance,
    y,
    rotation,
  );

  // 左手の描画
  // X座標: 中央X - 分離距離
  // 回転: 左手なので、右手の回転を反転させる
  drawSingleHand(
    handL,
    x - separationDistance,
    y,
    -rotation, // 向きを反転
  );
}

//==================================================
// 画像読み込み完了後に描画
//==================================================

// アニメーション実行と描画のメインループ
function animateAndDraw(handHighlightIndex = -1, selectedHighlightIndex = -1) {
  if (window.isAnimating || window.isHandRImageAnimating) {
    // カードアニメーションの進行度を計算
    const elapsedCard = Date.now() - window.animationStartTime;
    const progressCard = Math.min(1, elapsedCard / window.animationDuration);

    // 手の画像アニメーションの進行度を計算
    const elapsedHand = Date.now() - window.handRImageStartTime;
    const progressHand = Math.min(1, elapsedHand / window.animationDuration);

    resetStyle();
    drawBackground();
    drawHandCardRow(handHighlightIndex);
    // drawSelectedCardRow はアニメーション中はスキップ
    drawPlayedCardRow(); // 場札は通常通り描画（移動先）
    drawHandLImage();
    if (!window.isHandRImageAnimating) {
      drawHandRImageStatic();
    }

    // カードアニメーションを描画
    if (window.isAnimating) {
      drawAnimatedCards(progressCard);
    }
    //手の画像アニメーションを描画
    if (window.isHandRImageAnimating) {
      drawHandRImageAnimation(progressHand);
    }

    // 完了チェック
    let continueAnimation = false;

    // カードアニメーション完了チェック
    if (window.isAnimating) {
      if (progressCard < 1) {
        continueAnimation = true;
      } else {
        // カードアニメーション完了処理 (既存)
        window.isAnimating = false;
        window.playedCardList.push(...window.cardsToAnimate);
        window.cardsToAnimate = [];
        window.selectedCardList.length = 0;
        console.log(`カードアニメーション完了。`);
      }
    }
    // 手の画像アニメーション完了チェック
    if (window.isHandRImageAnimating) {
      if (progressHand < 1) {
        continueAnimation = true;
      } else {
        window.isHandRImageAnimating = false;
        console.log(`手の画像アニメーション完了。`);
      }
    }
    // 次のフレームをリクエスト
    if (continueAnimation) {
      requestAnimationFrame(() =>
        animateAndDraw(handHighlightIndex, selectedHighlightIndex)
      );
    } else {
      // 全てのアニメーションが完了したら最終描画
      drawAll(handHighlightIndex, selectedHighlightIndex);
    }
  } else {
    // 通常描画
    drawAll(handHighlightIndex, selectedHighlightIndex);
  }
}

export function drawAll(handHighlightIndex = -1, selectedHighlightIndex = -1) {
  // アニメーション中は drawAll を直接実行しない
  if (window.isAnimating) return;

  // Promise.all 内の playedCardList の画像読み込み待ちも修正（cardsToAnimateと重複しないように）
  const imagesToLoad = [
    ...window.handCardList.map((card) => card.img),
    ...window.playedCardList.map((card) => card.img),
  ].filter((img) => img instanceof HTMLImageElement);

  Promise.all(
    imagesToLoad.map(
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
    drawPlayedCardRow();
    drawHandRImageStatic();
    drawHandLImage();
  });
}

//==================================================
// Canvas内マウス処理
//==================================================

//マウスポジション
function getMousePos(e) {
  const rect = window.canvas.getBoundingClientRect();

  // rectサイズと実際のcanvasサイズの比率を取る
  const scaleX = window.canvas.width / rect.width;
  const scaleY = window.canvas.height / rect.height;

  // これを使って正確なcanvas座標に変換
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

    //drawAll(handHoverIndex, selectedHoverIndex);
    animateAndDraw(handHoverIndex, selectedHoverIndex);
  });

  window.canvas.addEventListener("mouseleave", () => animateAndDraw(-1, -1));
}

//クリック時
export function mouseClick() {
  // click の代わりに contextmenu (右クリック) イベントをリッスン
  window.canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault(); // ブラウザのコンテキストメニューを無効化

    if (window.isAnimating) return; // アニメーション中は操作を無視

    const { x: mouseX, y: mouseY } = getMousePos(e);

    // 1. 選択済みカード列の当たり判定をチェック
    const selectedClickedIndex = getSelectedCardIndexAtPos(mouseX, mouseY);
    // 2. 手札のカード列の当たり判定をチェック
    const handClickedIndex = getHandCardIndexAtPos(mouseX, mouseY);

    let needsRedraw = false;
    let cardToMove = null;

    if (selectedClickedIndex >= 0) {
      // ========== 選択済みカード列のカードが右クリックされた場合 ==========
      cardToMove = window.selectedCardList[selectedClickedIndex];
      window.selectedCardList.splice(selectedClickedIndex, 1);
      needsRedraw = true;
    } else if (handClickedIndex >= 0) {
      // ========== 手札のカード列のカードが右クリックされた場合 ==========
      cardToMove = window.handCardList[handClickedIndex];
      if (!cardToMove || !cardToMove.img) return;
      window.handCardList.splice(handClickedIndex, 1);
      needsRedraw = true;
    }

    if (cardToMove) {
      // どちらのリストから移動したカードでも、場に出すリストに追加
      window.playedCardList.push(cardToMove);
    }

    // 描画更新が必要な場合のみ処理を実行
    if (needsRedraw) {
      // 手札の枚数再計算
      window.totalCardCount = window.handCardList.length;

      // カード列の再計算
      calcCardCenterPosition();

      // ソートを適用
      sortCardByRank(window.selectedCardList);
      sortCardByRank(window.handCardList);
    }

    //描画
    animateAndDraw(-1, -1);
  });

  //左クリックしたら
  window.canvas.addEventListener("click", (e) => {
    if (window.isAnimating) return; // アニメーション中は操作を無視

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
      // カード総数を更新
      window.totalCardCount = window.handCardList.length;

      // ここでカード列の再計算を呼び出す
      calcCardCenterPosition();

      // === ソートを適用 ===
      sortCardByRank(window.selectedCardList);
      sortCardByRank(window.handCardList);
    }

    //描画
    animateAndDraw(-1, -1);
  });

  // optional: canvas外に出たときは通常表示に戻す（mouseHover と同様）
  window.canvas.addEventListener("mouseleave", () => animateAndDraw(-1, -1));
}

//==================================================
// 外部操作用ユーティリティ関数（新規追加）
//==================================================

/*返り値用*/
///////////////////////////////////

//選んだカード枚数
export function returnSelectedCardCount() {
  return window.selectedCardList.length;
}
//場にあるカード枚数
export function returnPlayedCardCount() {
  return window.playedCardList.length;
}

////////////////////////////////////

//選択されたカードを場に出す(ボタン操作)
export function playSelectedCard() {
  if (window.selectedCardList.length === 0) {
    console.log("場に出すカードが選択されていません。");
    return;
  }
  // アニメーション中は多重起動を防ぐ
  if (window.isAnimating || window.isHandRImageAnimating) {
    console.log("アニメーション中です。お待ちください。");
    return;
  }
  // 1. アニメーション対象リストに移動
  // spread構文を使って配列の要素を全てコピー
  window.cardsToAnimate = [...window.selectedCardList];

  // アニメーション開始前に最終位置を計算し、カードに保存
  const MAX_OFFSET = 30;
  const MAX_ROTATION = 30; // 度

  window.cardsToAnimate.forEach((card) => {
    // drawPlayedCardRow と同じロジックでランダム値を生成し、プロパティに保存
    card.offsetX = (Math.random() * 2 - 1) * MAX_OFFSET;
    card.offsetY = (Math.random() * 2 - 1) * MAX_OFFSET;
    card.rotation = (Math.random() * 2 - 1) * MAX_ROTATION * Math.PI / 180;
  });

  // 手の画像の初期位置 (手札のカード列の下端あたりに設定)
  window.handRImagePosition.x = (window.canvas.width - window.handRImageWidth) /
    2;
  window.handRImagePosition.y = window.cardStartY + window.cardHeight + 20; // 手札の下 + 20px

  // 2. アニメーションを開始
  window.isAnimating = true;
  window.animationStartTime = Date.now();
  window.isHandRImageAnimating = true;
  window.handRImageStartTime = Date.now();

  // 3. アニメーションループを開始 (drawAllの代わりに animateAndDraw を使用)
  animateAndDraw();

  console.log(
    `アニメーションを開始しました。移動対象カード枚数: ${window.cardsToAnimate.length}`,
  );
}

//外部から指定されたカードを場に送る
export function setPlayedCard(playedCardRawData) {
  // ⭐️ 外部から渡されたデータに画像オブジェクトを追加する
  const cardListWithImages = playedCardRawData.map((card) => {
    const img = new Image();
    img.src = getCardImagePath(card.suit, card.rank);
    return {
      suit: card.suit,
      rank: card.rank,
      img: img, // 画像オブジェクトを生成
    };
  });

  // リストを上書きする代わりに、新しいカードを既存のリストに結合（積み重ね）する
  window.playedCardList = window.playedCardList.concat(cardListWithImages);

  // 再描画
  drawAll(-1, -1);
}
