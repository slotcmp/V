/**
 * @file src/core/qnx/mouse/wheel_scroll.js
 * @version 1.3.0-RELEASE-QNX-WHEEL-PURE-DOD
 * @description Безаллокационный процессор колесика мыши.
 * ИСПРАВЛЕНО: Выжжен цикл инвалидации теневой памяти. Тотальное устранение мерцания кадра.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% ООП, 100% чистый дифференциальный рендеринг.
 */

import { 
    _qnxHardwareRegistry,
    REG_X, REG_Y, REG_W, REG_H, 
    REG_SCROLL_OFF, REG_TOTAL_ITEMS, REG_SELECTED_IDX, REG_ACTIVE_TAB 
} from "../shared_state.js";
import { msg_send_qnx } from "../ipc_bus.js";
import { ix } from "../intents_spec.js";
import { performSynchronousVfsInject } from "../vfs_initializer.js";

export function processMouseWheelScroll(clickX, clickY, mBtn, slotIdNum) {
    const offset = slotIdNum << 4;

    // 1. КОНТУР СЛОТА 200 (Модификаторы на Y = 0)
    if ((slotIdNum | 0) === 200) {
        const currentMod = _qnxHardwareRegistry[(200 << 4) + REG_ACTIVE_TAB] | 0;
        let nextMod = currentMod | 0;

        if (mBtn === 64)       nextMod = ((currentMod - 1 + 4) % 4) | 0;
        else if (mBtn === 65)  nextMod = ((currentMod + 1) % 4) | 0;

        if (nextMod !== currentMod) {
            _qnxHardwareRegistry[(200 << 4) + REG_ACTIVE_TAB] = nextMod | 0;
            msg_send_qnx(1, 4, ix.SYS_RENDER, 0); 
            return true;
        }
        return false;
    }

    const sX = _qnxHardwareRegistry[offset + REG_X] | 0;
    const sY = _qnxHardwareRegistry[offset + REG_Y] | 0;
    const sW = _qnxHardwareRegistry[offset + REG_W] | 0;
    const sH = _qnxHardwareRegistry[offset + REG_H] | 0;

    if (clickX < sX || clickX >= ((sX + sW) | 0)) return false;

    // Вращение на линии ушек табов проводника (Y = sY + 1)
    if ((clickY | 0) === ((sY + 1) | 0)) {
        const maxTabs = (slotIdNum === 102) ? 4 : 3;
        const currentTab = _qnxHardwareRegistry[offset + REG_ACTIVE_TAB] | 0;
        let nextTab = currentTab | 0;

        if (mBtn === 64)       nextTab = ((currentTab - 1 + maxTabs) % maxTabs) | 0;
        else if (mBtn === 65)  nextTab = ((currentTab + 1) % maxTabs) | 0;

        if (nextTab !== currentTab) {
            _qnxHardwareRegistry[offset + REG_ACTIVE_TAB] = nextTab | 0;
            
            const cacheKeyStr = `${slotIdNum}_${nextTab}`;
            const nextPathStr = globalThis._qnxVfsPathMap[cacheKeyStr] || "./";
            performSynchronousVfsInject(slotIdNum, nextPathStr); 
            
            _qnxHardwareRegistry[offset + REG_SELECTED_IDX] = 0;
            _qnxHardwareRegistry[offset + REG_SCROLL_OFF] = 0;

            msg_send_qnx(1, 4, ix.SYS_RENDER, 0); 
            return true;
        }
        return false;
    }

    // 2. КОНТУР БИЗНЕС-ПАНЕЛЕЙ ПРОВОДНИКОВ (Движение плашки-курсора)
    if (clickY >= ((sY + 2) | 0) && clickY < ((sY + sH - 1) | 0)) {
        const currentSelected = _qnxHardwareRegistry[offset + REG_SELECTED_IDX] | 0;
        const currentScroll   = _qnxHardwareRegistry[offset + REG_SCROLL_OFF] | 0;
        const totalItems      = _qnxHardwareRegistry[offset + REG_TOTAL_ITEMS] | 0;
        const maxVisibleRows  = (sH - 3) | 0;

        let nextSelected = currentSelected | 0;
        let isMutated = false;

        if (mBtn === 64) { // ⬆️ Колесико ВВЕРХ
            if (currentSelected > 0) {
                nextSelected = (currentSelected - 1) | 0;
                _qnxHardwareRegistry[offset + REG_SELECTED_IDX] = nextSelected;
                
                if (nextSelected < currentScroll) {
                    _qnxHardwareRegistry[offset + REG_SCROLL_OFF] = nextSelected;
                }
                isMutated = true;
            }
        } 
        else if (mBtn === 65) { // ⬇️ Колесико ВНИЗ
            if (currentSelected < ((totalItems - 1) | 0)) {
                nextSelected = (currentSelected + 1) | 0;
                _qnxHardwareRegistry[offset + REG_SELECTED_IDX] = nextSelected;
                
                if ((nextSelected - currentScroll) >= maxVisibleRows) {
                    _qnxHardwareRegistry[offset + REG_SCROLL_OFF] = (nextSelected - maxVisibleRows + 1) | 0;
                }
                isMutated = true;
            }
        }

        if (isMutated === true) {
            // 🔥 ЧИСТЫЙ РЕАКТИВНЫЙ ПИНОК ШИНЫ: Никакой принудительной инвалидации буфера!
            // flusher обновляет только точечно изменившиеся символы новой строки плашки.
            msg_send_qnx(1, 4, ix.SYS_RENDER, 0); 
            return true;
        }
    }

    return false;
}
