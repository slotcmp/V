/**
 * @file src/core/qnx/mouse_driver.js
 * @version 1.7.3-RELEASE-QNX-MOUSE-ROUTER-SPACE-STERILE-IMPORTS
 * @description PAC-контроллер распределения мышиных прерываний SGR.
 * ИСПРАВЛЕНО: Выжжен фантомный импорт _qnxActiveSlotsCountContainer из шапки, устранен SyntaxError.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% ООП, 100% точный координатный роутинг.
 */

// 🔥 ИСПРАВЛЕНО: Импортируются только легитимные бинарные константы и структуры ОЗУ ядра
import { _qnxHardwareRegistry, REG_X, REG_Y, REG_W, REG_H, REG_FOCUS, REG_ENABLED, REG_ACTIVE_TAB } from "./shared_state.js";
import { msg_send_qnx } from "./ipc_bus.js";
import { ix } from "./intents_spec.js";
import { _globalVfsWorkerLinkBypass } from "../../../index.js";

import { processAbstractWindowTabClick } from "./window_manager.js";
import { processModifierTabsClick } from "./mouse/modifier_tabs_click.js";
import { processMouseWheelScroll } from "./mouse/wheel_scroll.js";
import { processHardwareWindowContentClick } from "./mouse/content_click.js"; 

export function processHardwareMouseQuantum(clickX, clickY, mBtn, isRelease) {
    const curX = clickX | 0;
    const curY = clickY | 0;

    if (isRelease === 1 && mBtn === 0) return;

    const currentCols = _qnxHardwareRegistry[(0 << 4) + 0] | 0;
    const currentRows = _qnxHardwareRegistry[(0 << 4) + 1] | 0;

    const o101 = 101 << 4;
    const isDashboardOpen = _qnxHardwareRegistry[o101 + REG_ENABLED] | 0;

    // =================================================================
    // 0. ТРИГГЕР ХЛЯСТИКА АККОРДЕОНА (Строка Y = 1, работает ВСЕГДА)
    // =================================================================
    if (mBtn === 0 && curY === 1 && currentCols > 0) {
        const bodyStr = " 101:DASHBOARD ";
        const totalHlyastikLen = (bodyStr.length + 6) | 0; 
        const hlyastikStartX = ((currentCols - totalHlyastikLen) >> 1) | 0;
        const hlyastikEndX = (hlyastikStartX + totalHlyastikLen) | 0;

        if (curX >= hlyastikStartX && curX < hlyastikEndX) {
            _qnxHardwareRegistry[o101 + REG_ENABLED] = (isDashboardOpen | 0) ^ 1;
            const packedPayload = (currentCols & 0xFFFF) | ((currentRows & 0xFFFF) << 16);
            msg_send_qnx(9, 0, ix.SYS_RESIZE, packedPayload);
            return;
        }
    }

    // =================================================================
    // 0.Б ИНТЕРАКТИВНЫЙ КЛИК ПО ВКЛАДКАМ ДАШБОРДА (Строка Y = 2)
    // =================================================================
    if (mBtn === 0 && curY === 2 && isDashboardOpen === 1) {
        let clickedTab = -1;
        if (curX >= 2 && curX <= 8)   clickedTab = 0;  
        if (curX >= 10 && curX <= 19) clickedTab = 1;  

        if (clickedTab >= 0) {
            _qnxHardwareRegistry[o101 + REG_ACTIVE_TAB] = clickedTab | 0;
            msg_send_qnx(1, 4, ix.SYS_RENDER, 0); 
            return;
        }
    }

    // 1. ВЕРХНИЙ КОНТУР: МОДИФИКАТОРЫ СЛОТА 200 (Строка Y = 0)
    if (curY === 0) {
        if (mBtn === 64 || mBtn === 65) {
            processMouseWheelScroll(curX, curY, mBtn, 200);
        } else if (mBtn === 0) {
            processModifierTabsClick(curX, curY);
        }
        return;
    }

    // 2. ДИНАМИЧЕСКИЙ КООРДИНАТНЫЙ ХИТ-ТЕСТ ПО ПАНЕЛЯМ (101..110)
    let targetSlotId = 0;
    for (let slotId = 101; slotId <= 110; slotId = (slotId + 1) | 0) {
        const offset = slotId << 4;
        if (_qnxHardwareRegistry[offset + REG_ENABLED] === 0) continue;

        const sX = _qnxHardwareRegistry[offset + REG_X] | 0;
        const sY = _qnxHardwareRegistry[offset + REG_Y] | 0;
        const sW = _qnxHardwareRegistry[offset + REG_W] | 0;
        const sH = _qnxHardwareRegistry[offset + REG_H] | 0;

        if (curX >= sX && curX < ((sX + sW) | 0) && curY >= sY && curY < ((sY + sH) | 0)) {
            targetSlotId = slotId | 0;
            break;
        }
    }

    if (targetSlotId === 0) return;
    const targetOffset = targetSlotId << 4;

    // 3. АТОМАРНАЯ РОКИРОВКА ФОКУСА
    if (mBtn === 0 && _qnxHardwareRegistry[targetOffset + REG_FOCUS] === 0) {
        msg_send_qnx(targetSlotId, 4, ix.STACK_SET, -1);
    }

    // 4. РАСПРЕДЕЛЕНИЕ СИГНАЛОВ ВНУТРИ ВЫБРАННОГО СЛОТА
    if (mBtn === 64 || mBtn === 65) {
        processMouseWheelScroll(curX, curY, mBtn, targetSlotId);
        return;
    }

    if (mBtn === 0) {
        const sY = _qnxHardwareRegistry[targetOffset + REG_Y] | 0;
        
        // Клик по строке вкладок бизнес-панелей (Строка Y = sY + 1)
        if (curY === ((sY + 1) | 0)) {
            const isTabIntercepted = processAbstractWindowTabClick(curX, targetSlotId);
            
            if (isTabIntercepted === true) {
                if (targetSlotId === 102 || targetSlotId === 103) {
                    const newActiveTabNum = _qnxHardwareRegistry[targetOffset + REG_ACTIVE_TAB] | 0;
                    const targetPathStr = globalThis._qnxVfsPathMap[`${targetSlotId}_${newActiveTabNum}`] || "./";

                    if (_globalVfsWorkerLinkBypass) {
                        _globalVfsWorkerLinkBypass.postMessage({
                            slotId: targetSlotId | 0,
                            targetStackIdx: newActiveTabNum | 0,
                            currentPath: String(targetPathStr)
                        });
                    }
                }
                msg_send_qnx(1, 4, ix.SYS_RENDER, 0);
            }
            return;
        }

        // КЛИК ПО ВНУТРЕННЕМУ КОНТЕНТУ ОКНА (Строки Y >= sY + 2)
        const sH = _qnxHardwareRegistry[targetOffset + REG_H] | 0;
        processHardwareWindowContentClick(curX, curY, targetSlotId, sY, sH, _globalVfsWorkerLinkBypass);
    }
}

// TIMESTAMP: 2026-09-27 21:48:10
// PATH: c:\slotcmp_5\V\src\core\qnx\mouse_driver.js
