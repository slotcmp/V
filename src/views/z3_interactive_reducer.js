/**
 * @file src/views/z3_interactive_reducer.js
 * @version 1.1.2-RELEASE-QNX-INTERACTIVE-102-RESTORED
 * @description Выделенный DOD-редьюсер наката интерактивных кнопок, хлястика Дашборда и паспорта Слота 102.
 * ИСПРАВЛЕНО: Обвес и паспорт Слота 102 полностью восстановлены. Безрамочные слоты и Слот 110 защищены от перетирания.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% объектов в куче V8, чистый посимвольный JIT-выжиг.
 */

import { _virtualCanvasState, _qnxHardwareRegistry, REG_X, REG_Y, REG_W, REG_H, REG_FOCUS, REG_ENABLED, packCellBits } from "../core/qnx/shared_state.js";

/**
 * Синхронно выжигает хлястик Дашборда, а также паспорт и обвес кнопок Левого Проводника 102
 */
export function processInteractiveReducer(currentCols) {
    if ((currentCols | 0) <= 0) return;
    const currentRows = _qnxHardwareRegistry[(0 << 4) + 1] | 0;
    const totalCellsLimit = (currentCols * currentRows) | 0;

    const o101 = 101 << 4;
    const isDashboardOpen = _qnxHardwareRegistry[o101 + REG_ENABLED] | 0;
    const isF101 = _qnxHardwareRegistry[o101 + REG_FOCUS] | 0;

    const frameColorNum101 = isF101 === 1 ? 51 : 242;

    const sX101 = _qnxHardwareRegistry[o101 + REG_X] | 0;
    const sY101 = _qnxHardwareRegistry[o101 + REG_Y] | 0; // Строка Y = 1
    const sW101 = _qnxHardwareRegistry[o101 + REG_W] | 0; 

    const topLineStartPtr = (sY101 * currentCols) | 0;

    // Математика статусных стрелок хлястика
    const leftArrowColor  = (isDashboardOpen === 0) ? 46  : 196; 
    const rightArrowColor = (isDashboardOpen === 0) ? 196 : 46;  

    const bodyStr = " 101:DASHBOARD ";
    const bodyLen = bodyStr.length | 0;
    const totalHlyastikLen = (bodyLen + 6) | 0; 
    
    let hlyastikX = ((currentCols - totalHlyastikLen) >> 1) | 0;
    let hlyastikPtr = (topLineStartPtr + hlyastikX) | 0;

    // =================================================================
    // ПАСС 1: РЕНДЕРИНГ ШТАТНОГО ОБВЕСА КНОПОК ОКНА 101 (Только если ОТКРЫТО)
    // =================================================================
    if (isDashboardOpen === 1 && sW101 > 16 && (topLineStartPtr + sW101) <= totalCellsLimit) {
        const startButtonsX = (sX101 + sW101 - 12) | 0;
        
        _virtualCanvasState[topLineStartPtr + startButtonsX]     = packCellBits(0x5B, frameColorNum101, 0); // '['
        _virtualCanvasState[topLineStartPtr + startButtonsX + 1] = packCellBits(0x2D, 244, 0);           // '─'
        _virtualCanvasState[topLineStartPtr + startButtonsX + 2] = packCellBits(0x5D, frameColorNum101, 0); // ']'

        _virtualCanvasState[topLineStartPtr + startButtonsX + 4] = packCellBits(0x5B, frameColorNum101, 0); 
        _virtualCanvasState[topLineStartPtr + startButtonsX + 5] = packCellBits(0x25B2, isF101 === 1 ? 46 : 244, 0); // '▲'
        _virtualCanvasState[topLineStartPtr + startButtonsX + 6] = packCellBits(0x5D, frameColorNum101, 0); 

        _virtualCanvasState[topLineStartPtr + startButtonsX + 8] = packCellBits(0x5B, frameColorNum101, 0); 
        _virtualCanvasState[topLineStartPtr + startButtonsX + 9] = packCellBits(0xD7, 196, 0);           // '×'
        _virtualCanvasState[topLineStartPtr + startButtonsX + 10] = packCellBits(0x5D, frameColorNum101, 0); 
    }

    // =================================================================
    // ПАСС 2: ВСПЛЕСК ИНТЕРАКТИВНОГО ХЛЯСТИКА-ТРИГГЕРА ПО ЦЕНТРУ РАМЫ
    // =================================================================
    if (hlyastikX >= sX101 && (hlyastikPtr + totalHlyastikLen) <= totalCellsLimit) {
        _virtualCanvasState[hlyastikPtr++] = packCellBits(0x20, 245, 0); 
        _virtualCanvasState[hlyastikPtr++] = packCellBits(0x5B, 245, 0); 
        _virtualCanvasState[hlyastikPtr++] = packCellBits(0x25BC, leftArrowColor, 0); 

        const textStyleColor = (isDashboardOpen === 1) ? 51 : 245; 
        for (let i = 0; i < bodyLen; i = (i + 1) | 0) {
            _virtualCanvasState[hlyastikPtr++] = packCellBits(bodyStr.charCodeAt(i), textStyleColor, 0);
        }

        _virtualCanvasState[hlyastikPtr++] = packCellBits(0x25B2, rightArrowColor, 0); 
        _virtualCanvasState[hlyastikPtr++] = packCellBits(0x5D, 245, 0); 
        _virtualCanvasState[hlyastikPtr++] = packCellBits(0x20, 245, 0); 
    }

    // =================================================================
    // 🔥 ПАСС 3: УТВЕРЖДЕНО: НАКАТ ОБВЕСА КНОПОК И ПАСПОРТА СТРОГО ДЛЯ СЛОТА 102
    // =================================================================
    const o102 = 102 << 4;
    if (_qnxHardwareRegistry[o102 + REG_ENABLED] === 1) {
        const sX = _qnxHardwareRegistry[o102 + REG_X] | 0;
        const sY = _qnxHardwareRegistry[o102 + REG_Y] | 0; 
        const sW = _qnxHardwareRegistry[o102 + REG_W] | 0;
        const isF = _qnxHardwareRegistry[o102 + REG_FOCUS] | 0;
        const displayIdx = _qnxHardwareRegistry[o102 + 10] | 0; // Читаем REG_DISPLAY_IDX

        if (sW >= 16) {
            const winFrameColor = isF === 1 ? 51 : 242; 
            const winTopLineStartPtr = (sY * currentCols) | 0;

            if ((winTopLineStartPtr + sX + sW) <= totalCellsLimit) {
                // Шаг А: Выжигаем бирюзовые кнопки управления [─] [▲] [×]
                const btnX = (sX + sW - 12) | 0;
                let pB = (winTopLineStartPtr + btnX) | 0;

                _virtualCanvasState[pB++] = packCellBits(0x5B, winFrameColor, 0); // '['
                _virtualCanvasState[pB++] = packCellBits(0x2500, winFrameColor, 0); // '─'
                _virtualCanvasState[pB++] = packCellBits(0x5D, winFrameColor, 0); // ']'
                pB++; 

                _virtualCanvasState[pB++] = packCellBits(0x5B, winFrameColor, 0); // '['
                _virtualCanvasState[pB++] = packCellBits(0x25B2, isF === 1 ? 46 : winFrameColor, 0); // '▲'
                _virtualCanvasState[pB++] = packCellBits(0x5D, winFrameColor, 0); // ']'
                pB++; 

                _virtualCanvasState[pB++] = packCellBits(0x5B, winFrameColor, 0); // '['
                _virtualCanvasState[pB++] = packCellBits(0xD7, 196, 0);           // '×'
                _virtualCanvasState[pB++] = packCellBits(0x5D, winFrameColor, 0); // ']'

                // Шаг Б: Выжигаем паспорт Левого Проводника: "[ALT+2: 102 1/4]="
                let pasX = (sX + 2) | 0;
                let pP = (winTopLineStartPtr + pasX) | 0;

                _virtualCanvasState[pP++] = packCellBits(0x5B, winFrameColor, 0); // '['
                _virtualCanvasState[pP++] = packCellBits(0x41, winFrameColor, 0); // 'A'
                _virtualCanvasState[pP++] = packCellBits(0x4C, winFrameColor, 0); // 'L'
                _virtualCanvasState[pP++] = packCellBits(0x54, winFrameColor, 0); // 'T'
                _virtualCanvasState[pP++] = packCellBits(0x2B, winFrameColor, 0); // '+'
                _virtualCanvasState[pP++] = packCellBits(0x30 + displayIdx, isF === 1 ? 220 : winFrameColor, 0); // '2'
                _virtualCanvasState[pP++] = packCellBits(0x3A, winFrameColor, 0); // ':'
                _virtualCanvasState[pP++] = packCellBits(0x20, winFrameColor, 0); // ' '
                _virtualCanvasState[pP++] = packCellBits(0x31, isF === 1 ? 255 : winFrameColor, 0); // '1'
                _virtualCanvasState[pP++] = packCellBits(0x30, isF === 1 ? 255 : winFrameColor, 0); // '0'
                _virtualCanvasState[pP++] = packCellBits(0x32, isF === 1 ? 255 : winFrameColor, 0); // '2'
                _virtualCanvasState[pP++] = packCellBits(0x20, winFrameColor, 0); // ' '
                _virtualCanvasState[pP++] = packCellBits(0x31, winFrameColor, 0); // '1'
                _virtualCanvasState[pP++] = packCellBits(0x2F, winFrameColor, 0); // '/'
                _virtualCanvasState[pP++] = packCellBits(0x34, winFrameColor, 0); // '4'
                _virtualCanvasState[pP++] = packCellBits(0x5D, winFrameColor, 0); // ']'
                _virtualCanvasState[pP++] = packCellBits(0x3D, winFrameColor, 0); // '='
            }
        }
    }
}

// TIMESTAMP: 2026-09-27 15:18:10
// PATH: c:\slotcmp_5\V\src\views\z3_interactive_reducer.js
