/**
 * @file src/views/viewer/table_geometry.js
 * @version 1.2.0-RELEASE-QNX-TRIPLE-PASS-GEOMETRY-STRICT
 * @description Пасс 1: Матричный анализатор и фиксатор абсолютных физических координат колонок.
 * ИСПРАВЛЕНО: Рассчитывает точные финишные X-координаты колонок в буфере для прецизионного паддинга.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% RegExp, 0% объектов, 100% Zero Allocation.
 */

// Плоский ОЗУ-реестр абсолютных финишных координат колонок на строку (Максимум 8 столбцов)
export const _staticAbsoluteColumnXPositions = new Int32Array(8);

/**
 * Синхронно сканирует байтовый буфер для вычисления максимальной ширины ячеек таблицы
 */
export function calculateMarkdownTableGeometry(buffer, startPtr, bufferLimit, maxVisibleRows, widthsRegistry) {
    widthsRegistry.fill(0); 

    let scanBytePtr = startPtr | 0;
    let scanLinesParsed = 0;

    while (scanBytePtr < bufferLimit && scanLinesParsed < maxVisibleRows) {
        let currentScanColIdx = 0;
        let scanCharCounter = 0;
        let scanUtf8State = 0;
        let hasPipes = false;

        let tPtr = scanBytePtr | 0;
        while (tPtr < bufferLimit) {
            const b = buffer[tPtr];
            if (b === 0x0A || b === 0x00) break;
            if (b === 0x7C) { hasPipes = true; break; }
            tPtr = (tPtr + 1) | 0;
        }

        while (scanBytePtr < bufferLimit) {
            const b = buffer[scanBytePtr];
            if (b === 0x0A || b === 0x00) {
                if (b === 0x0A) scanLinesParsed = (scanLinesParsed + 1) | 0;
                scanBytePtr = (scanBytePtr + 1) | 0;
                break;
            }

            if (hasPipes === true) {
                if (scanUtf8State === 0) {
                    if ((b & 0x80) === 0x00) {
                        if (b === 0x7C) { 
                            if (scanBytePtr > startPtr && buffer[scanBytePtr - 1] !== 0x0A) {
                                if (scanCharCounter > widthsRegistry[currentScanColIdx]) {
                                    widthsRegistry[currentScanColIdx] = scanCharCounter | 0;
                                }
                                currentScanColIdx = (currentScanColIdx + 1) & 7;
                            }
                            scanCharCounter = 0;
                        } else if (b === 0x2A && (scanBytePtr + 1) < bufferLimit && buffer[scanBytePtr + 1] === 0x2A) {
                            scanBytePtr = (scanBytePtr + 1) | 0; // Игнорируем маркеры '**'
                        } else if (b !== 0x2D && b !== 0x3A && b !== 0x20) {
                            scanCharCounter = (scanCharCounter + 1) | 0;
                        }
                    } else if ((b & 0xE0) === 0xC0) {
                        scanUtf8State = 1;
                    } else if ((b & 0xF0) === 0xE0) {
                        scanUtf8State = 2;
                    }
                } else if (scanUtf8State === 1) {
                    scanCharCounter = (scanCharCounter + 1) | 0;
                    scanUtf8State = 0;
                } else if (scanUtf8State === 2) {
                    scanUtf8State = 1;
                }
            }
            scanBytePtr = (scanBytePtr + 1) | 0;
        }
    }

    // ТРАНСФОРМАЦИЯ В АБСОЛЮТНЫЕ КООРДИНАТНЫЕ КОРИДОРЫ
    let accumulatedX = 0;
    for (let i = 0; i < 8; i = (i + 1) | 0) {
        let w = widthsRegistry[i] | 0;
        if (w < 10) w = 10;
        w = (w + 4) | 0; // Запас под пробельные отступы контента от рамы │
        
        accumulatedX = (accumulatedX + w) | 0;
        _staticAbsoluteColumnXPositions[i] = accumulatedX | 0;
    }
}

// TIMESTAMP: 2026-09-27 18:41:10
// PATH: c:\slotcmp_5\V\src\views\viewer\table_geometry.js
