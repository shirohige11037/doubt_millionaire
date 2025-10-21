/*
ゲーム画面用のスクリプト
 */
// 接続するWebSocketサーバーのURL
const WS_URL = "ws://localhost:8080/game";

let socket;

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
 */
function handleIncomingMessage(message) {
  switch (message.type) {
    case "init": // 👈 受信専用として残す
      console.log(
        "✨ INITメッセージを受信 - ゲームの初期情報:",
        message.payload,
      );
      // 例: 手札の表示、ルールの設定など
      const { hand, rules, playerOrder } = message.payload;
      console.log("手札:", hand);
      console.log("ルール:", rules);
      break;
    case "turn":
      console.log(
        "🎲 TURNメッセージを受信 - 現在のターン情報:",
        message.payload,
      );
      break;
    case "play":
      console.log("🃏 PLAYメッセージを受信 - プレイ情報:", message.payload);
      break;
    case "pass":
      console.log("🚫 PASSメッセージを受信 - パス情報:", message.payload);
      break;
    case "play": // 他のプレイヤーのカード出し/申告情報
      console.log("🃏 PLAYメッセージを受信 - プレイ情報:", message.payload);
      // 例: UIに申告内容（どの数字を何枚）を表示
      const { playerId, declaredRank, declaredCount } = message.payload;
      console.log(
        `${playerId} が ${declaredRank} を ${declaredCount} 枚と申告しました。`,
      );
      break;
    case "result": // ダウトの成否、ペナルティ、ゲーム結果などの情報
      console.log(
        "🎉 RESULTメッセージを受信 - ダウト結果/ゲーム結果:",
        message.payload,
      );
      const { isChallengeSuccessful, loserId, cardsToTake } = message.payload;

      if (isChallengeSuccessful !== undefined) {
        // ダウトの結果処理
        if (isChallengeSuccessful) {
          console.log(
            `ダウト成功！ ${loserId} が失敗し、場札をすべて引き取ります。`,
          );
        } else {
          console.log(`ダウト失敗... ${loserId} が場札をすべて引き取ります。`);
        }
        // ペナルティで手札に追加されたカードをUIに反映する処理など
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
