// js/logos_lil.js - ロゴス監査プロトコルの低レベル論理 (LIL)

// LIL監査プロトコルの定数と論理関数を定義します。
// exportキーワードを削除し、このファイルが通常のスクリプトとして読み込まれるようにします。

const LIL_AUDIT_THRESHOLDS = {
    VIBRATION_CRITICAL: 8000,
    VIBRATION_HIGH: 5000,
    ALPHA_LIQUIDITY_WARNING: 1000000, // システム全体のALPHA流動性警告
    BRIDGE_OUT_WARNING: 50000,        // 1回のブリッジアウトの閾値
    LABOR_DEMAND_STAGNATION: 10000,   // 労働需要スコアの最低値
};

/**
 * LIL監査ルールを適用し、システム状態の論理的連続性を検証します。
 * @param {object} state - 現在のシステム状態
 * @returns {Array<object>} - 発動されたLIL監査ログ
 */
function applyLILAudits(state) {
    const auditLogs = [];
    
    // R1: 孫悟空活動レベル (Vibration) の監査
    if (state.vibrationScore > LIL_AUDIT_THRESHOLDS.VIBRATION_CRITICAL) {
        auditLogs.push({
            id: "LIL_R1_VIB_CRITICAL",
            level: "HALT_IMMEDIATE",
            message: "Vibrationが臨界点を超過。論理的連続性 HALT が強制されます。",
        });
        state.systemState.isHalted = true; // 強制HALT
    } else if (state.vibrationScore > LIL_AUDIT_THRESHOLDS.VIBRATION_HIGH) {
        auditLogs.push({
            id: "LIL_R2_VIB_HIGH",
            level: "WARNING",
            message: "Vibrationが高水準。ACT_Z_REMEDIATE の実行が必要です。",
        });
    }

    // R2: 生計維持のためのブリッジアウト監査
    // ACT_BRIDGE_OUTが頻繁に、または大量に行われた場合の警告
    // 状態変更は audit_acts.js 側で行われるが、ここでは LIL 警告を発生させる
    // NOTE: このルールは、ブリッジアウト作為のログが追跡されていることを前提とする。

    // R3: 労働需要の監査
    if (state.logos_labor_pool.total_demand_score < LIL_AUDIT_THRESHOLDS.LABOR_DEMAND_STAGNATION) {
        auditLogs.push({
            id: "LIL_R3_LABOR_STAGNATION",
            level: "CRITICAL_WARNING",
            message: "論理的労働需要の停滞。ACT_ASSIGN_LABOR の強制起動が必要です。",
        });
    }

    return auditLogs;
}

// LILの定義をグローバルスコープに追加し、他のスクリプトからアクセスできるようにする
window.LIL_AUDIT_THRESHOLDS = LIL_AUDIT_THRESHOLDS;
window.applyLILAudits = applyLILAudits;
