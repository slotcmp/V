/**
 * @file src/views/vscrollbar_view.js
 * @version 1.1.2-RELEASE-QNX-STRICT-DOD-PIPELINED
 * @description Пассивный выжигатель полосы прокрутки Window Manager.
 * ИСПРАВЛЕНО: Двухпроходный линейный налив полностью ликвидирует залипание бегунка.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% ветвлений в критическом цикле растра.
 */

import { 
    _virtualCanvasState, 
    _shadowCanvasState, 
    _qnxHardwareRegistry, 
    REG_X, REG_Y, REG_W, REG_H, 
    REG_FOCUS, REG_ENABLED, REG_SCROLL_OFF, REG_SELECTED_IDX, REG_ACTIVE_TAB, REG_TOTAL_ITEMS,
    packCellBits // 🔥 ИСПРАВЛЕНО: Упаковщик битов теперь наливается отсюда
} from "../core/qnx/shared_state.js";

/**
 * Выжигает полосу скроллбара (рельс '░' и бегунок '█') строго на правой границе прибора
 */
export function drawVerticalScrollbarInline(
    canvas, currentColsNum, sX, startContentY, sW, maxVisibleRows, scrollOffset, totalItems, isFocused
) {
    if ((maxVisibleRows | 0) <= 0 || (currentColsNum | 0) <= 0) return;

    const targetX = (sX + sW - 2) | 0; 
    const fgColorStr = isFocused ? 51 : 242; 
    const cleanTotal = (totalItems | 0) <= 0 ? 1 : (totalItems | 0);

    // =================================================================
    // ПАСC 1: СТЕРИЛЬНАЯ ЗАЛИВКА ВСЕГО РЕЛЬСА ТЕКСТУРОЙ '░'
    // =================================================================
    for (let y = 0; y < maxVisibleRows; y = (y + 1) | 0) {
        const targetGlobalY = (startContentY + y) | 0;
        const canvasPtr = (targetGlobalY * currentColsNum + targetX) | 0;
        if (canvasPtr < canvas.length && canvasPtr >= 0) {
            canvas[canvasPtr] = packCellBits(0x2591, fgColorStr, 0); // '░'
        }
    }

    // Если все элементы вмещаются на экран — бегунок не нужен, выходим
    if (cleanTotal <= maxVisibleRows) return;

    // =================================================================
    // ПАСC 2: ЛИНЕЙНЫЙ НАКАТ АКТИВНОГО БЕГУНКА '█'
    // =================================================================
    let sliderHeight = Math.max(1, Math.floor((maxVisibleRows * maxVisibleRows) / cleanTotal)) | 0;
    if (sliderHeight > maxVisibleRows) sliderHeight = maxVisibleRows;

    const maxOffset = (cleanTotal - maxVisibleRows) | 0;
    const sliderTop = maxOffset > 0 ? Math.floor((scrollOffset * (maxVisibleRows - sliderHeight)) / maxOffset) | 0 : 0;

    // Точечно выжигаем плашку поверх рельса без логических IF-условий
    const sliderEnd = (sliderTop + sliderHeight) | 0;
    for (let y = sliderTop; y < sliderEnd; y = (y + 1) | 0) {
        if (y >= maxVisibleRows) break; // Защитный барьер от Out of Bounds
        
        const targetGlobalY = (startContentY + y) | 0;
        const canvasPtr = (targetGlobalY * currentColsNum + targetX) | 0;
        if (canvasPtr < canvas.length && canvasPtr >= 0) {
            canvas[canvasPtr] = packCellBits(0x2588, fgColorStr, 0); // '█'
        }
    }
}
