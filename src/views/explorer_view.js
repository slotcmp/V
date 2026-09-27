/**
 * @file src/views/explorer_view.js
 * @version 3.4.0-RELEASE-QNX-EXPLORER-SELF-REGISTERED
 * @description DOD-рендерер файловой структуры с интегрированным безаллокационным скроллбаром.
 * ИСПРАВЛЕНО: Интегрирована автоматическая саморегистрация в Слоты 102 и 103 глобального диспетчера Z-3.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% объектов, плоское ОЗУ.
 */

import { _virtualCanvasState, _shadowCanvasState, _qnxHardwareRegistry, REG_X, REG_Y, REG_W, REG_H, REG_FOCUS, REG_ENABLED, REG_SCROLL_OFF, REG_SELECTED_IDX, REG_ACTIVE_TAB, REG_TOTAL_ITEMS, packCellBits } from "../core/qnx/shared_state.js";
import { drawVerticalScrollbarInline } from "./vscrollbar_view.js";
// 🔥 УТВЕРЖДЕНО: Подключаем открытый диспетчер для инъекции указателя функции
import { _qnxComponentBlitDispatchTable } from "./z3_content_layer.js";

export function drawSlotBufferContent(canvas, sX, sY, sW, sH, selectedIndex, totalItems, slotId) {
    const flatVfsBuffer = globalThis._qnxActiveVfsSharedBufferBypass;
    if (!flatVfsBuffer) return;

    const currentColsNum = _qnxHardwareRegistry[(0 << 4) + 0] | 0;
    if (currentColsNum === 0) return;

    const offset = slotId << 4;
    const scrollOffset = _qnxHardwareRegistry[offset + REG_SCROLL_OFF] | 0;
    const slotMemoryBaseOffset = ((slotId | 0) === 102) ? 0 : 32000;

    const startContentY = (sY + 2) | 0; 
    const maxVisibleRows = (sH - 4) | 0; 
    const filesCount = (totalItems | 0) > 490 ? 490 : (totalItems | 0);

    const isDashboardOpen = _qnxHardwareRegistry[(101 << 4) + 5] | 0;

    if ((totalItems | 0) > 0) {
        for (let r = 0; r < maxVisibleRows; r = (r + 1) | 0) {
            const globalFileIdx = (scrollOffset + r) | 0;
            if (globalFileIdx >= filesCount) break;

            const targetGlobalY = (startContentY + r) | 0;
            if (targetGlobalY >= (_qnxHardwareRegistry[(0 << 4) + 1] | 0)) break;
            if (isDashboardOpen === 1 && targetGlobalY <= 7) continue;

            const fileOffset = (slotMemoryBaseOffset + (globalFileIdx * 64)) | 0;
            const isDir = (flatVfsBuffer[fileOffset] === 1);
            const isRowSelected = (globalFileIdx === (selectedIndex | 0));
            const fg = isRowSelected ? 16 : (isDir ? 220 : 255);
            const bg = isRowSelected ? 231 : 0;

            let canvasPtr = (targetGlobalY * currentColsNum + sX + 2) | 0;
            const maxCols = (sW - 4) | 0;
            const nameLimit = maxCols > 30 ? 30 : maxCols;

            for (let c = 0; c < nameLimit; c = (c + 1) | 0) {
                const rawCharCode = flatVfsBuffer[fileOffset + 1 + c] | 0;
                const charCode = rawCharCode > 0 ? rawCharCode : 0x20; 
                if (canvasPtr < canvas.length && canvasPtr >= 0) canvas[canvasPtr++] = packCellBits(charCode, fg, bg);
            }

            if (maxCols > 32) {
                let typePtr = (targetGlobalY * currentColsNum + sX + sW - 10) | 0;
                if (typePtr < canvas.length && typePtr >= 0) {
                    if (isDir === true) {
                        canvas[typePtr++] = packCellBits(0x3C, fg, bg); canvas[typePtr++] = packCellBits(0x44, fg, bg);
                        canvas[typePtr++] = packCellBits(0x44, fg, bg); canvas[typePtr++] = packCellBits(0x52, fg, bg);
                        canvas[typePtr++] = packCellBits(0x3E, fg, bg);
                    } else {
                        canvas[typePtr++] = packCellBits(0x20, fg, bg); canvas[typePtr++] = packCellBits(0x31, fg, bg);
                        canvas[typePtr++] = packCellBits(0x2E, fg, bg); canvas[typePtr++] = packCellBits(0x30, fg, bg);
                        canvas[typePtr++] = packCellBits(0x4B, fg, bg); canvas[typePtr++] = packCellBits(0x42, fg, bg);
                    }
                }
            }
        }
    }

    const statusBarGlobalY = (sY + sH - 2) | 0; 
    if (statusBarGlobalY > 7 || isDashboardOpen === 0) {
        let textRowGlobalY = (sY + sH - 2) | 0;
        let textStartPtr = (textRowGlobalY * currentColsNum + sX + 1) | 0;
        let textEndPtr = (textStartPtr + sW - 2) | 0;
        for (let ptr = textStartPtr; ptr < textEndPtr; ptr = (ptr + 1) | 0) {
            if (ptr < canvas.length && ptr >= 0) canvas[ptr] = packCellBits(0x20, 7, 0); 
        }
        const statusTextStr = `Files: ${totalItems}`;
        let textPtr = (textStartPtr + 1) | 0; 
        for (let i = 0; i < statusTextStr.length; i = (i + 1) | 0) {
            if (textPtr >= textEndPtr) break;
            if (textPtr < canvas.length && textPtr >= 0) canvas[textPtr++] = packCellBits(statusTextStr.charCodeAt(i), 250, 0); 
        }
    }

    const isFocused = (_qnxHardwareRegistry[offset + 4] === 1);
    drawVerticalScrollbarInline(canvas, currentColsNum, sX, startContentY, sW, maxVisibleRows, scrollOffset, filesCount, isFocused);
}

// 🔥 СНАЙПЕРСКАЯ САМОИНЪЕКЦИЯ: Проводник сам прошивает себя в Левый и Правый слоты при пуске
_qnxComponentBlitDispatchTable[102] = drawSlotBufferContent;
_qnxComponentBlitDispatchTable[103] = drawSlotBufferContent;

// TIMESTAMP: 2026-09-27 15:45:15
// PATH: c:\slotcmp_5\V\src\views\explorer_view.js
