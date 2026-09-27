/**
 * @file src/views/z3_content_layer.js
 * @version 1.6.2-RELEASE-QNX-Z3-EXTENSIBILITY-FIXED
 * @description DOD-процедура затирки оконного фона, наката общих рамок/табов и полиморфной диспетчеризации контента слотов (Слой Z-3).
 * ИСПРАВЛЕНО: Блокировка preventExtensions удалена со стадии инициализации модуля, ликвидирован TypeError вьюшек.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch в рантайме, 0% объектов в цикле редукции, 100% Zero Allocation.
 */

import fs from "node:fs";
import pathNode from "node:path";

import { _virtualCanvasState, _qnxHardwareRegistry, REG_X, REG_Y, REG_W, REG_H, REG_FOCUS, REG_ENABLED, REG_SELECTED_IDX, REG_TOTAL_ITEMS, packCellBits } from "../core/qnx/shared_state.js";
import { drawAbstractWindowWrapper } from "../core/qnx/window_manager.js";

// Открытая плоская DOD-матрица графических роутеров по индексам slotId
export const _qnxComponentBlitDispatchTable = [];

// Автоматический стартовый цикл сборки диспетчера (Build-Time / Boot-Stage Mapping)
const slotsConfigPath = pathNode.resolve(process.cwd(), "./slots_config.json");
const rawConfigData = fs.readFileSync(slotsConfigPath, "utf8");
const slotsConfig = JSON.parse(rawConfigData);

const slotKeysArray = Object.keys(slotsConfig);
const keysCount = slotKeysArray.length | 0;

for (let i = 0; i < keysCount; i = (i + 1) | 0) {
    const slotIdStr = slotKeysArray[i];
    const slotIdNum = parseInt(slotIdStr, 10) & 255;
    if (isNaN(slotIdNum) || slotIdNum === 0) continue;

    // Стерильно резервируем ячейку в массиве под каждый слот из конфига
    _qnxComponentBlitDispatchTable[slotIdNum] = null;
}

// 🔥 ИСПРАВЛЕНО: Любые preventExtensions/freeze на этапе бутстрапа модуля ЗАПРЕЩЕНЫ.
// Массив запечатает верховное ядро в index.js строго ПОСЛЕ завершения саморегистрации всех вьюх.

export function reduceContentLayer(currentCols) {
    const currentRows = _qnxHardwareRegistry[(0 << 4) + 1] | 0;
    const totalCellsLimit = (currentCols * currentRows) | 0;

    const isDashboardOpen = _qnxHardwareRegistry[(101 << 4) + 5] | 0; // REG_ENABLED
    const activeThemeId = _qnxHardwareRegistry[(106 << 4) + 7] | 0;   // REG_SELECTED_IDX Темы

    // Цикл сканирует весь диапазон бизнес-слотов воркспейса
    for (let slotId = 102; slotId <= 110; slotId = (slotId + 1) | 0) {
        const offset = slotId << 4;
        if (_qnxHardwareRegistry[offset + REG_ENABLED] === 0) continue; 

        const sX = _qnxHardwareRegistry[offset + REG_X] | 0; 
        const sY = _qnxHardwareRegistry[offset + REG_Y] | 0; 
        const sW = _qnxHardwareRegistry[offset + REG_W] | 0; 
        const sH = _qnxHardwareRegistry[offset + REG_H] | 0; 
        const isF = _qnxHardwareRegistry[offset + REG_FOCUS] | 0; 

        if (sH === 0 || sW === 0) continue;

        // Базовая затирка фона прибора точечной текстурой (Z-3 фон)
        if (sH > 1 && sW >= 2) {
            const contentColorNum = isF === 1 ? 245 : 238;
            for (let y = ((sY + 2) | 0); y < ((sY + sH - 1) | 0); y = (y + 1) | 0) {
                if (isDashboardOpen === 1 && y <= 7) continue;

                const rowStartPtr = (y * currentCols) | 0;
                for (let x = ((sX + 1) | 0); x < ((sX + sW - 1) | 0); x = (x + 1) | 0) {
                    const isDot = (((x + y) & 1) === 0);
                    const canvasPtr = (rowStartPtr + x) | 0;
                    if (canvasPtr < totalCellsLimit && canvasPtr >= 0) {
                        _virtualCanvasState[canvasPtr] = packCellBits(isDot ? 0x00B7 : 0x20, contentColorNum, 0); 
                    }
                }
            }
        }

        // Накатываем общую стальную раму и ушки вкладок через Window Manager
        drawAbstractWindowWrapper(_virtualCanvasState, slotId, currentCols, totalCellsLimit, activeThemeId);

        // Мономорфный выстрел по индексу
        const blitRendererFn = _qnxComponentBlitDispatchTable[slotId];

        if (blitRendererFn) {
            const currentSelectedIdxNum = _qnxHardwareRegistry[offset + REG_SELECTED_IDX] | 0; 
            const totalCellsNum         = _qnxHardwareRegistry[offset + REG_TOTAL_ITEMS] | 0; 
            
            blitRendererFn(_virtualCanvasState, sX, sY, sW, sH, currentSelectedIdxNum, totalCellsNum, slotId);
        }
    }
}

// TIMESTAMP: 2026-09-27 21:51:12
// PATH: c:\slotcmp_5\V\src\views\z3_content_layer.js
