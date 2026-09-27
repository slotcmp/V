/**
 * @file src/views/theme_view.js
 * @version 1.5.0-RELEASE-QNX-THEME-VIEW-POLYMORPHIC
 * @description DOD-рендерер списка тем оформления (Палитра) с интегрированным безаллокационным скроллбаром.
 * ИСПРАВЛЕНО: Функция экспорта переименована в drawSlotBufferContent под единый полиморфный стандарт сигнатур QNX.
 * ИСПРАВЛЕНО: Легаси-код внешних рамок выжжен — логика передана в абстрактный Window Manager.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% объектов в рантайме, 100% Zero Allocation.
 */

import { 
    _qnxHardwareRegistry, 
    _qnxActiveThemesRegistryContainer,
    packCellBits 
} from "../core/qnx/shared_state.js";
import { drawVerticalScrollbarInline } from "./vscrollbar_view.js";

/**
 * Единый стандарт сигнатуры графического ядра QNX IPC
 */
export function drawSlotBufferContent(canvas, sX, sY, sW, sH, selectedIndex, totalItems, slotId) {
    const themesBuffer = _qnxActiveThemesRegistryContainer.buffer;
    if (!themesBuffer) return; // Если буфер тем еще не инжектирован воркером — гасим такт

    const currentColsNum = _qnxHardwareRegistry[(0 << 4) + 0] | 0;
    if (currentColsNum === 0) return;

    const offset = slotId << 4;
    const scrollOffset = _qnxHardwareRegistry[offset + 6] | 0; // REG_SCROLL_OFF

    const startContentY = (sY + 2) | 0; 
    const maxVisibleRows = (sH - 4) | 0; 
    const themesCount = (totalItems | 0) > 100 ? 100 : (totalItems | 0);

    const totalCellsLimit = canvas.length | 0;

    // =================================================================
    // ПОСИМВОЛЬНЫЙ НАКАТ СПИСКА ТЕМ ИЗ БИНАРНОЙ МАТРИЦЫ ОЗУ
    // =================================================================
    if ((totalItems | 0) > 0) {
        for (let r = 0; r < maxVisibleRows; r = (r + 1) | 0) {
            const globalThemeIdx = (scrollOffset + r) | 0;
            if (globalThemeIdx >= themesCount) break;

            const targetGlobalY = (startContentY + r) | 0;
            if (targetGlobalY >= (_qnxHardwareRegistry[(0 << 4) + 1] | 0)) break;

            // Вычисляем смещение страйда темы в плоском байтовом массиве (34 байта на тему)
            const themeOffset = (globalThemeIdx * 34) | 0;
            const isRowSelected = (globalThemeIdx === (selectedIndex | 0));
            
            // Вычисляем xterm-аттрибуты строки
            const fg = isRowSelected ? 16 : 255;
            const bg = isRowSelected ? 231 : 0; // Белая инверсия для курсора

            let canvasPtr = (targetGlobalY * currentColsNum + sX + 2) | 0;
            const maxCols = (sW - 4) | 0;

            // Выводим 32-символьное текстовое имя темы из ОЗУ
            const nameLimit = maxCols > 32 ? 32 : maxCols;
            for (let c = 0; c < nameLimit; c = (c + 1) | 0) {
                const charCode = themesBuffer[themeOffset + c] | 0;
                if (canvasPtr < totalCellsLimit && canvasPtr >= 0) {
                    canvas[canvasPtr++] = packCellBits(charCode, fg, bg);
                }
            }

            // Если хватает ширины окна — выжигаем бинарные маркеры цветов [A] [P] у правого края
            if (maxCols > 38) {
                let markerPtr = (targetGlobalY * currentColsNum + sX + sW - 8) | 0;
                if (markerPtr < totalCellsLimit && markerPtr >= 0) {
                    const activeColorCode  = themesBuffer[themeOffset + 32] | 0;
                    const passiveColorCode = themesBuffer[themeOffset + 33] | 0;

                    canvas[markerPtr++] = packCellBits(0x5B, fg, bg); // '['
                    canvas[markerPtr++] = packCellBits(0x41, activeColorCode, bg); // 'A' цвет рамки активного окна
                    canvas[markerPtr++] = packCellBits(0x5D, fg, bg); // ']'
                    markerPtr++; // пробел
                    canvas[markerPtr++] = packCellBits(0x5B, fg, bg); // '['
                    canvas[markerPtr++] = packCellBits(0x42, passiveColorCode, bg); // 'P' цвет рамки пассивного окна
                    canvas[markerPtr++] = packCellBits(0x5D, fg, bg); // ']'
                }
            }
        }
    }

    // Унифицированная отрисовка вертикального скроллбара
    const isFocused = (_qnxHardwareRegistry[offset + 4] === 1); // REG_FOCUS
    drawVerticalScrollbarInline(
        canvas, currentColsNum, sX, startContentY, sW, maxVisibleRows, scrollOffset, themesCount, isFocused
    );
}

// TIMESTAMP: 2026-09-27 15:35:50
// PATH: c:\slotcmp_5\V\src\views\theme_view.js
