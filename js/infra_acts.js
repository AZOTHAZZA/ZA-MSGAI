// js/infra_acts.js

import { 
    getCurrentState, 
    saveSystemState, 
    addVibration, 
    logToConsole,
    getCurrentUser 
} from './core_logic.js'; 

/**
 * LOGOS-ENERGY (電力) または LOGOS-NET (通信) の論理的供給レベルを調整する作為。
 * @param {string} infrastructureType - 'ENERGY' または 'NET'
 * @param {number|null} explicitAmount - 明示的に設定する値 (0-100)。Z-Functionから呼び出される場合に利用。
 */
export async function actAdjustSupply(infrastructureType, explicitAmount = null) {
    if (getCurrentState().isHalted) {
        logToConsole(`🚨 [INFRA ACT/HALT 拒否]: システムがHALT状態のため、インフラ作為は拒否されました。`, 'error-message');
        return;
    }
    
    const inputId = infrastructureType === 'ENERGY' ? 'energy_act_amount' : 'net_act_amount';
    const inputElement = document.getElementById(inputId);
    const amount = explicitAmount !== null ? explicitAmount : parseFloat(inputElement?.value);

    if (isNaN(amount) || amount < 0 || amount > 100) {
        logToConsole(`[ERROR/INFRA]: 有効な供給量（0-100%）を入力してください。`, 'error-message');
        return;
    }

    const state = getCurrentState();
    const targetKey = infrastructureType === 'ENERGY' ? 'energy_supply' : 'net_stability';
    const logName = infrastructureType === 'ENERGY' ? '電力供給 (LOGOS-ENERGY)' : '通信安定性 (LOGOS-NET)';
    const vibeCost = 1.0; 

    // 作為の実行 (論理的供給レベルの変更)
    const newInfrastructureState = {
        ...state.infrastructure,
        [targetKey]: { 
            value: amount, 
            last_change: Date.now() 
        }
    };
    
    await saveSystemState({ infrastructure: newInfrastructureState });

    // 作為はVibration（論理的コスト）を発生させる
    await addVibration(vibeCost); 

    logToConsole(`[INFRA ACT]: **${logName}** の論理的供給レベルが **${amount.toFixed(1)}%** に調整されました。Vibration +${vibeCost.toFixed(2)}。`, 'system-message');
}
