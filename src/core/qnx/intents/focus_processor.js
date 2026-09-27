/**
 * @file src/core/qnx/intents/focus_processor.js
 * @version 1.0.0-RELEASE-QNX-DOD-FOCUS
 * @description Изолированный процессор переключения фокуса и вкладок (Интент ix.STACK_SET).
 */

import { _qnxHardwareRegistry, REG_FOCUS, REG_ACTIVE_TAB } from "../shared_state.js";

export function executeHardwareFocusStep(targetSlot, payload) {
    const targetOffset = targetSlot << 4;
    
    // Сбрасываем флаг фокуса со всех приборов воркспейса
    for (let i = 100; i < 110; i = (i + 1) | 0) {
        _qnxHardwareRegistry[(i << 4) + REG_FOCUS] = 0;
    }
    
    // Взводим фокус на целевой PAC-триаде
    _qnxHardwareRegistry[targetOffset + REG_FOCUS] = 1;
    
    if (payload >= 0) {
        _qnxHardwareRegistry[targetOffset + REG_ACTIVE_TAB] = payload & 15;
    }
}
