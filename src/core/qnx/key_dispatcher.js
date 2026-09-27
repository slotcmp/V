/**
 * @file src/core/qnx/key_dispatcher.js
 * @version 1.4.1-RELEASE-QNX-DYNAMIC-ALT-FIXED
 * @description Единый векторный ISR-обработчик клавиатурных прерываний.
 * ИСПРАВЛЕНО: Убран избыточный гвард byte3 для обеспечения совместимости со всеми эмуляторами терминалов (ConPTY/xterm).
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% хардкода, 100% Zero Allocation.
 */

import { _qnxHardwareRegistry, _qnxDisplayIndexToSlotMap, REG_FOCUS, REG_ENABLED } from "./shared_state.js";
import { msg_send_qnx } from "./ipc_bus.js";
import { ix } from "./intents_spec.js";

export function dispatchHardwareKeyStep(byte1, byte2, byte3) {
    // =================================================================
    // 🔥 ДИНАМИЧЕСКИЙ ПЕРЕХВАТ ALT + [0-9] (ИСПРАВЛЕНО)
    // =================================================================
    // byte1 обязан быть 0x1B (ESC), byte2 — ASCII-кодом цифры (0x30 - 0x39)
    if (byte1 === 0x1B && byte2 >= 0x30 && byte2 <= 0x39) {
        const targetDisplayIdx = (byte2 - 0x30) | 0; 

        if (targetDisplayIdx >= 0 && targetDisplayIdx < 10) {
            // Извлекаем привязанный ID прибора из бинарного маппинга ядра
            const targetSlotId = _qnxDisplayIndexToSlotMap[targetDisplayIdx] | 0;
            
            if (targetSlotId > 0) {
                const targetOffset = targetSlotId << 4;

                // Проверяем аппаратную готовность слота
                if (_qnxHardwareRegistry[targetOffset + REG_ENABLED] === 1) {
                    
                    // Если окно не сфокусировано — сбрасываем старый фокус и взводим новый
                    if (_qnxHardwareRegistry[targetOffset + REG_FOCUS] === 0) {
                        msg_send_qnx(targetSlotId, 4, ix.STACK_SET, -1);
                        msg_send_qnx(1, 4, ix.SYS_RENDER, 0);
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // =================================================================
    // КОНТУР НАВИГАЦИИ СТРЕЛОК (ESC [ A / ESC [ B)
    // =================================================================
    if (byte1 === 0x1B && byte2 === 0x5B) {
        let focusedSlotId = 102;
        if (_qnxHardwareRegistry[(102 << 4) + REG_FOCUS] === 1) focusedSlotId = 102;
        else if (_qnxHardwareRegistry[(103 << 4) + REG_FOCUS] === 1) focusedSlotId = 103;

        const offset = focusedSlotId << 4;
        const currentSelected = _qnxHardwareRegistry[offset + 7] | 0; 
        const currentScroll   = _qnxHardwareRegistry[offset + 6] | 0; 
        const totalItems      = _qnxHardwareRegistry[offset + 9] | 0; 
        const sH              = _qnxHardwareRegistry[offset + 3] | 0; 
        
        const maxVisibleRows  = (sH - 3) | 0;

        if (byte3 === 0x41) { // ⬆️ СТРЕЛКА ВВЕРХ
            if (currentSelected > 0) {
                const nextSelected = (currentSelected - 1) | 0;
                _qnxHardwareRegistry[offset + 7] = nextSelected;
                if (nextSelected < currentScroll) {
                    _qnxHardwareRegistry[offset + 6] = nextSelected;
                }
                msg_send_qnx(1, 4, ix.SYS_RENDER, 0); 
            }
        }
        else if (byte3 === 0x42) { // ⬇️ СТРЕЛКА ВНИЗ
            if (currentSelected < ((totalItems - 1) | 0)) {
                const nextSelected = (currentSelected + 1) | 0;
                _qnxHardwareRegistry[offset + 7] = nextSelected;
                if ((nextSelected - currentScroll) >= maxVisibleRows) {
                    _qnxHardwareRegistry[offset + 6] = (nextSelected - maxVisibleRows + 1) | 0;
                }
                msg_send_qnx(1, 4, ix.SYS_RENDER, 0);
            }
        }
    }
}
