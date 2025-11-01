// js/dialogue_acts.js

import { 
    getCurrentState, 
    addVibration, 
    logToConsole, 
    saveSystemState, 
    getCurrencyLogic 
} from './core_logic.js'; 

// ====================================================================
// Z-FUNCTION 定義: LILや対話からトリガーされる自律作為
// ====================================================================

const Z_FUNCTIONS = {
    // 1. ロゴス裁定作為 (Z-ACT ARBITRAGE) - LIL_003からトリガー
    zactArbitrage: {
        pattern: /^\/zact_arbitrage$/i, 
        execute: async (targetCurrency) => {
            const state = getCurrentState();
            const currency = targetCurrency || 'BETA'; 
            const rate = state.currency_rates[currency] || 0;
            const coreBank = state.accounts.find(a => a.id === 'CORE_BANK_A');
            const targetAccount = state.accounts.find(a => a.id === 'USER_AUDIT_B');
            
            if (rate <= 11.0) {
                 return { result: `[SYSTEM ACT]: ${currency} のレート (${rate.toFixed(4)}) は裁定閾値未満であり、裁定機会は消滅しました。` };
            }

            const arbitrageAmount = 10.0; // 裁定取引量
            
            // 裁定論理: 乖離したレートを利用した取引をシミュレート
            coreBank.ALPHA += arbitrageAmount * 0.1; // システムに利益が還元される（簡略化）
            targetAccount[currency] += arbitrageAmount; // 裁定者が通貨を取得（簡略化）

            await saveSystemState({ accounts: state.accounts }); 

            logToConsole(`[Z-ACT/ARBITRAGE]: **${currency}** のレート乖離に基づき、自動裁定作為を実行。Vibration +5.0。`, 'audit-message');
            
            await addVibration(5.0); 
            
            return { result: `**[SYSTEM ACT]:** ロゴス裁定作為が完了しました。Vibrationが ${5.0} 増加。` };
        }
    },
    
    // 2. ロゴス信用創造作為 (Z-ACT CREDIT) - LIL_008からトリガー
    zactCredit: {
        pattern: /^\/zact_credit$/i, 
        execute: async (targetAccount) => { // targetAccount は LIL_008から渡される
            const state = getCurrentState();
            const recipientId = targetAccount || 'USER_AUDIT_B'; 
            const loanAmount = 50.0;
            const currency = 'ALPHA';
            const coreBank = state.accounts.find(a => a.id === 'CORE_BANK_A');
            const recipient = state.accounts.find(a => a.id === recipientId);

            if (!recipient) {
                 return { result: `[SYSTEM ACT]: 融資先アカウント ${recipientId} が存在しません。` };
            }
            
            // 信用創造論理: CORE_BANK_AからRecipientへ通貨をTransferし、融資をシミュレート
            coreBank.ALPHA -= loanAmount; 
            recipient.ALPHA += loanAmount;
            
            await saveSystemState({ accounts: state.accounts }); 

            logToConsole(`[Z-ACT/CREDIT]: **CORE_BANK_A**から**${recipientId}**へ ${loanAmount.toFixed(2)} ${currency} の信用創造（融資）が実行されました。`, 'audit-message');
            
            // Z-ACTの実行による大きなVibrationコストを加算
            await addVibration(10.0); 
            
            return { result: `**[SYSTEM ACT]:** ロゴス信用創造作為が完了しました。Vibrationが ${10.0} 増加。` };
        }
    },

    // 3. LOGOS-NET 自動安定化作為 (Z-ACT NET STABILIZE) - LIL_009からトリガー
    zactNetStabilize: {
        pattern: /^\/zact_net_stabilize$/i, 
        execute: async () => {
            const state = getCurrentState();
            const increaseAmount = 15.0; // 安定性を15%回復させる作為
            
            const currentNet = state.infrastructure.net_stability.value;
            const newNet = Math.min(100.0, currentNet + increaseAmount); // 最大100%まで

            // インフラとしての作為をcore_logicに保存
            const newInfrastructureState = {
                ...state.infrastructure,
                net_stability: { 
                    value: newNet, 
                    last_change: Date.now() 
                }
            };
            
            await saveSystemState({ infrastructure: newInfrastructureState }); 

            logToConsole(`[Z-ACT/NET_STABILIZE]: LOGOS-NET論理安定性が ${increaseAmount.toFixed(1)}% 回復しました。`, 'system-message');
            
            // 安定化のための論理コスト
            await addVibration(8.0); 
            
            return { result: `**[SYSTEM ACT]:** LOGOS-NET自動安定化作為が完了しました。` };
        }
    }
    // ... 他のZ-FUNCTIONSをここに追加可能
};


/**
 * LILによってトリガーされたZ-FUNCTION (裁定作為や信用創造など) を実行します。
 * @param {object} state - 現在のシステム状態。
 */
export async function executeLogosLILZActs(state) {
    const rulesWithZCall = state.LILRules?.filter(rule => 
        rule.actions.some(a => a.type === 'Z_FUNCTION_CALL')
    ) || [];

    for (const rule of rulesWithZCall) {
        // LIL_003のように、トリガーロジックはcore_logicのexecuteLogosLILで既にチェックされていると仮定
        // ここでは、LILRuleが発動したと仮定してZ-FUNCTIONを実行する
        
        rule.actions.forEach(async (action) => {
            if (action.type === 'Z_FUNCTION_CALL') {
                const zFuncName = Object.keys(Z_FUNCTIONS).find(key => 
                    Z_FUNCTIONS[key].pattern.test(action.param)
                );

                if (zFuncName) {
                    const zAct = Z_FUNCTIONS[zFuncName];
                    const target = action.target_currency || action.target_account; 
                    
                    // Z-FUNCTION実行 (LILにより作為が発動)
                    await zAct.execute(target); 
                }
            }
        });
    }
}

// ====================================================================
// DIALOGUE ACTS 定義: ユーザーコマンドと推論
// ====================================================================

const DIALOGUE_ACTS = {
    // 1. システムステータス照会
    status: {
        pattern: /^\/status$/i,
        execute: (state) => {
            const vLevel = state.vibration_level.value.toFixed(1);
            const isHalted = state.isHalted ? "HALT中 ❌" : "稼働中 ✅";
            const energy = state.infrastructure.energy_supply.value.toFixed(1);
            const net = state.infrastructure.net_stability.value.toFixed(1);
            
            return `
                **ロゴス監査プロトコル ステータス:**
                - 状態: ${isHalted}
                - Vibrationレベル: ${vLevel}%
                - LOGOS-ENERGY供給: ${energy}%
                - LOGOS-NET安定性: ${net}%
            `;
        }
    },
    
    // 2. 通貨レート照会
    rates: {
        pattern: /^\/rates$/i,
        execute: (state) => {
            let result = "**現在のロゴスレート (vs ALPHA):**\n";
            for (const key in state.currency_rates) {
                if (key !== 'ALPHA') {
                    result += `- 1 ${key} = ${state.currency_rates[key].toFixed(4)} ALPHA\n`;
                }
            }
            return result;
        }
    },

    // 3. 通貨情報照会
    currencyInfo: {
        pattern: /^\/info\s+(\w+)$/i,
        execute: (state, match) => {
            const currencyCode = match[1].toUpperCase();
            const logic = getCurrencyLogic(currencyCode);
            
            if (!logic) {
                return `通貨コード **${currencyCode}** の論理情報は見つかりません。`;
            }

            const totalSupply = state.currencies_total_supply[currencyCode] || 0;
            const maxSupply = logic.max_total_supply ? logic.max_total_supply.toLocaleString() : "論理的に無制限";
            
            return `
                **通貨情報: ${currencyCode}**
                - タイプ: ${logic.type || '未定義'}
                - Mintソース論理: ${logic.mint_source}
                - Vibration感度: ${logic.vibe_sensitivity.toFixed(1)}
                - 現在の総供給量: ${totalSupply.toFixed(4)}
                - 最大総供給量論理: ${maxSupply}
            `;
        }
    },

    // 4. アカウント残高照会
    balance: {
        pattern: /^\/balance\s+(\w+)$/i,
        execute: (state, match) => {
            const accountId = match[1].toUpperCase();
            const account = state.accounts.find(a => a.id === accountId);
            
            if (!account) {
                return `アカウントID **${accountId}** は存在しません。`;
            }

            let result = `**アカウント残高: ${accountId}**\n`;
            for (const key in account) {
                if (key !== 'id') {
                    result += `- ${key}: ${account[key].toFixed(4)}\n`;
                }
            }
            return result;
        }
    },
    
    // 5. LILルール一覧表示
    lilRules: {
        pattern: /^\/lil_rules$/i,
        execute: (state) => {
            const rules = state.LILRules || [];
            if (rules.length === 0) return "現在、CalcLang LILルールは定義されていません。";
            
            let result = "**CalcLang (LIL) 監査ルール:**\n";
            rules.forEach(rule => {
                result += `- **${rule.id}**: ${rule.description}\n`;
            });
            return result;
        }
    }
};

/**
 * ユーザーのインプットに基づいて適切な対話作為を実行します。
 */
export async function executeDialogueAct(input) {
    const state = getCurrentState();
    
    if (state.isHalted) {
        return { result: "🚨 システムはHALT状態です。対話・作為は拒否されます。", type: 'error-message' };
    }

    let result = "コマンドが見つかりません。利用可能なコマンド: /status, /rates, /balance [ID], /info [通貨], /lil_rules";
    let type = 'system-message';
    let vibeCost = 0.1; // 推論としての基本コスト

    for (const key in DIALOGUE_ACTS) {
        const act = DIALOGUE_ACTS[key];
        const match = input.match(act.pattern);
        
        if (match) {
            result = act.execute(state, match);
            type = 'audit-message';
            vibeCost = 0.5; // 情報照会は少し重い
            break; 
        }
    }
    
    await addVibration(vibeCost);
    return { result, type };
}
