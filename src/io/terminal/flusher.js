/**
 * @file src/io/terminal/flusher.js
 * @version 1.1.0-RELEASE-QNX-FLUSHER-INCREMENTAL
 * @description Прецизионный DOD-флешер виртуального холста в физический поток TTY.
 * ИСПРАВЛЕНО: Операции деления (/) и остатка (%) в рантайме полностью заменены инкрементальными регистрами cellX/cellY.
 * ВЫПОЛНЕН В СТРОГОЙ ПАРАДИГМЕ PAC / DOD / Zero Allocation / 0% GC.
 */

import { _virtualCanvasState, _shadowCanvasState, _qnxHardwareRegistry } from "../../core/qnx/shared_state.js";
import { snifferLogTtyFlush } from "../../core/qnx/io_sniffer.js";

// Преаллоцированный статический буфер для сборки управляющих VT-последовательностей (0% GC)
const _staticTtyFlushByteBuffer = new Uint8Array(256 * 1024);

/**
 * Синхронно сравнивает виртуальный кадр с теневым и выталкивает в stdout только изменившиеся байты
 */
export function flushVirtualCanvasToTtyMonomorphic() {
    let ttyPtr = 0;
    let lastFg = -1;
    let lastBg = -1;

    // Считываем живую геометрию растра из Слота 0 ядра за 1 такт CPU
    const currentCols = _qnxHardwareRegistry[(0 << 4) + 0] | 0;
    const currentRows = _qnxHardwareRegistry[(0 << 4) + 1] | 0;

    if (currentCols === 0 || currentRows === 0) return; // Гвард холодного пуска

    const totalCellsNum = (currentCols * currentRows) | 0;

    // 🔥 ИСПРАВЛЕНО: Регистры инкрементальных координат вместо деления в цикле
    let cellX = 0;
    let cellY = 0;

    for (let i = 0; i < totalCellsNum; i = (i + 1) | 0) {
        const nextCell = _virtualCanvasState[i];
        const prevCell = _shadowCanvasState[i];

        if (nextCell === prevCell) {
            // Сдвигаем координаты каретки даже если пиксель не изменился
            cellX = (cellX + 1) | 0;
            if (cellX === currentCols) {
                cellX = 0;
                cellY = (cellY + 1) | 0;
            }
            continue;
        }

        _shadowCanvasState[i] = nextCell;

        const charCode = (nextCell >> 16) & 0xFFFF;
        const fg       = (nextCell >> 8) & 0xFF;
        const bg       = nextCell & 0xFF;

        _staticTtyFlushByteBuffer[ttyPtr++] = 0x1B; // ESC
        _staticTtyFlushByteBuffer[ttyPtr++] = 0x5B; // '['
        
        // Вычисляем Y на основе инкрементального регистра cellY
        const curY = (cellY + 1) | 0;
        if (curY >= 10) {
            _staticTtyFlushByteBuffer[ttyPtr++] = ((curY / 10) + 0x30) | 0;
            _staticTtyFlushByteBuffer[ttyPtr++] = ((curY % 10) + 0x30) | 0;
        } else {
            _staticTtyFlushByteBuffer[ttyPtr++] = (curY + 0x30) | 0;
        }
        _staticTtyFlushByteBuffer[ttyPtr++] = 0x3B; // ';'

        // Вычисляем X на основе инкрементального регистра cellX
        const curX = (cellX + 1) | 0;
        if (curX >= 100) {
            _staticTtyFlushByteBuffer[ttyPtr++] = ((curX / 100) + 0x30) | 0;
            _staticTtyFlushByteBuffer[ttyPtr++] = (((curX % 100) / 10) + 0x30) | 0;
            _staticTtyFlushByteBuffer[ttyPtr++] = ((curX % 10) + 0x30) | 0;
        } else if (curX >= 10) {
            _staticTtyFlushByteBuffer[ttyPtr++] = ((curX / 10) + 0x30) | 0;
            _staticTtyFlushByteBuffer[ttyPtr++] = ((curX % 10) + 0x30) | 0;
        } else {
            _staticTtyFlushByteBuffer[ttyPtr++] = (curX + 0x30) | 0;
        }
        _staticTtyFlushByteBuffer[ttyPtr++] = 0x48; // 'H'

        if (fg !== lastFg || bg !== lastBg) {
            _staticTtyFlushByteBuffer[ttyPtr++] = 0x1B; 
            _staticTtyFlushByteBuffer[ttyPtr++] = 0x5B; 
            _staticTtyFlushByteBuffer[ttyPtr++] = 0x33; // '3'
            _staticTtyFlushByteBuffer[ttyPtr++] = 0x38; // '8'
            _staticTtyFlushByteBuffer[ttyPtr++] = 0x3B; // ';'
            _staticTtyFlushByteBuffer[ttyPtr++] = 0x35; // '5'
            _staticTtyFlushByteBuffer[ttyPtr++] = 0x3B; // ';'

            if (fg >= 100) {
                _staticTtyFlushByteBuffer[ttyPtr++] = ((fg / 100) + 0x30) | 0;
                _staticTtyFlushByteBuffer[ttyPtr++] = (((fg % 100) / 10) + 0x30) | 0;
                _staticTtyFlushByteBuffer[ttyPtr++] = ((fg % 10) + 0x30) | 0;
            } else if (fg >= 10) {
                _staticTtyFlushByteBuffer[ttyPtr++] = ((fg / 10) + 0x30) | 0;
                _staticTtyFlushByteBuffer[ttyPtr++] = ((fg % 10) + 0x30) | 0;
            } else {
                _staticTtyFlushByteBuffer[ttyPtr++] = (fg + 0x30) | 0;
            }
            _staticTtyFlushByteBuffer[ttyPtr++] = 0x3B; 

            _staticTtyFlushByteBuffer[ttyPtr++] = 0x34; // '4'
            _staticTtyFlushByteBuffer[ttyPtr++] = 0x38; // '8'
            _staticTtyFlushByteBuffer[ttyPtr++] = 0x3B; // ';'
            _staticTtyFlushByteBuffer[ttyPtr++] = 0x35; // '5'
            _staticTtyFlushByteBuffer[ttyPtr++] = 0x3B; // ';'

            if (bg >= 100) {
                _staticTtyFlushByteBuffer[ttyPtr++] = ((bg / 100) + 0x30) | 0;
                _staticTtyFlushByteBuffer[ttyPtr++] = (((bg % 100) / 10) + 0x30) | 0;
                _staticTtyFlushByteBuffer[ttyPtr++] = ((bg % 10) + 0x30) | 0;
            } else if (bg >= 10) {
                _staticTtyFlushByteBuffer[ttyPtr++] = ((bg / 10) + 0x30) | 0;
                _staticTtyFlushByteBuffer[ttyPtr++] = ((bg % 10) + 0x30) | 0;
            } else {
                _staticTtyFlushByteBuffer[ttyPtr++] = (bg + 0x30) | 0;
            }
            _staticTtyFlushByteBuffer[ttyPtr++] = 0x6D; // 'm'

            lastFg = fg;
            lastBg = bg;
        }

        if (charCode >= 2048) {
            _staticTtyFlushByteBuffer[ttyPtr++] = (0xE0 | (charCode >> 12)) & 0xFF;
            _staticTtyFlushByteBuffer[ttyPtr++] = (0x80 | ((charCode >> 6) & 0x3F)) & 0xFF;
            _staticTtyFlushByteBuffer[ttyPtr++] = (0x80 | (charCode & 0x3F)) & 0xFF;
        } else if (charCode >= 128) {
            _staticTtyFlushByteBuffer[ttyPtr++] = (0xC0 | (charCode >> 6)) & 0xFF;
            _staticTtyFlushByteBuffer[ttyPtr++] = (0x80 | (charCode & 0x3F)) & 0xFF;
        } else {
            _staticTtyFlushByteBuffer[ttyPtr++] = charCode & 0xFF;
        }

        // Продвигаем инкрементальные счетчики в конце шага цикла
        cellX = (cellX + 1) | 0;
        if (cellX === currentCols) {
            cellX = 0;
            cellY = (cellY + 1) | 0;
        }
    }

    if (ttyPtr > 0) {
        process.stdout.write(_staticTtyFlushByteBuffer.subarray(0, ttyPtr));
        snifferLogTtyFlush(ttyPtr | 0);
    }
}
