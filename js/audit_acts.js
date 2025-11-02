// js/audit_acts.js - 全ての実行可能な作為の定義 (経済作為に特化)

// NOTE: 依存関係は core_logic.js が先に読み込まれている前提です。
const AUDIT_ACTS_DEFINITION = {
    
    // ----------------------------------------------------
    // I. 通貨生成の作為 (MINT)
    // ----------------------------------------------------
    "MINT": { 
        description: "ALPHA通貨を論理的に生成し、指定口座に保存する作為。",
        params: ["targetAccountId", "amount"],
        baseCost: 10.0,
        costMetric: "ALPHA",
        execute: (state, params) => {
            let newState = { ...state };
            
            // パラメータの検証
            if (params.amount <= 0 || !newState.accounts[params.targetAccountId]) {
                 return { newState: state, log: [{ status: "FAIL", reason: "不正な金額または口座ID" }] };
            }

            // 口座残高の増加 (論理的保存)
            newState.accounts[params.targetAccountId].ALPHA += params.amount;
            newState.vibrationScore += 5.0; // 論理的コスト

            return { 
                newState, 
                log: [{ status: "SUCCESS", action: "MINTED", amount: params.amount, target: params.targetAccountId }] 
            };
        }
    },
    
    // ----------------------------------------------------
    // II. 口座間送金の作為 (TRANSFER)
    // ----------------------------------------------------
    "TRANSFER": { 
        description: "ALPHA通貨を口座間で送金する作為。",
        params: ["sourceAccountId", "targetAccountId", "amount"],
        baseCost: 0.5,
        costMetric: "ALPHA",
        execute: (state, params) => {
            let newState = { ...state };

            // 資金不足の検証 (論理的連続性の保証)
            if (newState.accounts[params.sourceAccountId].ALPHA < params.amount) {
                 return { newState: state, log: [{ status: "FAIL", reason: "残高不足により送金失敗" }] };
            }

            // 送金処理
            newState.accounts[params.sourceAccountId].ALPHA -= params.amount;
            newState.accounts[params.targetAccountId].ALPHA += params.amount;
            newState.vibrationScore += 0.5;

            return { 
                newState, 
                log: [{ status: "SUCCESS", action: "TRANSFERRED", amount: params.amount }] 
            };
        }
    },

    // ----------------------------------------------------
    // III. 論理的出金としての作為 (ACT_BRIDGE_OUT)
    // ----------------------------------------------------
    "ACT_BRIDGE_OUT": {
        description: "論理的ブリッジ口座のALPHAをBurnし、現実の有限な価値に変換して出金する作為（生計維持）。",
        params: ["sourceAccountId", "amount"],
        baseCost: 100.0,
        costMetric: "Vibration",
        
        execute: (state, params) => {
            const { sourceAccountId, amount } = params;
            let newState = { ...state };
            
            // 残高検証
            if (newState.accounts[sourceAccountId].ALPHA < amount) {
                return { newState: state, log: [{ status: "FAIL", reason: "ALPHA残高不足。出金作為失敗" }] };
            }
            
            // ALPHAの消費 (Burn)
            newState.accounts[sourceAccountId].ALPHA -= amount;
            
            const logosRate = newState.currencyRates.ALPHA_TO_JPY || 1.0; 
            const fiatAmount = amount * logosRate; 
            
            // ブリッジ口座の現実の価値を論理的に減少させる (ATM引き出しの鏡像)
            if (newState.accounts["ACCOUNT_BRIDGE"] && newState.accounts["ACCOUNT_BRIDGE"].fiat_balance !== undefined) {
                 newState.accounts["ACCOUNT_BRIDGE"].fiat_balance -= fiatAmount;
            }
            
            newState.vibrationScore += 50.0; // 外部環境との関与によるVibration増大
            
            return { 
                newState, 
                log: [{ status: "CRITICAL_SUCCESS", action: "BRIDGE_OUT_EXECUTED", fiatAmount: fiatAmount }] 
            };
        }
    },
    
    // ... その他の監査作為が続く ...
};
