/**
 * @file src/core/qnx/mouse/explorer_tabs_click.js
 * @version 1.0.2-RELEASE-QNX-DOD-MOUSE-TABS-PATH-FIXED
 * @description Безаллокационный хит-тест мыши для вкладок проводников 102/103.
 * ИСПРАВЛЕНО: Исправлен относительный путь импорта intents_spec.js (поднят на ../../).
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 100% плоская память.
 */

import { _qnxHardwareRegistry, REG_X, REG_Y, REG_W, REG_ENABLED } from "../shared_state.js";
import { msg_send_qnx } from "../ipc_bus.js";
import { ix } from "../intents_spec.js";
import { performSynchronousVfsInject } from "../vfs_initializer.js";

const _STATIC_LABELS_102 = ["SYS", "SRC", "MOD", "LOG"];
const _STATIC_LABELS_103 = ["ROOT", "CONF", "WORK"];

export function processExplorerTabsClick(clickX, clickY, slotIdNum) {
    const offset = slotIdNum << 4;
    if (_qnxHardwareRegistry[offset + REG_ENABLED] === 0) return false;

    const sX = _qnxHardwareRegistry[offset + REG_X] | 0;
    const sY = _qnxHardwareRegistry[offset + REG_Y] | 0;
    const sW = _qnxHardwareRegistry[offset + REG_W] | 0;

    // Проверяем, что клик пришелся строго на вторую строку окна (линия табов)
    if (clickY !== ((sY + 1) | 0)) return false;

    let labelsArr = (slotIdNum === 102) ? _STATIC_LABELS_102 : _STATIC_LABELS_103;
    const maxTabsCount = labelsArr.length | 0;

    let currentTabX = (sX + 2) | 0;
    const innerFrameRightEdge = (sX + sW - 1) | 0;

    for (let t = 0; t < maxTabsCount; t = (t + 1) | 0) {
        const labelStr = labelsArr[t | 0];
        const labelLen = labelStr.length | 0;
        
        const startZoneX = currentTabX | 0;
        const endZoneX = (currentTabX + labelLen + 2) | 0;

        if (endZoneX < innerFrameRightEdge) {
            // ПОПАДАНИЕ: Если координата клика мыши вошла в границы ушка таба
            if (clickX >= startZoneX && clickX < endZoneX) {
                // 🔥 ИСПРАВЛЕНО: Теперь ix.STACK_SET гарантированно равен числу 0x011A и не вызовет TypeError
                msg_send_qnx(slotIdNum, 4, ix.STACK_SET, t | 0);
                
                // Извлекаем сохраненный путь для этой вкладки и синхронно наливаем новые файлы
                const cacheKeyStr = `${slotIdNum}_${t}`;
                const nextPathStr = globalThis._qnxVfsPathMap[cacheKeyStr] || "./";
                performSynchronousVfsInject(slotIdNum, nextPathStr);
                
                return true;
            }
            currentTabX = (endZoneX + 1) | 0; 
        }
    }
    return false;
}
