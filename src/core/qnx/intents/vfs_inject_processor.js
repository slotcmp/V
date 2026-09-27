/**
 * @file src/core/qnx/intents/vfs_inject_processor.js
 * @version 1.0.1-RELEASE-QNX-INTENT-VFS-FIXED
 * @description Изолированный квант обработки прерывания инжекта VFS-данных (0x011C).
 * ИСПРАВЛЕНО: Гарантирован прямой именованный экспорт функции executeVfsInjectStep наружу.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 100% Zero Allocation.
 */

import { _qnxHardwareRegistry, CORE_BIT_VFS_INIT } from "../shared_state.js";

export function executeVfsInjectStep(payload, coreReadyOffset) {
    const resSlotId      = payload & 0xFF;
    const resTabIdx      = (payload >> 8) & 0xF;
    const resTotalFiles  = (payload >> 12) & 0xFFF;

    const targetOffset = resSlotId << 4;
    _qnxHardwareRegistry[targetOffset + 9] = resTotalFiles | 0; 
    _qnxHardwareRegistry[targetOffset + 8] = resTabIdx | 0;    
    _qnxHardwareRegistry[targetOffset + 7] = 0;                 
    _qnxHardwareRegistry[targetOffset + 6] = 0;                 
    
    _qnxHardwareRegistry[coreReadyOffset] |= CORE_BIT_VFS_INIT;
}

// TIMESTAMP: 2026-09-27 16:08:10
// PATH: c:\slotcmp_5\V\src\core\qnx\intents\vfs_inject_processor.js
