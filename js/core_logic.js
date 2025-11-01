// js/core_logic.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { KNOWLEDGE } from './knowledge_base.js';
import { INITIAL_LIL_RULES } from './logos_lil.js';
import { executeLogosLILZActs } from './dialogue_acts.js';

// Firebase設定
const firebaseConfig = {
    // ... (Firebase設定情報をここに記述することを想定)
};

// アプリの初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 定数
export const VIBRATION_LIMIT = 100.0; // 孫悟空の活動レベル上限

// グローバルな状態
let appId = "default_app_id";
let stateDocRef = null;
let LILRules = []; // Firestoreから動的にロードされるLILルール

let currentState = {
    isHalted: false, // LIL_007により制御
    vibration_level: { value: 0, last_decay: Date.now() },
    currency_rates: { ALPHA: 1.0, BETA: 10.0, GAMMA: 100.0, USD: 100.0, BTC: 3000000.0, MATIC: 150.0 },
    currencies_total_supply: { ALPHA: 1050.00, BETA: 500.00, GAMMA: 100.00, USD: 0.0, BTC: 0.0, MATIC: 0.0 },
    accounts: [
        { id: "CORE_BANK_A", ALPHA: 1000.00, BETA: 500.00, GAMMA: 100.00, USD: 10000.00, BTC: 1.0, MATIC: 1000.0 },
        { id: "USER_AUDIT_B", ALPHA: 50.00, BETA: 0.00, GAMMA: 0.00, USD: 0.00, BTC: 0.0, MATIC: 0.0 },
    ],
    // 物理インフラの論理的な状態
    infrastructure: {
        energy_supply: { value: 95.0, last_change: Date.now() }, // 電力供給（0-100%）
        net_stability: { value: 80.0, last_change: Date.now() }, // 通信安定性（0-100%）
    }
};

// LIL実行結果に基づく一時的なフラグ
export let LIL_FLAGS = {
    SUPPRESS_MINT_ALPHA: false, // LIL_002用
    SUPPRESS_MINT_BTC: false,   // LIL_005用
    SUPPRESS_MINT_GAMMA: false, 
    ENERGY_COST_MULTIPLIER: 1.0, // LIL_006用 (電力コスト増倍率)
};

// UI更新用コールバック関数群
const renderCallbacks = [];
export const UI_ELEMENTS = {}; // UI要素を保持 (各ページで登録)

// ====================================================================
// CORE FUNCTIONS
// ====================================================================

/**
 * ログをコンソールに出力し、UIに表示します。
 */
export function logToConsole(message, type = 'system-message') {
    // ... (実際のログ出力ロジックをここに記述)
    console.log(`[${type.toUpperCase()}] ${message}`);
}

/**
 * 既存のシステム状態を取得します。
 */
export function getCurrentState() {
    return JSON.parse(JSON.stringify(currentState)); // ディープコピーを返す
}

/**
 * システム状態をFirestoreに保存し、UIを更新します。
 */
export async function saveSystemState(updateData) {
    if (!stateDocRef) return;
    try {
        await updateDoc(stateDocRef, updateData);
    } catch (e) {
        logToConsole(`[ERROR/DB]: 状態保存中にエラーが発生しました: ${e.message}`, 'error-message');
    }
}

/**
 * UIレンダリング関数を登録します。
 */
export function registerRenderCallback(callback) {
    renderCallbacks.push(callback);
    callback(currentState); // 登録時にも一度実行
}

/**
 * 全てのレンダリング関数を実行し、UIを更新します。
 */
function executeRenderCallbacks(state) {
    renderCallbacks.forEach(callback => callback(state));
}

/**
 * Vibrationレベルを増加させ、即座にFirestoreに保存します。
 */
export async function addVibration(amount) {
    const newVibe = Math.min(VIBRATION_LIMIT, currentState.vibration_level.value + amount);
    currentState.vibration_level.value = newVibe;
    await saveSystemState({ vibration_level: currentState.vibration_level });
}

/**
 * Vibrationレベルを時間とともに減衰させます。
 */
function decayVibration() {
    const now = Date.now();
    const decayFactor = 0.005; // 1秒あたり0.5%減衰
    const timeElapsed = now - currentState.vibration_level.last_decay;

    if (timeElapsed > 0) {
        const decayAmount = (timeElapsed / 1000) * decayFactor * currentState.vibration_level.value;
        currentState.vibration_level.value = Math.max(0, currentState.vibration_level.value - decayAmount);
        currentState.vibration_level.last_decay = now;
    }
}

/**
 * knowledge_baseから指定された通貨の論理的制限を取得します。
 */
export function getCurrencyLogic(currencyCode) {
    const currencyDef = KNOWLEDGE.DEFINITIONS.CURRENCIES.find(c => c.code === currencyCode);
    return currencyDef ? currencyDef.logic_restriction : null;
}

/**
 * 通貨の総供給量を更新します。
 */
function updateCurrencySupply(state) {
    const newSupply = {};
    const currencies = KNOWLEDGE.DEFINITIONS.CURRENCIES.map(c => c.code);

    currencies.forEach(currency => {
        let supply = 0;
        state.accounts.forEach(acc => {
            supply += acc[currency] || 0;
        });
        newSupply[currency] = supply;
    });

    state.currencies_total_supply = newSupply;
}

// ====================================================================
// LOGOS INTERMEDIATE LANGUAGE (LIL) EXECUTION
// ====================================================================

/**
 * LILルールを評価し、発動したルールの作為 (アクション) を実行します。
 */
function executeLogosLIL(state) {
    let totalLILCost = 0;
    
    // 実行前にフラグをリセット
    LIL_FLAGS.SUPPRESS_MINT_ALPHA = false; 
    LIL_FLAGS.SUPPRESS_MINT_BTC = false; 
    LIL_FLAGS.ENERGY_COST_MULTIPLIER = 1.0; 
    
    LILRules.forEach(rule => {
        let isTriggered = true;
        
        // 1. トリガーのチェック
        for (const trigger of rule.triggers) {
            let actualValue;
            
            const keys = trigger.param.split('.');
            const value = trigger.value;

            if (trigger.type === "STATE_CHECK" || trigger.type === "INFRA_CHECK") {
                const base = (trigger.type === "INFRA_CHECK") ? state.infrastructure : state;
                actualValue = keys.reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, base);
            } else if (trigger.type === "SUPPLY_CHECK") {
                 actualValue = state.currencies_total_supply[keys[0]] || 0;
            } else if (trigger.type === "RATE_CHECK") {
                actualValue = state.currency_rates[keys[0]] || 0;
            } else if (trigger.type === "CURRENCY_CHECK") {
                // CURRENCY_CHECKは監査作為実行時に外部ロジックで処理されることが多いため、ここでは簡略化
                continue; 
            }

            if (actualValue === undefined) {
                isTriggered = false; 
                break;
            }

            // 演算子の評価
            let conditionResult = false;
            switch (trigger.operator) {
                case "==": conditionResult = (actualValue == value); break;
                case ">": conditionResult = (actualValue > value); break;
                case "<": conditionResult = (actualValue < value); break;
                case ">=": conditionResult = (actualValue >= value); break;
                case "<=": conditionResult = (actualValue <= value); break;
            }
            
            if (!conditionResult) {
                isTriggered = false;
                break;
            }
        }
        
        // 2. 作為 (アクション) の実行
        if (isTriggered) {
            logToConsole(`[LIL/${rule.id} 発動]: ${rule.description}`, rule.actions.find(a => a.type === 'LOG')?.level || 'system-message');
            totalLILCost += rule.vibration_cost;
            
            rule.actions.forEach(action => {
                if (action.type === 'SET_FLAG') {
                    LIL_FLAGS[action.param] = action.value; 
                } 
                // LIL_007: SET_STATE アクションの実行
                else if (action.type === 'SET_STATE') {
                    // currentState のトップレベルの状態を変更（例: isHalted = true）
                    if (currentState.hasOwnProperty(action.param)) {
                        currentState[action.param] = action.value;
                    }
                }
            });
        }
    });

    return totalLILCost;
}


/**
 * ロゴスレート計算ロジック (CalcLangの経済関数)
 */
function calculateLogosRates(state) {
    const baseRates = { ALPHA: 1.0, BETA: 10.0, GAMMA: 100.0, USD: 100.0, BTC: 3000000.0, MATIC: 150.0 };
    const rates = { ALPHA: 1.0 }; 

    const vLevel = state.vibration_level.value;
    
    for (const currency in baseRates) {
        if (currency === 'ALPHA') continue;

        const baseRate = baseRates[currency];
        const supply = state.currencies_total_supply[currency] || 0;
        const currencyLogic = getCurrencyLogic(currency); 

        // 通貨のVibration感度を適用 (USDは0.1, GAMMAは2.0など)
        const vibeSensitivity = currencyLogic?.vibe_sensitivity || 1.0; 
        
        // 1. Vibration Factor: 感度に応じて変動要因を調整
        const vFactor = 1 + (vLevel / VIBRATION_LIMIT) * 0.02 * vibeSensitivity; 

        // 2. 供給量に基づく変動要因
        const supplyFactor = 1 - Math.max(0, (supply - 1000) / 5000) * 0.1; 

        // 3. 摂動要因: 感度に応じてランダム変動を調整
        const perturbation = (Math.random() - 0.5) * (vLevel / VIBRATION_LIMIT) * 0.01 * vibeSensitivity; 

        let newRate = baseRate * vFactor * supplyFactor * (1 + perturbation);

        rates[currency] = parseFloat(Math.max(0.01, newRate).toFixed(4)); 
    }
    
    return rates;
}


// ====================================================================
// INITIALIZATION AND FIREBASE LISTENERS (EXPORTED)
// ====================================================================

/**
 * アプリケーションの初期化とFirestoreリスナーの設定を行います。
 */
export async function initApp() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            appId = user.uid; // ユーザーIDをアプリIDとして使用
            logToConsole(`[SYSTEM]: 監査官 ${appId} のセッションを確立。`, 'system-message');

            // 1. LILルールのFirestoreリスナー
            const lilDocRef = doc(db, 'system_config', 'lil_rules');
            
            // LIL初期設定のロードと永続化
            const lilSnap = await getDoc(lilDocRef);
            if (!lilSnap.exists()) {
                 await setDoc(lilDocRef, { rules: INITIAL_LIL_RULES });
                 LILRules = INITIAL_LIL_RULES;
            }

            // LILルールの動的監視
            onSnapshot(lilDocRef, (docSnap) => {
                 if (docSnap.exists() && docSnap.data().rules) {
                     LILRules = docSnap.data().rules;
                     logToConsole(`[SYSTEM]: CalcLang LILルール (${LILRules.length}件) が動的に更新されました。`, 'system-message');
                     executeRenderCallbacks(currentState); 
                 }
            }, (error) => {
                console.error("LIL Listen Error:", error);
            });


            // 2. Firestore State Listener (system_state)
            stateDocRef = doc(db, 'system_state', appId);
            const stateSnap = await getDoc(stateDocRef);

            if (!stateSnap.exists()) {
                await setDoc(stateDocRef, currentState);
            }

            onSnapshot(stateDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // 状態の深い階層も更新
                    Object.keys(data).forEach(key => {
                        if (currentState.hasOwnProperty(key)) {
                             currentState[key] = data[key];
                        }
                    });
                    
                    executeRenderCallbacks(currentState);
                }
            }, (error) => {
                console.error("State Listen Error:", error);
            });
            
            // 3. Decay Timer (コアロジックの実行ループ)
            setInterval(async () => {
                // 1. Vibrationの減衰
                decayVibration();

                // 2. 通貨供給量の更新
                updateCurrencySupply(currentState);
                
                // 3. 論理的インフラの減衰
                currentState.infrastructure.energy_supply.value = Math.max(0, currentState.infrastructure.energy_supply.value - 0.1);
                currentState.infrastructure.net_stability.value = Math.max(0, currentState.infrastructure.net_stability.value - 0.05);

                // 4. LIL (CalcLang基礎) の実行と論理コストの計上
                const lilCost = executeLogosLIL(currentState);
                currentState.vibration_level.value += lilCost; 
                
                // 5. ロゴスレートの再計算
                const newRates = calculateLogosRates(currentState);
                
                // 6. Z-ACTの自動実行チェック
                await executeLogosLILZActs(currentState); 
                
                // 7. 状態の保存とUI更新
                // 保存対象を明示的に指定
                saveSystemState({ 
                    isHalted: currentState.isHalted,
                    vibration_level: currentState.vibration_level, 
                    currency_rates: newRates,
                    currencies_total_supply: currentState.currencies_total_supply,
                    infrastructure: currentState.infrastructure
                }); 
                
            }, 1000); // 1秒ごとに実行
        } else {
            // ログインされていない場合の処理（ここでは匿名認証などを想定）
            // ...
        }
    });
}
