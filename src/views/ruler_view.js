/**
 * @file src/views/ruler_view.js
 * @version 3.0.0-RELEASE-QNX-RULER-PURE-DOD
 * @description Суб-представление Дашборда Линейки. Прямая запись в плоский холст.
 * ИСПРАВЛЕНО: Извлечение твиннинг-каретки ▲ привязано к регистру ОЗУ ядра (+10).
 */

import { 
    _virtualCanvasState, 
    _shadowCanvasState, 
    _qnxHardwareRegistry, 
    REG_X, REG_Y, REG_W, REG_H, 
    REG_FOCUS, REG_ENABLED, REG_SCROLL_OFF, REG_SELECTED_IDX, REG_ACTIVE_TAB, REG_TOTAL_ITEMS,
    packCellBits // 🔥 ИСПРАВЛЕНО: Упаковщик битов теперь наливается отсюда
} from "../core/qnx/shared_state.js";

const _digitCharBuffer = new Uint8Array([0x20, 0x20, 0x20, 0x20]); 

export function renderRulerContent(canvas, currentCols, sX, startContentY, sW, sH) {
    if ((sH | 0) < 4) return;
    const canvasLimit = canvas.length | 0;

    // Вычисляем абсолютные индексы строк на глобальном растре холста
    const topRowGlobalY = (startContentY + 1) | 0;
    const midRowGlobalY = (startContentY + 2) | 0;
    const botRowGlobalY = (startContentY + 3) | 0;

    const limitW = (sX + sW - 2) | 0;

    // Цвета шкал: fg = серая сталь (239/242), тики = желтый (220)
    const packedLineBits  = packCellBits(0x2500, 239, 0); // '─'
    const packedCrossBits = packCellBits(0x253C, 242, 0); // '┼'
    const packedTickBits  = packCellBits(0x2534, 220, 0); // '┴'

    for (let x = (sX + 2) | 0; x < limitW; x = (x + 1) | 0) {
        const absX = (x - sX - 1) | 0;
        const remainderNum = absX % 10;

        const midPtr = (midRowGlobalY * currentCols + x) | 0;
        if (midPtr < canvasLimit) canvas[midPtr] = packedLineBits;

        if (absX % 5 === 0 && remainderNum !== 0) {
            if (midPtr < canvasLimit) canvas[midPtr] = packedCrossBits;
        }

        if (remainderNum === 0) {
            if (midPtr < canvasLimit) canvas[midPtr] = packedTickBits;

            let temp = absX | 0;
            const db = _digitCharBuffer;
            db[0] = 0x20; db[1] = 0x20; db[2] = 0x20; db[3] = 0x20;

            let charCount = 0;
            if (temp === 0) {
                db[0] = 0x30; charCount = 1;
            } else {
                if (temp >= 100)      charCount = 3;
                else if (temp >= 10)  charCount = 2;
                else                  charCount = 1;

                let idx = (charCount - 1) | 0;
                while (temp > 0 && idx >= 0) {
                    db[idx] = (0x30 + (temp % 10)) | 0;
                    temp = Math.floor(temp / 10) | 0;
                    idx = (idx - 1) | 0;
                }
            }

            const startX = (x - Math.floor(charCount / 2)) | 0;
            for (let charIdx = 0; charIdx < charCount; charIdx = (charIdx + 1) | 0) {
                const targetX = (startX + charIdx) | 0;
                if (targetX >= (sX + 2) && targetX < limitW) {
                    const topPtr = (topRowGlobalY * currentCols + targetX) | 0;
                    if (topPtr < canvasLimit) {
                        canvas[topPtr] = packCellBits(db[charIdx], 44, 0); // Бирюзовые цифры шкалы
                    }
                }
            }
        }
    }

    // =================================================================
    // ВЫЖИГ ТВИННИНГ-КАРЕТКИ ▲ (Регистр ОЗУ Слота 101 + 10)
    // =================================================================
    // Читаем вещественное значение интерполяции Пеннера напрямую из ячейки +10
    const floatTriangleX = _qnxHardwareRegistry[(101 << 4) + 10] || 5;
    const targetTriangleX = (sX + Math.round(floatTriangleX)) | 0;
    
    if (targetTriangleX >= (sX + 2) && targetTriangleX < limitW) {
        const botPtr = (botRowGlobalY * currentCols + targetTriangleX) | 0;
        if (botPtr < canvasLimit) {
            canvas[botPtr] = packCellBits(0x25B2, 196, 0); // Насыщенный красный ▲
        }
    }
}
