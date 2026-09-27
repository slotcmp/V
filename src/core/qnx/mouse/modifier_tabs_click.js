/**
 * @file src/core/qnx/mouse/modifier_tabs_click.js
 * @version 1.0.1-RELEASE-QNX-STRICT-DOD-MOUSE-MODIFIER
 * @description Безаллокационный хит-тест мыши для Слота 200 (Верхняя линейка Y = 0).
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% объектов, 100% data-driven.
 */

import { _qnxHardwareRegistry, REG_ACTIVE_TAB } from "../shared_state.js";
import { msg_send_qnx } from "../ipc_bus.js";
import { ix } from "../intents_spec.js";

const _MODIFIER_NAMES = ["DEFAULT", "CTRL", "SHIFT", "ALT"];

/**
 * Синхронно вычисляет попадание клика в модификаторы и пинает ядро
 */
export function processModifierTabsClick(clickX, clickY) {
    // Гвард: если клик пришелся не на самую верхнюю строчку — выходим без затрат тактов ОС
    if ((clickY | 0) !== 0) return false;

    let tabX = 2;
    for (let m = 0; m < 4; m = (m + 1) | 0) {
        const nameLen = _MODIFIER_NAMES[m].length | 0;
        
        const startZoneX = tabX | 0;
        const endZoneX = (tabX + nameLen + 2) | 0;

        // 🔥 ПОПАДАНИЕ: Курсор мыши снайперски кликнул внутрь ушка модификатора
        if (clickX >= startZoneX && clickX < endZoneX) {
            // Атомарно прошиваем выбранный индекс модификатора в регистр REG_ACTIVE_TAB Слота 200
            _qnxHardwareRegistry[(200 << 4) + REG_ACTIVE_TAB] = m | 0;
            
            // Выстреливаем в кольцевую шину FIFO импульс на перерисовку кадра
            msg_send_qnx(1, 4, ix.SYS_RENDER, 0);
            return true;
        }
        
        tabX = (endZoneX + 2) | 0; // Смещение каретки хит-теста с учетом пробельного зазора
    }
    return false;
}
