// js/audit_acts.js

import { 
    getCurrentState, 
    saveSystemState, 
    addVibration, 
    logToConsole, 
    LIL_FLAGS, // LILフラグをインポート
    getCurrencyLogic, // 通貨の論理制限を取得
    VIBRATION_LIMIT 
} from './core_logic.js'; 

// ====================================================================
// 1. 通貨送金作為 (Transfer Currency Act)
// ====================================================================

/**
 * 通貨の送金を実行します。
 */
export async function actTransferCurrency(senderId, recipientId, currency, amount) {
    if (getCurrentState().isHalted) {
        logToConsole(`🚨 [AUDIT/HALT 拒否]: システムがHALT状態のため、送金作為は拒否されました。`, 'error-message');
        return;
    }
    
    const state = getCurrentState();
    const sender = state.accounts.find(a => a.id === senderId);
    const recipient = state.accounts.find(a => a.id === recipientId);
    
    const validation = {
        amount: parseFloat(amount),
        error: null
    };

    if (!sender || !recipient) {
        validation.error = "送信者または受信者のアカウントIDが無効です。";
    } else if (isNaN(validation.amount) || validation.amount <= 0) {
        validation.error = "送金額は正の値である必要があります。";
    } else if ((sender[currency] || 0) < validation.amount) {
        validation.error = `アカウント ${senderId} の ${currency} 残高が不足しています。`;
    }

    if (validation.error) {
        logToConsole(`❌ [AUDIT/TRANSFER 拒否]: ${validation.error}`, 'error-message');
        await addVibration(0.2); // 失敗したが、作為試行のコスト
        return;
    }

    // 作為の実行
    sender[currency] -= validation.amount;
    recipient[currency] = (recipient[currency] || 0) + validation.amount;
    
    const newAccounts = state.accounts.map(acc => {
        if (acc.id === senderId) return sender;
        if (acc.id === recipientId) return recipient;
        return acc;
    });

    await saveSystemState({ accounts: newAccounts });
    logToConsole(`[AUDIT/TRANSFER]: アカウント **${senderId}** から **${recipientId}** へ ${validation.amount.toFixed(2)} ${currency} を送金しました。`, 'audit-message');
    
    // LIL_006による電力コスト増倍率の適用
    const baseVibeCost = 1.0;
    const finalVibeCost = baseVibeCost * LIL_FLAGS.ENERGY_COST_MULTIPLIER; // 増倍率を乗算
    
    await addVibration(finalVibeCost);
}

// ====================================================================
// 2. 通貨生成作為 (Mint Currency Act)
// ====================================================================

/**
 * 通貨の生成 (Mint) を実行します。
 */
export async function actMintCurrency(recipientId, currency, amount) {
    if (getCurrentState().isHalted) {
        logToConsole(`🚨 [AUDIT/HALT 拒否]: システムがHALT状態のため、Mint作為は拒否されました。`, 'error-message');
        return;
    }

    const state = getCurrentState();
    const recipient = state.accounts.find(a => a.id === recipientId);
    const currencyLogic = getCurrencyLogic(currency); 
    
    const validation = {
        amount: parseFloat(amount),
        error: null
    };

    if (!recipient) {
        validation.error = "受取人のアカウントIDが無効です。";
    } else if (isNaN(validation.amount) || validation.amount <= 0) {
        validation.error = "生成額は正の値である必要があります。";
    }

    if (validation.error) {
        logToConsole(`❌ [AUDIT/MINT 拒否]: ${validation.error}`, 'error-message');
        await addVibration(0.2);
        return;
    }

    // =========================================================
    // CalcLang/LIL による自己監査実行: Mint作為の制御
    // =========================================================
    
    // LIL_002監査 (Vibration超過によるALPHA生成抑制)
    if (currency === 'ALPHA' && LIL_FLAGS.SUPPRESS_MINT_ALPHA) {
        logToConsole(`🚨 [AUDIT/LIL_002 拒否]: Vレベル超過のため、ALPHA生成作為はLILによって拒否されました。`, 'error-message');
        await addVibration(0.5); 
        return;
    }
    
    // LIL_005監査 (BTC最大供給量超過によるMint抑制)
    // LILがSUPPRESS_MINT_BTCフラグを立てていれば拒否
    if (currency === 'BTC' && LIL_FLAGS.SUPPRESS_MINT_BTC) { 
        logToConsole(`🚨 [AUDIT/LIL_005 拒否]: BTC最大供給量（2100万）を超過しているため、Mint作為はCalcLang/LILによって拒否されました。`, 'error-message');
        await addVibration(1.0); 
        return;
    }

    // 通貨固有の生成者制限監査 (USD/ALPHAはCORE_BANK_Aのみ、BTCはNETWORK_GENESISなど)
    // Mint sourceが'ANY'でない場合、実行者を制限する
    if (currencyLogic && currencyLogic.mint_source && currencyLogic.mint_source !== 'ANY') {
         // ここでは簡略化し、CORE_BANK_A以外の生成を阻止するロジックをシミュレート
         if (recipientId !== 'CORE_BANK_A' && currencyLogic.mint_source !== 'NETWORK_GENESIS') {
            logToConsole(`🚨 [AUDIT/MINT_SOURCE 拒否]: ${currency} の論理は **CORE_BANK_A** のみが生成できる制限があるため、拒否されました。`, 'error-message');
            await addVibration(0.5); 
            return;
         }
    }

    // 作為の実行（通貨の生成）
    recipient[currency] = (recipient[currency] || 0) + validation.amount;
    
    const newAccounts = state.accounts.map(acc => {
        if (acc.id === recipientId) return recipient;
        return acc;
    });

    await saveSystemState({ accounts: newAccounts });
    logToConsole(`[AUDIT/MINT]: アカウント **${recipientId}** へ ${validation.amount.toFixed(2)} ${currency} が新しく**生成**されました。`, 'audit-message');
    
    // LIL_006による電力コスト増倍率の適用
    const baseVibeCost = 3 * (currencyLogic?.vibe_sensitivity || 1.0);
    const finalVibeCost = baseVibeCost * LIL_FLAGS.ENERGY_COST_MULTIPLIER; // 増倍率を乗算
    
    await addVibration(finalVibeCost);
}
