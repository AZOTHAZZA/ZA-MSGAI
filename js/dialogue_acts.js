// js/dialogue_acts.js - ユーザー入力を作為に変換する翻訳ロジック

/**
 * ユーザーの入力を解析し、適切な作為 (Act) を選択・実行する。
 * (ボタンクリック、または直接入力されたコマンドを処理)
 * @param {string} input - ユーザーからのコマンド文字列 (例: "MINT USER_A 1000")
 * @returns {object} - 実行結果 ({ newState, log })
 */
function processDialogueAsAct(input) {
    const parts = input.toUpperCase().split(/\s+/);
    const command = parts[0];
    // NOTE: 状態は常に最新のものを globalState から取得
    const state = window.initialState; 

    let actId;
    let params = {};
    
    // ----------------------------------------------------
    // 入力コマンドから経済作為IDへの論理的ルーティング
    // ----------------------------------------------------
    
    // MINT作為 (通貨生成)
    if (command === "MINT") {
        actId = "MINT";
        params = {
            targetAccountId: parts[1], // 例: USER_AUDIT_A
            amount: parseFloat(parts[2]) // 例: 1000
        };
    }
    // TRANSFER作為 (送金)
    else if (command === "TRANSFER") {
        actId = "TRANSFER";
        params = {
            sourceAccountId: parts[1], // 例: USER_AUDIT_A
            amount: parseFloat(parts[2]), // 例: 100
            targetAccountId: parts[3] // 例: USER_AUDIT_B
        };
    } 
    // WITHDRAW作為 (出金/ACT_BRIDGE_OUTへのマッピング)
    else if (command === "WITHDRAW") {
        actId = "ACT_BRIDGE_OUT";
        params = {
            sourceAccountId: parts[1], // 例: USER_AUDIT_A
            amount: parseFloat(parts[2]) // 例: 5000
        };
    }
    // ... その他の作為のルーティングロジックが続く ...

    // ----------------------------------------------------
    // 選択された作為の実行
    // ----------------------------------------------------
    if (actId) {
        // AUDIT_ACTS_DEFINITION と INFRA_ACTS_DEFINITION の両方から定義を探す
        const actDefinition = window.AUDIT_ACTS_DEFINITION[actId] || window.INFRA_ACTS_DEFINITION[actId];
        
        if (actDefinition) {
            // 作為を実行
            const result = actDefinition.execute(state, params); 
            
            // 状態をグローバルで更新（これが口座保存の論理的な実体）
            window.initialState = result.newState;
            
            return result;
        } else {
            return { newState: state, log: [{ status: "FAIL", reason: `作為定義 ${actId} が存在しません` }] };
        }
    } else {
        return { newState: state, log: [{ status: "FAIL", reason: "非論理的な作為（不明なコマンド）" }] };
    }
}

// economic_hub.htmlのインラインスクリプトからアクセスできるように、関数をグローバルスコープに追加
window.processDialogueAsAct = processDialogueAsAct;
