/**
 * @file src/core/qnx/intents/viewer_inject_processor.js
 * @version 1.0.2-RELEASE-QNX-INTENT-VIEWER-DYNAMIC-ADDRESS
 * @description Изолированный квант обработки прерывания наката гипертекста вьюера (0x011E).
 * ИСПРАВЛЕНО: Полностью выжжен хардкод слотов. Смещение рассчитывается динамически из targetSlot шины.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 100% Zero Allocation.
 */

import { _qnxHardwareRegistry } from "../shared_state.js";

/**
 * Динамический процессор прерывания налива текста
 */
export function executeViewerInjectStep(payload, coreReadyOffset, targetSlot) {
    const totalLinesInFile = payload | 0;
    
    // 🔥 ИСПРАВЛЕНО: Смещение вычисляется динамически из реального адресата транзакции шины
    const targetOffset = (targetSlot & 0xFF) << 4; 

    _qnxHardwareRegistry[targetOffset + 9] = totalLinesInFile | 0; // REG_TOTAL_ITEMS
    _qnxHardwareRegistry[targetOffset + 7] = 0;                    // REG_SELECTED_IDX = 0
    _qnxHardwareRegistry[targetOffset + 6] = 0;                    // REG_SCROLL_OFF = 0
}

// TIMESTAMP: 2026-09-27 16:22:15
// PATH: c:\slotcmp_5\V\src\core\qnx\intents\viewer_inject_processor.js
