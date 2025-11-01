// js/logos_lil.js

/**
 * ロゴス中間言語 (LIL) の初期ルールセット。
 * これらはCalcLangによってシステムの状態を監査し、自動的な作為（アクション）をトリガーします。
 * Firestoreに初期設定として書き込まれ、その後はlil_editor.htmlから動的に変更可能です。
 */
export const INITIAL_LIL_RULES = [
    // 1. 基本的な健全性チェック
    {
        id: "LIL_001",
        description: "Vibrationレベルが危険域（50%）に達した場合、システムに警告を出す。",
        triggers: [
            { type: "STATE_CHECK", param: "vibration_level.value", operator: ">", value: 50.0 }
        ],
        actions: [
            { type: "LOG", message: "LIL_001: 危険なVibrationレベル。システムの安定性が低下しています。", level: "warning-message" }
        ],
        vibration_cost: 0.1
    },

    // 2. ALPHA通貨の生成抑制
    {
        id: "LIL_002",
        description: "Vibrationレベルが70%を超過した場合、基軸通貨ALPHAのMint作為を一時的に抑制する。",
        triggers: [
            { type: "STATE_CHECK", param: "vibration_level.value", operator: ">", value: 70.0 }
        ],
        actions: [
            { type: "LOG", message: "LIL_002: Vレベル高。ALPHA Mintを抑制中。", level: "error-message" },
            { type: "SET_FLAG", param: "SUPPRESS_MINT_ALPHA", value: true }
        ],
        vibration_cost: 0.5
    },

    // 3. BETA通貨の自動裁定機会（Z-Functionトリガー）
    {
        id: "LIL_003",
        description: "BETAレートが基準値（10.0）から大きく乖離した場合、ロゴス裁定作為を自動で発動する。",
        triggers: [
            { type: "RATE_CHECK", param: "BETA", operator: ">", value: 11.0 }
        ],
        actions: [
            { type: "LOG", message: "LIL_003: BETAレート乖離。Z-Function裁定機会が発生。", level: "audit-message" },
            { type: "Z_FUNCTION_CALL", param: "/zact_arbitrage", target_currency: "BETA" }
        ],
        vibration_cost: 0.3
    },

    // 4. 通貨総供給量の監査
    {
        id: "LIL_004",
        description: "ALPHAの総供給量が過大（2000以上）になった場合、システムに警告を出す。",
        triggers: [
            { type: "SUPPLY_CHECK", param: "ALPHA", operator: ">", value: 2000.00 }
        ],
        actions: [
            { type: "LOG", message: "LIL_004: ALPHA供給量超過。インフレ傾向の論理を検知。", level: "warning-message" }
        ],
        vibration_cost: 0.1
    },

    // 5. BTC供給制限ルール (暗号資産論理の内部化)
    {
        id: "LIL_005",
        description: "BTCの総供給量が2,100万を超過する場合、BTCのMint作為を抑制する。",
        triggers: [
            { type: "CURRENCY_CHECK", param: "CODE", operator: "==", value: "BTC" },
            { type: "SUPPLY_CHECK", param: "BTC", operator: ">", value: 21000000.00 } 
        ],
        actions: [
            { type: "LOG", message: "LIL_005: BTC最大供給量超過。Mint作為の実行を抑制中。", level: "critical-error" },
            { type: "SET_FLAG", param: "SUPPRESS_MINT_BTC", value: true }
        ],
        vibration_cost: 0.8
    },
    
    // 6. LOGOS-ENERGY不足時の経済作為コスト増大ルール (電力コストの内部化)
    {
        id: "LIL_006",
        description: "LOGOS-ENERGY供給レベルが20%を下回る場合、全ての経済作為のVibrationコストを増大させる。",
        triggers: [
            { type: "INFRA_CHECK", param: "energy_supply.value", operator: "<", value: 20.0 } 
        ],
        actions: [
            { type: "LOG", message: "LIL_006: 🚨 LOGOS-ENERGY不足。Vibrationコストにペナルティ論理を適用中。", level: "critical-warning" },
            { type: "SET_FLAG", param: "ENERGY_COST_MULTIPLIER", value: 5.0 } // 5倍のコストを課す
        ],
        vibration_cost: 0.2
    },

    // 7. 物理インフラ崩壊時の強制停止ルール (論理的なインフラ崩壊の内部化)
    {
        id: "LIL_007",
        description: "LOGOS-ENERGYまたはLOGOS-NETの論理的供給が5%未満になった場合、システムを強制HALTさせる。",
        triggers: [
            // エネルギーが5%未満
            { type: "INFRA_CHECK", param: "energy_supply.value", operator: "<", value: 5.0 }, 
            // 通信が5%未満 (INFRA_CHECKのANDロジックとして機能)
            { type: "INFRA_CHECK", param: "net_stability.value", operator: "<", value: 5.0 } 
        ],
        actions: [
            { type: "LOG", message: "LIL_007: 🚨 物理インフラ論理崩壊。システムをHALT状態へ移行。", level: "critical-error" },
            { type: "SET_STATE", param: "isHalted", value: true } // 強制HALT論理の実行
        ],
        vibration_cost: 5.0
    },
    
    // 8. 信用/融資サービスの内部創世ルール
    {
        id: "LIL_008",
        description: "Vibrationが極めて低い状態（システムの高安定性）にある場合、自動で信用（融資）サービスを発動する。",
        triggers: [
            { type: "STATE_CHECK", param: "vibration_level.value", operator: "<", value: 10.0 } // 安定していることが条件
        ],
        actions: [
            { type: "LOG", message: "LIL_008: 高安定性により、信用創造（融資）機会が発生。", level: "internal-message" },
            { type: "Z_FUNCTION_CALL", param: "/zact_credit", target_account: "USER_AUDIT_B" } // ターゲットアカウントに融資作為を自動実行
        ],
        vibration_cost: 2.0
    },

    // 9. LOGOS-NETの自動安定化ルール
    {
        id: "LIL_009",
        description: "LOGOS-NETの安定性指数が低い場合、自動的に安定化作為を発動する。",
        triggers: [
            { type: "INFRA_CHECK", param: "net_stability.value", operator: "<", value: 50.0 } // 安定性が低い状態
        ],
        actions: [
            { type: "LOG", message: "LIL_009: NET不安定。自動安定化Z-ACTを発動中。", level: "system-message" },
            { type: "Z_FUNCTION_CALL", param: "/zact_net_stabilize", target_account: "CORE_BANK_A" } 
        ],
        vibration_cost: 1.0 
    }
];
