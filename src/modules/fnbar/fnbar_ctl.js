/**
 * @file src/modules/fnbar/fnbar_ctl.js
 * @version 7.6.0-RELEASE-SMO-FNBAR-CTL-PURE-DOD
 * @description Контроллер Функциональной панели (Канал 104).
 * ИСПРАВЛЕНО: Полностью удалены тернарные гварды-матрёшки. Наведена строгая DOD-адресация доменной модели.
 * Выполнен в строгой парадигме PAC / DOD / IDD / Zero Allocation.
 */

import { _gpssEngineState, generateGpssTransaction, ix } from "../../core/smo/bus.js";
import { forceInvalidateShadowCanvas } from "../../io/terminal/flusher.js";
import { processGenericUiKinematics } from "../../core/smo/window_manager.js";

import { reduceKeyboardModifierChanged } from "./intents/modifier_reducer.js";
import { reduceFnKeyClicked } from "./intents/fkey_reducer.js";

// Высокоскоростной мономорфный ОЗУ-реестр JIT-ссылок на изолированные специфические редьюсеры
const _FNBAR_INTENTS_REGISTRY = new Map([
    [ix.CMD_LAYOUT_MODIFIER_INC, reduceKeyboardModifierChanged],
    [ix.CMD_LAYOUT_MODIFIER_DEC, reduceKeyboardModifierChanged],
    ["KEYBOARD_MODIFIER_CHANGED", reduceKeyboardModifierChanged],
    ["FN_KEY_CLICKED", reduceFnKeyClicked]
]);

export function processIntent(mdl, intentStr, contextPayload, facilityState) {
    if (!mdl || !intentStr || !facilityState) return false;

    const intent = String(intentStr || "");

    // 1. АТОМАРНЫЙ DOD-РОУТИНГ ПО СПЕЦИФИЧЕСКИМ БИЗНЕС-ИНТЕНТАМ ПАНЕЛИ ЗА O(1)
    const targetReducerFn = _FNBAR_INTENTS_REGISTRY.get(intent);
    
    if (targetReducerFn !== undefined) {
        // Передаем СТРОГО доменную модель (mdl) и СТРОГО паспорт Window Manager (facilityState)
        const isMutated = targetReducerFn(mdl, contextPayload, facilityState);
        
        if (isMutated === true) {
            const kernel = _gpssEngineState.runtime;
            if (kernel && kernel.virtualCanvasState) {
                kernel.virtualCanvasState.isDirty = true;
            }
            if (typeof forceInvalidateShadowCanvas === "function") {
                forceInvalidateShadowCanvas();
            }
            generateGpssTransaction("1", "EXECUTE_RENDER", null, "104");
            return true;
        }
        return false;
    }

    // =================================================================
    // 2. КАСКАДНЫЙ ФОЛБЭК НЕСПЕЦИФИЧЕСКИХ ИНТЕНТОВ В WINDOW_MANAGER
    // =================================================================
    return processGenericUiKinematics(facilityState, intentStr, contextPayload);
}

/**
 * Адаптер IoC-загрузчика для веерного проброса интентов шины GPSS в Слот 104
 */
export function processSpecificFnbarLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState) return false;
    
    const intent = String(intentStr || "");

    // Реактивный перехват фокуса Window Manager под контролем СМО
    if (intent === "FN_KEY_CLICKED" || intent === "KEYBOARD_MODIFIER_CHANGED" || intent === ix.CMD_LAYOUT_MODIFIER_INC || intent === ix.CMD_LAYOUT_MODIFIER_DEC) {
        const kernel = _gpssEngineState.runtime;
        if (kernel && kernel.model && kernel.model.logicalState) {
            const currentFocusedId = String(kernel.model.logicalState.focusedSlotId || "");
            if (currentFocusedId !== "104") {
                kernel.model.logicalState.focusedSlotId = "104";
                if (kernel.virtualCanvasState) kernel.virtualCanvasState.isDirty = true;
                generateGpssTransaction("108", "ADD_LOG_ENTRY", "[FOCUS_WM] Прерывание форсировало фокус на Слот 104\n", "104");
            }
        }
    }

    const payload = contextPayload ? contextPayload : (currentTx ? currentTx.P3 : {});
    const activeMdl = facilityState.mdl;

    // Прямой, чистый проброс доменной модели без тернарных проверок
    return processIntent(activeMdl, intentStr, payload, facilityState);
}
