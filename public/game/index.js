const params = new URLSearchParams(window.location.search);

const roomname = params.get("room");
const username = params.get("name");
const userid = params.get("id");
// 接続するWebSocketサーバーのURL
const WS_URL = "ws://localhost:8080/game";
const TURN_LIMIT = 60; // ターンの制限時間 (秒)
const DOUBT_LIMIT = 5; // ダウトタイムの制限時間 (秒)

let back = 0;
let declaredRank = 0;
let declaredCount = 0;
let actualCards = [];
let currentTimer = null; // タイマーIDを保持
let timeLeft = 0; // 残り時間 (秒)
let currentPhase = null; // 現在のフェーズ ('turn' または 'doubt')

let myHand = []; // 自分の手札 (カードオブジェクトの配列)
let allPlayers = []; // 全プレイヤーの情報 (名前、ID、手札枚数)
let turnOrder = []; // プレイヤーの順番 (IDの配列)
let gameRules = {}; // ゲームルール設定

const timerDisplay = document.getElementById("timer-display");

let socket;

import {
  generateCardData,
  initCanvas,
  initCard,
  mouseClick,
  mouseHover,
  playSelectedCard1,
  playSelectedCard2,
  setDispSize,
  startDoubtEffect,
} from "./anim.js";

// ----------------------------------------------------
// 1. WebSocket接続の確立
// ----------------------------------------------------

/**
 * WebSocket接続を確立する関数
 */
function connectWebSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
  }

  socket = new WebSocket(WS_URL);

  socket.onopen = (event) => {
    console.log("✅ WebSocket接続が確立されました。", event);
    // サーバーからのinitメッセージ受信を待つ
  };

  socket.onmessage = (event) => {
    console.log("📥 サーバーからメッセージを受信:", event.data);

    try {
      const message = JSON.parse(event.data);
      handleIncomingMessage(message);
    } catch (error) {
      console.error("JSONパースエラー:", error);
    }
  };

  socket.onclose = (event) => {
    console.log("❌ WebSocket接続が閉じられました。", event);
  };

  socket.onerror = (error) => {
    console.error("🚨 WebSocketエラー:", error);
  };
}

// ----------------------------------------------------
// 2. メッセージの受信処理 (initはここだけに残す)
// ----------------------------------------------------

/**
 * サーバーから受信したメッセージを処理する関数
 * @param {object} message - サーバーから送られてきたメッセージオブジェクト
 * @param {string} playerId - カードを出したプレイヤーID
 * @param {number[]} actualCards - 実際に出したカードの配列 (例: [5, 5])
 * @param {number} declaredRank - 申告した数字 (例: 5)
 * @param {number} declaredCount - 申告した枚数 (例: 2)
 * @param {number} duration - 制限時間 (秒)
 * @param {string} phase - 'turn' または 'doubt'
 */

function startTimer(duration, phase) {
  stopTimer(); // 既存のタイマーを停止

  timeLeft = duration;
  currentPhase = phase;

  // UIを初期表示
  updateTimerDisplay();

  // 1秒ごとにタイマーを更新
  currentTimer = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();

    if (timeLeft <= 0) {
      stopTimer();
      handleTimeOut(); // 時間切れ処理を実行
    }
  }, 1000);
}

function stopTimer() {
  if (currentTimer) {
    clearInterval(currentTimer);
    currentTimer = null;
  }
  // 画面表示もクリア
  timerDisplay.textContent = "";
}

function updateTimerDisplay() {
  if (currentTimer) {
    // 残り時間が5秒を切ったら赤色にするなど、視覚的なフィードバックを入れると良い
    timerDisplay.textContent = `残り時間: ${timeLeft} 秒`;
    if (timeLeft <= 5) {
      timerDisplay.style.color = "red";
    } else {
      timerDisplay.style.color = "black";
    }
  }
}

function handleTimeOut() {
  console.log(
    `${currentPhase}が時間切れになりました。自動的にパスを送信します。`,
  );

  let timeOutMessage;
  if (currentPhase === "turn") {
    // 通常のターンでの時間切れ
    timeOutMessage = {
      type: "play",
      action: "pass", // プレイヤーはパスを選択
    };
  } else if (currentPhase === "doubt") {
    // ダウトタイムでの時間切れ（ダウトしない）
    timeOutMessage = {
      type: "doubt_action",
      action: "no_doubt", // ダウトしないことを選択
    };
  }

  if (timeOutMessage) {
    ws.send(JSON.stringify(timeOutMessage));
  }

  // 時間切れでパスを送信したら、サーバーからの次の状態更新を待つ
}

function handleIncomingMessage(message) {
  switch (message.type) {
    case "init": // 👈 受信専用として残す
      console.log("init");
      // 例: 手札の表示、ルールの設定など
      myHand = message.hand; //自分の手札
      gameRules = message.rules; //ゲームのルール
      turnOrder = message.order; //全員の順番
      allPlayers = message.allplayers; //全員の名前、id、手札枚数
      break;
    case "turn":
      console.log("phase:turn");
      if (message.turn == "you") {
        // 自分のターンならタイマーを開始
        startTimer(TURN_LIMIT, "turn");
        console.log("あなたのターンです。タイマー開始。");
      } else {
        // 自分のターンでなければ、タイマーを停止・クリア
        stopTimer();
      }
      break;
    case "doubt":
      // サーバーから「ダウトタイムの開始」が通知された
      console.log("phase:daubt");
      if (message.doubt == "you") {
        // ダウトするかどうかを判断するプレイヤーならタイマーを開始
        startTimer(DOUBT_LIMIT, "doubt");
        console.log("ダウトタイム開始。タイマー開始。");
      } else {
        // 関係ないプレイヤーなら、タイマーを停止・クリア
        stopTimer();
      }
      break;
    case "game_update":
      // 誰かが手を打った、ダウトが解決したなどで状態が更新された
      // 次のフェーズに移るため、タイマーを停止
      stopTimer();
      // ...その他のゲーム状態更新処理...
      break;
    case "play": // 他のプレイヤーのカード出し/申告情報
      console.log("🃏 PLAYメッセージを受信 - プレイ情報:", message.payload);
      // 例: UIに申告内容（どの数字を何枚）を表示
      //const { playerId, declaredRank, declaredCount } = message.payload;
      console.log(
        `${playerId} が ${declaredRank} を ${declaredCount} 枚と申告しました。`,
      );
      break;
    case "pass":
      console.log("🚫 PASSメッセージを受信 - パス情報:", message.payload);
      break;
    case "result": // ダウトの成否、ペナルティ、ゲーム結果などの情報
      console.log("result");
      //  const { ChallengeSuccessful, loserId, cardsToTake } = message.payload;

      if (ChallengeSuccessful !== undefined) {
        // ダウトの結果処理
        if (ChallengeSuccessful) {
          console.log(
            `ダウト成功! ${loserId} のライフが1減った!`,
          );
        } else {
          console.log(`ダウト失敗... ${loserId} のライフ1減った!`);
        }
      }
      // 例: 誰の勝ちでゲームが終了したかの処理もここで行う
      // if (message.payload.winnerId) { ... }
      break;
    case "challenge": // 他のプレイヤーがダウト宣言したことの通知（画面表示用）
      console.log(
        "🚨 CHALLENGEメッセージを受信 - ダウト宣言:",
        message.payload,
      );
      // 例: 画面に「〇〇がダウトを宣言しました！」と表示
      break;
    default:
      console.warn("不明なメッセージタイプ:", message.type);
  }
}

function jokerChange() {
  //変更したい要素を現在のIDで取得
  const jokerElement = document.getElementById("joker-id");
  let newValue;
  if (back == 0) {
    newValue = "200";
  } else {
    newValue = "0";
  }

  if (jokerElement) {
    // valueを変更
    jokerElement.value = newValue;
  }
}

// ----------------------------------------------------
// 3. メッセージの送信 (passのみ残す)
// ----------------------------------------------------

// ⚠️ sendInitRequest関数は削除しました。

/**
 * 自分のターンをパスする情報をサーバーに送信する関数
 * @param {string} playerId - パスするプレイヤーID
 * @param {string} challengerId - ダウトを宣言したプレイヤーID
 */

function sendPlay(playerId, actualCards, declaredRank, declaredCount) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const message = {
      type: "play", // メッセージタイプ: プレイ
      payload: {
        playerId: playerId,
        // 実際に出した手札（サーバー側で整合性をチェックするのに必要）
        actualCards: actualCards,
        // 申告内容
        declaredRank: declaredRank,
        declaredCount: declaredCount,
      },
    };
    socket.send(JSON.stringify(message));
    console.log("📤 PLAYメッセージを送信:", message);
  } else {
    console.warn("⚠️ WebSocketが接続されていません。");
  }
}

function sendPass(playerId) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const message = {
      type: "pass", // メッセージタイプ: パス
      payload: {
        playerId: playerId,
      },
    };
    socket.send(JSON.stringify(message));
    console.log("📤 PASSメッセージを送信:", message);
  } else {
    console.warn("⚠️ WebSocketが接続されていません。");
  }
}

function sendChallenge(challengerId) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const message = {
      type: "challenge", // メッセージタイプ: チャレンジ（ダウト）
      payload: {
        challengerId: challengerId,
      },
    };
    socket.send(JSON.stringify(message));
    console.log("📤 CHALLENGEメッセージを送信:", message);
  } else {
    console.warn("⚠️ WebSocketが接続されていません。");
  }
}

// ----------------------------------------------------
// 使用例
// ----------------------------------------------------

//connectWebSocket();

// パスを送る機能は残っています
// setTimeout(() => {
//     sendPass('player_A');
// }, 5000);

document.getElementById("play-button").addEventListener(
  "click",
  () => {
    console.log("play");
    jokerChange();
    const selectElement = document.getElementById("declare-num");
    declaredRank = parseInt(selectElement.value, 10);
    playerId = userid;
    console.log(declaredRank);
    if (declaredCount == 1 || declaredCount == 0) {
      if (back == 0) {
        if (declaredRank > 6) {
          //sendPlay(playerId, actualCards, declaredRank, declaredCount);
          console.log("場に出した");
        } else {
          console.log("数字が小さい");
        }
      } else {
        if (declaredRank < 6) {
          //sendPlay(playerId, actualCards, declaredRank, declaredCount);
          console.log("場に出した");
        } else {
          console.log("数字が大きい");
        }
      }
    } else {
      console.log("選択枚数が正しくない");
    }
  },
);

document.getElementById("pass-button").addEventListener(
  "click",
  () => {
    console.log("pass");
    playerId = userid;
    //sendPass(playerId);

    if (back == 0) {
      back = 1;
    } else {
      back = 0;
    }
    console.log("11バックテスト", back);
  },
);

document.getElementById("doubt-button").addEventListener(
  "click",
  () => {
    console.log("doubt");
    challengerId = userid;
    //sendChallenge(challengerId);
  },
);
