/**
 * @file src/views/z1_frame_layer.js
 * @version 1.4.0-RELEASE-QNX-Z1-VIEWER-FRAMES-FIXED
 * @description DOD-процедура послойного наката стальных каркасов рам окон (Слой Z-1).
 * ИСПРАВЛЕНО: Лимит цикла расширен до Слота 110. Вьюер гарантированно обводится рамой.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% объектов, 100% плоское ОЗУ ядра.
 */

import { 
    _virtualCanvasState, 
    _qnxHardwareRegistry, 
    getDynamicThemeActiveColor, 
    getDynamicThemePassiveColor, 
    REG_X, REG_Y, REG_W, REG_H, REG_FOCUS, REG_ENABLED, packCellBits 
} from "../core/qnx/shared_state.js";

export function reduceFrameLayer(currentCols) {
    const currentRows = _qnxHardwareRegistry[(0 << 4) + 1] | 0;
    const totalCellsLimit = (currentCols * currentRows) | 0;

    // Извлекаем индекс выбранной темы из регистра Слота 106 (REG_SELECTED_IDX = 7)
    const activeThemeId = _qnxHardwareRegistry[(106 << 4) + 7] | 0;

    // 🔥 ИСПРАВЛЕНО: Лимит цикла расширен до 110, чтобы Слот 110 легитимно получал обводку рамы
    for (let slotId = 101; slotId <= 110; slotId = (slotId + 1) | 0) {
        // Пропускаем выключенные в текущий микротакт слоты (103 и 106 будут пропущены)
        const offset = slotId << 4;
        if (_qnxHardwareRegistry[offset + REG_ENABLED] === 0) continue; 

        const sX = _qnxHardwareRegistry[offset + REG_X] | 0; 
        const sY = _qnxHardwareRegistry[offset + REG_Y] | 0; 
        const sW = _qnxHardwareRegistry[offset + REG_W] | 0; 
        const sH = _qnxHardwareRegistry[offset + REG_H] | 0; 
        const isF = _qnxHardwareRegistry[offset + REG_FOCUS] | 0; 

        if (sH === 1 || sW < 2) continue; 

        // Реактивный подмен цвета рамы из динамического буфера темы
        const frameColorNum = (isF === 1) 
            ? (getDynamicThemeActiveColor(activeThemeId) | 0) 
            : (getDynamicThemePassiveColor(activeThemeId) | 0);
        
        // Рендерим горизонтальные грани рамы (═)
        for (let x = sX; x < ((sX + sW) | 0); x = (x + 1) | 0) {
            const topPtr = (sY * currentCols + x) | 0;
            const botPtr = (((sY + sH - 1) | 0) * currentCols + x) | 0;

            if (topPtr < totalCellsLimit) _virtualCanvasState[topPtr] = packCellBits(0x2550, frameColorNum, 0); 
            if (botPtr < totalCellsLimit) _virtualCanvasState[botPtr] = packCellBits(0x2550, frameColorNum, 0); 
        }
        
        // Рендерим вертикальные грани рамы (║)
        for (let y = sY; y < ((sY + sH) | 0); y = (y + 1) | 0) {
            const leftPtr = (y * currentCols + sX) | 0;
            const rightPtr = (y * currentCols + (sX + sW - 1)) | 0;

            if (leftPtr < totalCellsLimit)  _virtualCanvasState[leftPtr]  = packCellBits(0x2551, frameColorNum, 0); 
            if (rightPtr < totalCellsLimit) _virtualCanvasState[rightPtr] = packCellBits(0x2551, frameColorNum, 0); 
        }
        
        // Запечатываем угловые стыки рамы (╔, ╗, ╚, ╝)
        const cornerTopLeftPtr  = (sY * currentCols + sX) | 0;
        const cornerTopRightPtr = (sY * currentCols + (sX + sW - 1)) | 0;
        const cornerBotLeftPtr  = (((sY + sH - 1) | 0) * currentCols + sX) | 0;
        const cornerBotRightPtr = (((sY + sH - 1) | 0) * currentCols + (sX + sW - 1)) | 0;

        if (cornerTopLeftPtr < totalCellsLimit)  _virtualCanvasState[cornerTopLeftPtr]  = packCellBits(0x2554, frameColorNum, 0); 
        if (cornerTopRightPtr < totalCellsLimit) _virtualCanvasState[cornerTopRightPtr] = packCellBits(0x2557, frameColorNum, 0); 
        if (cornerBotLeftPtr < totalCellsLimit)  _virtualCanvasState[cornerBotLeftPtr]  = packCellBits(0x255A, frameColorNum, 0); 
        if (cornerBotRightPtr < totalCellsLimit) _virtualCanvasState[cornerBotRightPtr] = packCellBits(0x255D, frameColorNum, 0);
    }
}

// TIMESTAMP: 2026-09-27 14:35:10
// PATH: c:\slotcmp_5\V\src\views\z1_frame_layer.js
