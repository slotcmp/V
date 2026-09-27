/**
 * @file src/views/dashboard_view.js
 * @version 4.5.2-RELEASE-QNX-FIXED-TOTAL-TABS
 * @description Чистая вьюха наполнения Дашборда Слота 101.
 * ИСПРАВЛЕНО: Исправлен захардкоженный счетчик вкладок в паспорте с /3 на /2.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% объектов, 100% Zero Allocation.
 */

import { _qnxHardwareRegistry, REG_X, REG_Y, REG_W, REG_H, REG_ACTIVE_TAB, packCellBits } from "../core/qnx/shared_state.js";
import { renderRulerContent } from "./ruler_view.js";
import { renderMonitorContent } from "./monitor_view.js";

export function drawDashboardContent(canvas, currentCols) {
    const o101 = 101 << 4;
    const sX = _qnxHardwareRegistry[o101 + REG_X] | 0;
    const sY = _qnxHardwareRegistry[o101 + REG_Y] | 0; 
    const sW = _qnxHardwareRegistry[o101 + REG_W] | 0; 
    const sH = _qnxHardwareRegistry[o101 + REG_H] | 0; 
    
    const activeTabIdx = _qnxHardwareRegistry[o101 + REG_ACTIVE_TAB] & 15;
    const startContentY = (sY + 2) | 0; 

    // =================================================================
    // АППАРАТНАЯ СТЕРИЛИЗАЦИЯ ФОНА: Выжигаем грязь перед наливом шкал
    // =================================================================
    const endContentY = (sY + sH - 1) | 0; 
    const canvasLimit = canvas.length | 0;

    for (let y = startContentY; y < endContentY; y = (y + 1) | 0) {
        const rowStartPtr = (y * currentCols) | 0;
        for (let x = (sX + 1) | 0; x < (sX + sW - 1); x = (x + 1) | 0) {
            const ptr = (rowStartPtr + x) | 0;
            if (ptr < canvasLimit && ptr >= 0) {
                canvas[ptr] = packCellBits(0x20, 7, 0); 
            }
        }
    }

    // Налив контента поверх очищенного черного холста
    if (activeTabIdx === 0) {
        renderRulerContent(canvas, currentCols, sX, startContentY, sW, sH);
    } else if (activeTabIdx === 1) {
        renderMonitorContent(canvas, currentCols, sX, startContentY, sW, sH);
    }
}
