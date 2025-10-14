/*
  アニメーション用の関数を書くスクリプト
*/

//canvas要素に対して描画操作を行うためのコンテキスト（context）オブジェクト
const canvas = document.getElementById("gameScene");
const ctx = canvas.getContext("2d");


////////////////////////////////////////////////////////////////////////////////////////////

//実際のスマホに描写される画面のサイズ
canvas.width = 500;
canvas.height = 1000;
let aspect = 1;

//ウィンドウサイズが変わった時の処理
function setDispSize() {
  const area = document.getElementById("area");
  //console.log(area.clientWidth);
  //console.log(area.clientHeight);

  if (area.clientHeight * canvas.width > area.clientWidth * canvas.height) {
    aspect = area.clientWidth / canvas.width;
    canvas.style.width = area.clientWidth + "px";
    canvas.style.height = (area.clientWidth * canvas.height / canvas.width) + "px";
  } else {
    aspect = area.clientHeight / canvas.height;
    canvas.style.width = (area.clientHeight * canvas.width / canvas.height) + "px";
    canvas.style.height = area.clientHeight + "px";
  }
  //console.log("x:" + canvas.style.width);
  //console.log("y:" + canvas.style.height);
}
setDispSize();
window.addEventListener("resize", setDispSize);

////////////////////////////////////////////////////////////////////////////////////////////


//cardを入れる箱を宣言
let cardContainer = document.querySelector(".card-container");

//新しい <span> 要素を作成
let card = document.createElement("span");
//CSSクラスをつける
card.className = "card";

//スタイルを初期化
resetStyle();

//<img>タグを作成
const cardImgs = [];

/* cardImg.addEventListener("load", () => {
}); */



//cardImgs配列にcardImgs
let Rank = 0;
let Suit = "";
for (let i = 0; i < 5; i++) {

  let SuitRandom = Math.floor(Math.random() * 4) + 1;//1~4 floorは小数切り捨て
  //let RankRandom = Math.floor(Math.random() * 13) + 1;//1~13
  let RankRandom = Math.floor(Math.random() * 10) + 1;//1~13

  Rank = RankRandom;
  if (SuitRandom == 1) {
    Suit = "C";
  } else if (SuitRandom == 2) {
    Suit = "D";
  } else if (SuitRandom == 3) {
    Suit = "H";
  } else if (SuitRandom == 4) {
    Suit = "S";
  }

  const cardImg = new Image();
  cardImg.src = `./images/Trump/${Suit}_${Rank}.png`;
  cardImgs.push(cardImg);//要素番号0 1 2 3 4の順

}


/* //cardImg.src = `./images/Trump/D_1.png`;
console.log("Rank" + Rank);
console.log("Suit" + Suit); */

const cardAsp = 208 / 142;//アスペクト比
const size = 100;

function resetStyle() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.filter = "none";
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#ffffffff";
}

//実際のスマホに描写される画面
ctx.beginPath();//新しい図形の描画の開始
ctx.rect(0, 0, canvas.width, canvas.height);//画面のサイズ
ctx.fillStyle = "#000000ff";
ctx.fill();//rectで指定した部分を塗る
ctx.closePath();//終了

//トランプカードを５枚表示
for (let i = 0; i < 5; i++) {
  ctx.beginPath();
  ctx.rect(0, i * size * cardAsp, size, size * cardAsp);
  ctx.fillStyle = "#ffffffff";
  ctx.fill();
  ctx.closePath();

  ctx.beginPath();

  ctx.drawImage(cardImgs[i], 0, i * size * cardAsp, size, size * cardAsp);//画像　開始位置（縦、横）　画像サイズ（縦、横）　
  ctx.closePath();

};

/* 
//カードをホバーしたとき
cardImgs.addEventListener('mouseover', function () {
  for (let i = 0; i < 5; i++) {
    ctx.rect(0, i * size * cardAsp, size, size * cardAsp);
    ctx.fillStyle = "#484848ff";
    ctx.fill();
  }
  console.log("pass");
}); */




