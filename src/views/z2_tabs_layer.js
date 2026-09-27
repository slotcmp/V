/**
 * @file src/views/z2_tabs_layer.js
 * @version 1.4.0-RELEASE-QNX-Z2-DYNAMIC-THEMES-INTEGRATED
 * @description DOD-процедура вгравирования паспортов, кнопок на раму и ушек под раму (Слой Z-2).
 * ИСПРАВЛЕНО: Цвет обвеса кнопок [─] [▲] [×] переведен на динамическую палитру выбранной темы.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% создания строк в куче V8, 100% Zero Allocation.
 */

import { 
    _virtualCanvasState, 
    _qnxHardwareRegistry, 
    getDynamicThemeActiveColor, 
    getDynamicThemePassiveColor, 
    REG_X, REG_Y, REG_W, REG_H, REG_FOCUS, REG_ENABLED, REG_ACTIVE_TAB, packCellBits 
} from "../core/qnx/shared_state.js";

const _STATIC_TAB_LABELS_101 = ["RULER", "MONITOR"];
const _STATIC_TAB_LABELS_102 = ["SYS", "SRC", "MOD", "LOG"];
const _STATIC_TAB_LABELS_103 = ["ROOT", "CONF", "WORK"];
const _STATIC_TAB_LABELS_106 = ["PALETTE"];

// Статический преаллоцированный буфер каретки для посимвольной сборки паспорта (0% GC)
const _staticPspCharBuffer = new Uint8Array(32);

export function reduceTabsLayer(currentCols) {
    const currentRows = _qnxHardwareRegistry[(0 << 4) + 1] | 0;
    const totalCellsLimit = (currentCols * currentRows) | 0;

    // 🔥 УТВЕРЖДЕНО: Извлекаем индекс выбранной темы из регистра Слота 106 (REG_SELECTED_IDX = 7)
    const activeThemeId = _qnxHardwareRegistry[(106 << 4) + 7] | 0;

    for (let slotId = 101; slotId <= 106; slotId = (slotId + 1) | 0) {
        const offset = slotId << 4;
        if (_qnxHardwareRegistry[offset + REG_ENABLED] === 0) continue;

        const sX = _qnxHardwareRegistry[offset + REG_X] | 0; 
        const sY = _qnxHardwareRegistry[offset + REG_Y] | 0; 
        const sW = _qnxHardwareRegistry[offset + REG_W] | 0; 
        const sH = _qnxHardwareRegistry[offset + REG_H] | 0; 
        const isF = _qnxHardwareRegistry[offset + REG_FOCUS] | 0;

        if (sH === 1 || sW < 2) continue; 

        // 🔥 ИСПРАВЛЕНО: Реактивный подмен цвета обвеса из динамического буфера темы
        const frameColorNum = (isF === 1) 
            ? (getDynamicThemeActiveColor(activeThemeId) | 0) 
            : (getDynamicThemePassiveColor(activeThemeId) | 0);
            
        const bgColor = 0;

        // =================================================================
        // КОНТУР А: ВРЕЗКА ДИНАМИЧЕСКИХ ПАСПОРТОВ НА РАМУ (Y = sY)
        // =================================================================
        let totalTabs = 1;
        let labelsArr = _STATIC_TAB_LABELS_102;
        
        if (slotId === 101) { totalTabs = 2; labelsArr = _STATIC_TAB_LABELS_101; }
        if (slotId === 102) { totalTabs = 4; labelsArr = _STATIC_TAB_LABELS_102; }
        if (slotId === 103) { totalTabs = 3; labelsArr = _STATIC_TAB_LABELS_103; }
        if (slotId === 106) { totalTabs = 1; labelsArr = _STATIC_TAB_LABELS_106; }

        const activeTabIdx = _qnxHardwareRegistry[offset + REG_ACTIVE_TAB] | 0;
        const liveDisplayIndex = _qnxHardwareRegistry[offset + 10] | 0; // REG_DISPLAY_IDX

        // Безаллокационная сборка строки "[Alt+N: ID A/T]==" побайтово
        let pB = 0;
        _staticPspCharBuffer[pB++] = 0x5B; 
        _staticPspCharBuffer[pB++] = 0x41; 
        _staticPspCharBuffer[pB++] = 0x6C; 
        _staticPspCharBuffer[pB++] = 0x54; 
        _staticPspCharBuffer[pB++] = 0x2B; 
        _staticPspCharBuffer[pB++] = (0x30 + liveDisplayIndex) | 0; 
        _staticPspCharBuffer[pB++] = 0x3A; 
        _staticPspCharBuffer[pB++] = 0x20; 
        
        _staticPspCharBuffer[pB++] = (0x30 + Math.floor(slotId / 100)) | 0;
        _staticPspCharBuffer[pB++] = (0x30 + Math.floor((slotId % 100) / 10)) | 0;
        _staticPspCharBuffer[pB++] = (0x30 + (slotId % 10)) | 0;
        _staticPspCharBuffer[pB++] = 0x20; 

        _staticPspCharBuffer[pB++] = (0x30 + ((activeTabIdx + 1) | 0)) | 0;
        _staticPspCharBuffer[pB++] = 0x2F; 
        _staticPspCharBuffer[pB++] = (0x30 + totalTabs) | 0;
        _staticPspCharBuffer[pB++] = 0x5D; 
        _staticPspCharBuffer[pB++] = 0x3D; 
        _staticPspCharBuffer[pB++] = 0x3D; 

        let currentTabX = (sX + 1) | 0;
        if (sW > (pB + 15)) {
            for (let i = 0; i < pB; i = (i + 1) | 0) {
                const targetPtr = (sY * currentCols + currentTabX++) | 0;
                if (targetPtr < totalCellsLimit) {
                    _virtualCanvasState[targetPtr] = packCellBits(_staticPspCharBuffer[i], 244, bgColor);
                }
            }
        }

        // Рендеринг кнопок управления окном [─] [▲] [×]
        if (sW > 16) {
            const startButtonsX = (sX + sW - 12) | 0;
            const btnPassiveColor = 244;
            const closeActiveColor = 196;

            const basePtr = (sY * currentCols) | 0;
            if ((basePtr + startButtonsX + 10) < totalCellsLimit) {
                _virtualCanvasState[basePtr + startButtonsX]     = packCellBits(0x5B, frameColorNum, bgColor); 
                _virtualCanvasState[basePtr + startButtonsX + 1] = packCellBits(0x2D, btnPassiveColor, bgColor); 
                _virtualCanvasState[basePtr + startButtonsX + 2] = packCellBits(0x5D, frameColorNum, bgColor); 

                _virtualCanvasState[basePtr + startButtonsX + 4] = packCellBits(0x5B, frameColorNum, bgColor); 
                _virtualCanvasState[basePtr + startButtonsX + 5] = packCellBits(0x25B2, isF === 1 ? 46 : btnPassiveColor, bgColor); 
                _virtualCanvasState[basePtr + startButtonsX + 6] = packCellBits(0x5D, frameColorNum, bgColor); 

                _virtualCanvasState[basePtr + startButtonsX + 8] = packCellBits(0x5B, frameColorNum, bgColor); 
                _virtualCanvasState[basePtr + startButtonsX + 9] = packCellBits(0xD7, closeActiveColor, bgColor); 
                _virtualCanvasState[basePtr + startButtonsX + 10] = packCellBits(0x5D, frameColorNum, bgColor); 
            }
        }

        // =================================================================
        // КОНТУР Б: ТОЧЕЧНАЯ ЗАТИРКА И НАКАТ УШЕК ТАБОВ (Y = sY + 1)
        // =================================================================
        const targetTabsY = (sY + 1) | 0;
        const innerFrameRightEdge = (sX + sW - 1) | 0;
        
        for (let clearX = (sX + 1) | 0; clearX < innerFrameRightEdge; clearX = (clearX + 1) | 0) {
            const targetPtr = (targetTabsY * currentCols + clearX) | 0;
            if (targetPtr < totalCellsLimit) _virtualCanvasState[targetPtr] = packCellBits(0x20, 7, 0); 
        }

        currentTabX = (sX + 2) | 0; 
        const maxTabsCount = labelsArr.length | 0;

        for (let t = 0; t < maxTabsCount; t = (t + 1) | 0) {
            const isCurrent = (t === activeTabIdx);
            const bg = isCurrent ? (isF === 1 ? 220 : 51) : 236; 
            const fg = isCurrent ? 16 : 246;
            const labelStr = labelsArr[t | 0];
            const labelLen = labelStr.length | 0;
            
            if ((currentTabX + labelLen + 2) < innerFrameRightEdge) {
                const baseTabPtr = (targetTabsY * currentCols) | 0;
                if ((baseTabPtr + currentTabX + labelLen + 2) < totalCellsLimit) {
                    _virtualCanvasState[baseTabPtr + currentTabX++] = packCellBits(0x5B, fg, bg); 
                    for (let ch = 0; ch < labelLen; ch = (ch + 1) | 0) {
                        _virtualCanvasState[baseTabPtr + currentTabX++] = packCellBits(labelStr.charCodeAt(ch), fg, bg);
                    }
                    _virtualCanvasState[baseTabPtr + currentTabX++] = packCellBits(0x5D, fg, bg); 
                    currentTabX = (currentTabX + 1) | 0; 
                }
            }
        }
    }
}
