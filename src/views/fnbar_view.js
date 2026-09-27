/**
 * @file src/modules/fnbar/fnbar_view.js
 * @version 3.0.0-RELEASE-QNX-STRICT-PURE-VIEW
 * @description Презентационный DOD-блайтер тушек меню F1-F10 (Presentation-слой).
 * ИСПРАВЛЕНО: Связь ушек и тушек. Смещение 1-based индексов полностью ликвидировано.
 */

import { 
    _virtualCanvasState, 
    _shadowCanvasState, 
    _qnxHardwareRegistry, 
    REG_X, REG_Y, REG_W, REG_H, 
    REG_FOCUS, REG_ENABLED, REG_SCROLL_OFF, REG_SELECTED_IDX, REG_ACTIVE_TAB, REG_TOTAL_ITEMS,
    packCellBits // 🔥 ИСПРАВЛЕНО: Упаковщик битов теперь наливается отсюда
} from "../core/qnx/shared_state.js";

import { _STATIC_FN_MATRIX } from "./fnbar_mdl.js";

/**
 * Синхронно выжигает плитку функциональных клавиш F1-F10 в единую видеопамять холста
 * 
 * @param {Int32Array} canvas Ссылка на глобальный _virtualCanvasState
 * @param {number} y104 Вычисленный из ОЗУ живой Y-индекс строки Слота 104
 * @param {number} currentCols Живая ширина растра из Слота 0
 * @param {number} activeModIdx Индекс выбранного ушка из Слота 200 (0..3)
 */
export function drawFnbarTuchesOverlay(canvas, y104, currentCols, activeModIdx) {
    let fnPtr = (y104 * currentCols) | 0;
    
    // Затираем всю целевую строку пассивным темным фоном (xterm 0)
    for (let x = 0; x < currentCols; x = (x + 1) | 0) {
        canvas[fnPtr + x] = packCellBits(0x20, 7, 0);
    }

    // Вычисляем точную флекс-ширину одного блока клавиши (12 знакомест при Cols=120)
    const singleKeyWidth = Math.floor(currentCols / 10) | 0;

    for (let k = 1; k <= 10; k = (k + 1) | 0) {
        const numStr = String(k);
        // СНАЙПЕРСКОЕ ИСПРАВЛЕНИЕ: Читаем строго по 1-based индексу 'k' из модели!
        const labelStr = _STATIC_FN_MATRIX[activeModIdx & 3][k] || ""; 

        // 1. Выжигаем номер клавиши: Ярко-желтый на черном фоне (fg = 220, bg = 0)
        for (let i = 0; i < numStr.length; i = (i + 1) | 0) {
            canvas[fnPtr++] = packCellBits(numStr.charCodeAt(i), 220, 0);
        }

        // 2. Вычисляем чистый пиксельный остаток под текстовый ярлык кнопки
        const maxCmdChars = (singleKeyWidth - numStr.length) | 0;
        
        // 3. Выжигаем ярлык: Белый текст на бирюзовой плашке Teal (fg = 231, bg = 30)
        for (let c = 0; c < maxCmdChars; c = (c + 1) | 0) {
            const charCode = c < labelStr.length ? labelStr.charCodeAt(c) : 0x20; // Паддинг пробелами
            canvas[fnPtr++] = packCellBits(charCode, 231, 30);
        }
        
        fnPtr = (fnPtr + 1) | 0; // Небольшой пробельный шаг зазора между блоками клавиш
    }
}
