// 接続先のWebSocketサーバーのURLを設定してください
const SERVER_URL = 'ws://localhost:8080/game'; 

// 最大プレイ人数を設定
const MAX_PLAYERS = 5; 

// ユーザーがリーダーかどうかを判定するフラグ (ここでは仮にtrue)
const isLeader = true; 

// ----------------------------------------------------
// 状態管理変数
// ----------------------------------------------------

/**
 * ゲームの状態を一元管理する変数
 */
let gameState = {
    // オプションルールは全て OFF (false) で初期化
    rules: {
        '4止め': false,
        '5すき': false,
        '7渡し': false,
        '9リバース': false,
        '10捨て': false,
        '大革命': false,
        '下剋上': false
    },
    // サーバーから受信する現在のプレイヤー人数
    playerCount: 0,
    // サーバーから受信するゲーム開始状態
    gameStarted: false 
};

// HTMLで変更されたルールを一時的に保持する変数（最終送信までサーバーには送らない）
let pendingRuleChanges = { ...gameState.rules };

let websocket;

// ----------------------------------------------------
// ページ読み込み後の初期化処理
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1. WebSocket接続を開始
    connectWebSocket();
    
    // 2. HTMLのルール変更イベントにリスナーを設定
    setupRuleChangeListeners();
    
    // 3. ゲーム開始ボタンにイベントリスナーを設定
    setupStartButton();
});

// ----------------------------------------------------
// HTMLイベントリスナー設定
// ----------------------------------------------------

/**
 * HTML上のルールスイッチの変更を監視し、保留中のルールを更新する
 */
function setupRuleChangeListeners() {
    const switches = document.querySelectorAll('.switch-input');

    switches.forEach(switchElement => {
        const ruleName = switchElement.id.replace('rule-', '');

        // 初期状態を全て 'off' (checked=false) に設定
        switchElement.checked = false;

        switchElement.addEventListener('change', (event) => {
            if (!isLeader) {
                // リーダーではない場合、変更をキャンセルし、元の状態に戻す
                event.target.checked = !event.target.checked;
                alert('ルールを変更できるのは部屋のリーダーのみです。');
                return;
            }

            // リーダーの場合、保留中のルールを更新
            const newState = event.target.checked;
            updateRule(ruleName, newState); 
        });
    });
}

/**
 * ゲーム開始ボタンのイベントリスナーを設定する
 */
function setupStartButton() {
    const startButton = document.querySelector('.start-btn');
    
    if (startButton) {
        startButton.addEventListener('click', () => {
            if (!isLeader) {
                alert('ゲームを開始できるのはリーダーのみです。');
                return;
            }
            if (gameState.playerCount < MAX_PLAYERS) {
                alert('まだ人数が揃っていません。(' + gameState.playerCount + '/' + MAX_PLAYERS + ')');
                return;
            }
            
            // 人数が揃っており、リーダーが押した場合、最終ルールを送信
            console.log("リーダーが開始ボタンを押しました。最終ルールを送信します。");
            sendFinalRules();
        });
    }
}

// ----------------------------------------------------
// WebSocket 接続と受信処理
// ----------------------------------------------------

/**
 * WebSocket接続を確立し、イベントリスナーを設定する
 */
function connectWebSocket() {
    if (websocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
        websocket.close();
    }
    
    websocket = new WebSocket(SERVER_URL);

    websocket.onopen = () => {
        console.log('WebSocket 接続成功');
        sendPlayerCount(1); // 自身の入室をサーバーに通知
    };

    websocket.onmessage = (event) => {
        console.log('メッセージ受信:', event.data);
        
        try {
            const receivedData = JSON.parse(event.data);
            
            // 人数情報の更新
            if (receivedData.playerCount !== undefined) {
                gameState.playerCount = receivedData.playerCount;
                console.log('現在の人数: ' + gameState.playerCount + ' / ' + MAX_PLAYERS);
                
                // 5人集まったことをチェックし、ゲーム開始をトリガー
                if (gameState.playerCount === MAX_PLAYERS && !gameState.gameStarted) {
                    console.log('5人揃いました！最終ルールを送信し、ゲーム開始を通知します...');
                    sendFinalRules();
                }
            }
            
            // ゲーム開始状態の更新
            if (receivedData.gameStarted !== undefined) {
                gameState.gameStarted = receivedData.gameStarted;
                if (gameState.gameStarted) {
                    console.log('サーバー側でゲームが開始されました！');
                }
            }
            
        } catch (e) {
            console.error('受信データのパースエラー:', e);
        }
    };

    websocket.onerror = (error) => {
        console.error('WebSocket エラー:', error);
    };

    websocket.onclose = (event) => {
        console.log('WebSocket 接続終了: コード ' + event.code + ', 理由 "' + event.reason + '"');
    };
}

// ----------------------------------------------------
// クライアント側（ルール保留処理）
// ----------------------------------------------------

/**
 * ルールを変更し、一時的に保持する（サーバーには即時送信しない）
 * @param {string} ruleName - 変更するルール名 (e.g., '4止め')
 * @param {boolean} newValue - 新しいブール値 (true/false)
 */
function updateRule(ruleName, newValue) {
    if (typeof newValue !== 'boolean') {
        console.error('ルール "' + ruleName + '" の値はブール値 (true/false) である必要があります。');
        return;
    }

    if (pendingRuleChanges.hasOwnProperty(ruleName)) {
        pendingRuleChanges[ruleName] = newValue;
        console.log('ルール "' + ruleName + '" が "' + newValue + '" に変更されました (保留中)');
    } else {
        console.warn('無効なルール名: ' + ruleName);
    }
}

// ----------------------------------------------------
// 送信処理（人数、最終ルール）
// ----------------------------------------------------

/**
 * 人数の変更イベントをサーバーに即時送信する (+1: 入室, -1: 退室など)
 * @param {number} change - 人数の増減
 */
function sendPlayerCount(change) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        const message = {
            type: 'player_count_update',
            change: change 
        };
        websocket.send(JSON.stringify(message));
        console.log('人数変更をサーバーに即時送信:', message);
    } else {
        console.warn('WebSocketが接続されていません。');
    }
}

/**
 * 最終的に確定したルール変更をサーバーに送信し、ゲーム開始を通知する
 * （5人集まった時点、またはリーダーが開始ボタンを押したときに呼び出されます）
 */
function sendFinalRules() {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        // 固定ルール（8切り、11バック、革命）も結合して送信
        const finalRules = { 
            '8切り': true, 
            '11バック': true, 
            '革命': true,
            ...pendingRuleChanges // 変更可能なオプションルール
        };
        
        // 送信するメッセージの構造
        const message = {
            type: 'final_rules_set',
            rules: finalRules, // 最終ルール全体を送信
            gameStarted: true 
        };
        websocket.send(JSON.stringify(message));
        console.log('最終的な確定ルールとゲーム開始情報をサーバーに送信:', message);
        
        // ローカルのゲーム状態を更新
        gameState.rules = { ...finalRules }; // 固定ルールも含む最終ルールで更新
        gameState.gameStarted = true;
    } else {
        console.warn('WebSocketが接続されていません。');
    }
}