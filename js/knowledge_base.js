// js/knowledge_base.js

/**
 * ロゴス監査プロトコルの基本情報と知識ベース。
 * 内部ロゴスエンジン（CalcLang）が推論時に参照します。
 */
export const KNOWLEDGE = {
    // ====================================================================
    // DEFINITIONS: プロトコルと主要概念の定義
    // ====================================================================
    DEFINITIONS: {
        PROTOCOL_NAME: "ロゴス監査プロトコル オメガアルファ (Ωα)",
        PROTOCOL_VERSION: "v1.2-CalcLang-Complete", // バージョンを更新
        
        // 監査対象の通貨定義 (論理構造を追加)
        CURRENCIES: [
            // ロゴス内部通貨
            { 
                code: "ALPHA", 
                title: "基軸通貨", 
                purpose: "監査プロトコル内の主要な価値指標。",
                type: "LOGOS_BASE", 
                logic_restriction: { 
                    mint_source: "CORE_BANK_A", 
                    vibe_sensitivity: 1.0,      
                } 
            },
            { 
                code: "BETA", 
                title: "安定化通貨", 
                purpose: "ALHPAの変動を抑えるための補助通貨。",
                type: "LOGOS_STABLE",
                logic_restriction: { 
                    mint_source: "CORE_BANK_A", 
                    vibe_sensitivity: 0.5,      
                } 
            },
            { 
                code: "GAMMA", 
                title: "試験的通貨", 
                purpose: "レート変動のシミュレーションと実験に使用。",
                type: "LOGOS_TEST",
                logic_restriction: { 
                    mint_source: "ANY",          
                    vibe_sensitivity: 2.0,       
                } 
            },

            // 既存金融システムの論理を内部創世
            { 
                code: "USD", 
                title: "米ドル（論理創世）", 
                purpose: "法定通貨ロジックの模倣。",
                type: "FIAT", 
                logic_restriction: { 
                    mint_source: "CORE_BANK_A", 
                    vibe_sensitivity: 0.1,       // 外部法定通貨はロゴス内部のVibeに鈍感
                    max_total_supply: null,      // 論理的に無制限
                } 
            },
            { 
                code: "BTC", 
                title: "ビットコイン（論理創世）", 
                purpose: "供給制限ロジックの模倣。",
                type: "CRYPTO_LIMITED", 
                logic_restriction: { 
                    mint_source: "NETWORK_GENESIS", // Mintは特定の条件でのみ発生
                    vibe_sensitivity: 1.5,
                    max_total_supply: 21000000.00, // 供給量制限の論理を組み込む
                } 
            },
            { 
                code: "MATIC", 
                title: "ポリゴン（論理創世）", 
                purpose: "多機能プロトコルロジックの模倣。",
                type: "CRYPTO_SMART_CONTRACT", 
                logic_restriction: { 
                    mint_source: "CORE_BANK_A", 
                    vibe_sensitivity: 0.8,
                    transaction_cost_multiplier: 1.5, // 外部コスト（ガス代）の論理を模倣
                } 
            },
        ],
    },

    // ... (GUIDELINES, HISTORICAL_SUMMARY などの定義は省略)
};
