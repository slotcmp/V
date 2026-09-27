/**
 * @file src/views/viewer_view.js
 * @version 1.5.2-RELEASE-QNX-VIEWER-TRIPLE-PASS-MUTATION-FIXED
 * @description Стерильный декомпозированный отрисовщик контента Слота 110 (Viewers).
 * ИСПРАВЛЕНО: Ликвидирована ошибка перезаписи константы за счет указания индекса [110] таблицы диспетчеризации.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% RegExp, 0% создания строк, 100% Zero Allocation.
 */

import { _qnxHardwareRegistry, _qnxStaticTextViewerBuffer, packCellBits } from "../core/qnx/shared_state.js";
import { drawVerticalScrollbarInline } from "./vscrollbar_view.js";
import { _qnxComponentBlitDispatchTable } from "./z3_content_layer.js";

import { calculateMarkdownTableGeometry, _staticAbsoluteColumnXPositions } from "./viewer/table_geometry.js";
import { clearUtf8DecoderState, processUtf8QuantumByte } from "./viewer/utf8_decoder.js";

const _staticColumnWidthsRegistry = new Int32Array(8);
const _staticRowLineByteBuffer      = new Int32Array(256);
const _staticRowMetaStyleBuffer     = new Uint8Array(256); 

export function drawSlotBufferContent(canvas, sX, sY, sW, sH, selectedIndex, totalCells, slotId) {
    const currentColsNum = _qnxHardwareRegistry[(0 << 4) + 0] | 0;
    if (currentColsNum === 0 || sW < 2 || sH < 3) return;

    const offset = slotId << 4;
    const scrollOffset = _qnxHardwareRegistry[offset + 6] | 0; 
    const activeTabMode = _qnxHardwareRegistry[offset + 8] | 0; 
    const isFocused    = (_qnxHardwareRegistry[offset + 4] === 1); 

    const totalCellsLimit = canvas.length | 0;
    const startContentY = (sY + 2) | 0; 
    const maxVisibleRows = (sH - 4) | 0; 

    const bufferLimit = _qnxStaticTextViewerBuffer.length | 0;
    let currentBytePtr = 0;
    let currentLineIdx = 0;

    while (currentBytePtr < bufferLimit && currentLineIdx < scrollOffset) {
        const byte = _qnxStaticTextViewerBuffer[currentBytePtr];
        if (byte === 0x00) break;
        if (byte === 0x0A) currentLineIdx = (currentLineIdx + 1) | 0;
        currentBytePtr = (currentBytePtr + 1) | 0;
    }

    const rightMaxEdgeX = (sX + sW - 2) | 0;

    calculateMarkdownTableGeometry(_qnxStaticTextViewerBuffer, currentBytePtr, bufferLimit, maxVisibleRows, _staticColumnWidthsRegistry);

    for (let r = 0; r < maxVisibleRows; r = (r + 1) | 0) {
        if (currentBytePtr >= bufferLimit) break;
        if (_qnxStaticTextViewerBuffer[currentBytePtr] === 0x00) break;

        const targetGlobalY = (startContentY + r) | 0;
        let canvasPtr = (targetGlobalY * currentColsNum + sX + 2) | 0;

        let isMarkdownHeading = false;
        let isInlineCodeMode = false;
        let isBoldMode = false;

        let tempBytePtr = currentBytePtr | 0;
        let pipesInRowTracker = 0;
        let hasContentChars = false;

        while (tempBytePtr < bufferLimit) {
            const b = _qnxStaticTextViewerBuffer[tempBytePtr];
            if (b === 0x0A || b === 0x00) break;
            if (b === 0x7C) pipesInRowTracker = (pipesInRowTracker + 1) | 0;
            if (b !== 0x20 && b !== 0x7C && b !== 0x2D && b !== 0x3A) {
                hasContentChars = true; 
            }
            tempBytePtr = (tempBytePtr + 1) | 0;
        }

        const isRowDelimiter = (pipesInRowTracker > 1 && hasContentChars === false);

        _staticRowLineByteBuffer.fill(0x20); 
        _staticRowMetaStyleBuffer.fill(0);
        let writeBufferX = 0;

        clearUtf8DecoderState();
        let currentColumnIdx = 0;

        while (currentBytePtr < bufferLimit) {
            const charByte = _qnxStaticTextViewerBuffer[currentBytePtr];
            if (charByte === 0x0A || charByte === 0x00) {
                currentBytePtr = (currentBytePtr + 1) | 0;
                break; 
            }
            
            let finalCharCode = processUtf8QuantumByte(charByte);
            if (finalCharCode === 0) {
                currentBytePtr = (currentBytePtr + 1) | 0;
                continue; 
            }

            if (activeTabMode === 0 && finalCharCode === 0x2A) {
                if (currentBytePtr < bufferLimit && _qnxStaticTextViewerBuffer[currentBytePtr] === 0x2A) {
                    isBoldMode = !isBoldMode;
                    currentBytePtr = (currentBytePtr + 1) | 0; 
                    currentBytePtr = (currentBytePtr + 1) | 0; 
                    continue;
                }
            }

            if (activeTabMode === 0) {
                if (writeBufferX === 0 && finalCharCode === 0x23) { 
                    isMarkdownHeading = true;
                    currentBytePtr = (currentBytePtr + 1) | 0;
                    continue; 
                }
                if (finalCharCode === 0x60) { 
                    isInlineCodeMode = !isInlineCodeMode;
                    currentBytePtr = (currentBytePtr + 1) | 0;
                    continue;
                }
            }

            if (activeTabMode === 0 && finalCharCode === 0x7C) {
                if (pipesInRowTracker > 1 && writeBufferX > 0) {
                    const targetX = _staticAbsoluteColumnXPositions[currentColumnIdx] | 0;
                    
                    while (writeBufferX < targetX && writeBufferX < 256) {
                        _staticRowLineByteBuffer[writeBufferX] = isRowDelimiter ? 0x2500 : 0x20;
                        _staticRowMetaStyleBuffer[writeBufferX] = isInlineCodeMode ? 4 : (isMarkdownHeading ? 2 : 0);
                        writeBufferX = (writeBufferX + 1) | 0;
                    }
                    currentColumnIdx = (currentColumnIdx + 1) & 7;
                }

                if (writeBufferX < 256) {
                    _staticRowLineByteBuffer[writeBufferX] = isRowDelimiter ? 0x253C : 0x2502;
                    _staticRowMetaStyleBuffer[writeBufferX] = 8; 
                    writeBufferX = (writeBufferX + 1) | 0;
                }

            } else {
                if (writeBufferX < 256) {
                    if (isRowDelimiter === true && (finalCharCode === 0x2D || finalCharCode === 0x3A)) {
                        finalCharCode = 0x2500; 
                    }
                    _staticRowLineByteBuffer[writeBufferX] = finalCharCode;
                    
                    let styleMask = isBoldMode ? 1 : 0;
                    if (isMarkdownHeading) styleMask |= 2;
                    if (isInlineCodeMode) styleMask |= 4;
                    _staticRowMetaStyleBuffer[writeBufferX] = styleMask;
                    
                    writeBufferX = (writeBufferX + 1) | 0;
                }
            }
            currentBytePtr = (currentBytePtr + 1) | 0;
        }

        let charCursorX = (sX + 2) | 0;
        for (let x = 0; x < writeBufferX; x = (x + 1) | 0) {
            if (canvasPtr >= totalCellsLimit || charCursorX >= rightMaxEdgeX) break;

            const code  = _staticRowLineByteBuffer[x];
            const style = _staticRowMetaStyleBuffer[x];

            let fg = 248; let bg = 0;

            if (style === 8) { 
                fg = 242; 
            } else {
                if ((style & 1) === 1) fg = 231; 
                if ((style & 2) === 2) fg = 220; 
                if ((style & 4) === 4) { fg = 208; bg = 236; } 
                if (pipesInRowTracker > 1 && (style & 6) === 0) fg = 252; 
            }

            canvas[canvasPtr++] = packCellBits(code, fg, bg);
            charCursorX = (charCursorX + 1) | 0;
        }
    }

    drawVerticalScrollbarInline(canvas, currentColsNum, sX, startContentY, sW, maxVisibleRows, scrollOffset, totalCells || 1, isFocused);
}

// 🔥 ИСПРАВЛЕНО: Инъекция блайтера строго по индексу Слота 110 константной dispatch-матрицы
_qnxComponentBlitDispatchTable[110] = drawSlotBufferContent;

// TIMESTAMP: 2026-09-27 18:52:00
// PATH: c:\slotcmp_5\V\src\views\viewer_view.js
