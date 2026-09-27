/**
 * @file src/core/qnx/intents/themes_inject_processor.js
 * @version 1.0.0-RELEASE-QNX-INTENT-THEMES
 * @description Изолированный квант обработки прерывания инжекта палитры тем (0x011D).
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 100% Zero Allocation.
 */

import { _qnxHardwareRegistry, CORE_BIT_THEMES } from "../shared_state.js";

export function executeThemesInjectStep(payload, coreReadyOffset) {
    const totalThemesCount = payload | 0;
    const targetOffset = 106 << 4; 

    _qnxHardwareRegistry[targetOffset + 9] = totalThemesCount | 0; 
    _qnxHardwareRegistry[targetOffset + 7] = 0;                    
    _qnxHardwareRegistry[targetOffset + 6] = 0;                    

    _qnxHardwareRegistry[coreReadyOffset] |= CORE_BIT_THEMES;
}

// TIMESTAMP: 2026-09-27 16:02:15
// PATH: c:\slotcmp_5\V\src\core\qnx\intents\themes_inject_processor.js
