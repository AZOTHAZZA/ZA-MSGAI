// js/dialogue_acts.js - ユーザー入力を作為に変換する翻訳ロジック (グローバル化の再徹底)

/**
 * ユーザーの入力を解析し、適切な作為 (Act) を選択・実行する。
 * @param {string} input - ユーザーからのコマンド文字列
 * @returns {object} - 実行結果 ({ newState, log })
 */
function processDialogueAsAct(input) {
    const parts = input.toUpperCase().split(/\s+/);
    const command = parts[0];
    const state = window.initialState; 

    let actId;
    let params = {};
    
    // MINT作為 (通貨生成)
    if (command === "MINT") {
        actId = "MINT";
        params = { targetAccountId: parts[1], amount: parseFloat(parts[2]) };
    }
    // TRANSFER作為 (送金)
    else if (command === "TRANSFER") {
        actId = "TRANSFER";
        params = { sourceAccountId: parts[1], amount: parseFloat(parts[2]), targetAccountId: parts[3] };
    } 
    // WITHDRAW作為 (出金/ACT_BRIDGE_OUTへのマッピング)
    else if (command === "WITHDRAW") {
        actId = "ACT_BRIDGE_OUT";
        params = { sourceAccountId: parts[1], amount: parseFloat(parts[2]) };
    }
    // ... その他の作為のルーティングロジックが続く ...

    if (actId) {
        // AUDIT_ACTS_DEFINITION が globalScope にあることを前提とする
        // INFRA_ACTS_DEFINITION はまだ定義されていない場合もあるため、AUDIT_ACTS_DEFINITION のみを確認
        const actDefinition = window.AUDIT_ACTS_DEFINITION[actId] || (window.INFRA_ACTS_DEFINITION ? window.INFRA_ACTS_DEFINITION[actId] : null);
        
        if (actDefinition) {
            const result = actDefinition.execute(state, params); 
            
            // 状態をグローバルで更新（論理的保存）
            window.initialState = result.newState;
            
            return result;
        } else {
            return { newState: state, log: [{ status: "FAIL", reason: `作為定義 ${actId} が存在しません` }] };
        }
    } else {
        return { newState: state, log: [{ status: "FAIL", reason: "非論理的な作為（不明なコマンド）" }] };
    }
}

// 関数をグローバルスコープに追加
window.processDialogueAsAct = processDialogueAsAct;
