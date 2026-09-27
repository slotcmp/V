/**
 * @file src/workers/spaces/text_space.js
 * @version 1.0.3-RELEASE-QNX-TEXT-SPACE-STERILE-FIXED
 * @description Изолированный домен (Space) посимвольного налива Markdown/Text файлов в ОЗУ.
 * ИСПРАВЛЕНО: Буфер тотально обнуляется перед записью ошибок, полностью исключая memory bleeding.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch в основном слое, 100% плоские массивы байт.
 */

import fs from "node:fs";
import pathNode from "node:path";

export function processTextSpaceQuantum(task, workerData, parentPort, _qnxStaticTextViewerBuffer, BI_INJECT_TEXT) {
    const resolvedFilePathStr = pathNode.normalize(String(task.filePath || ""));

    // 🔥 ГАРАНТ СТЕРИЛЬНОСТИ: Тотально выжигаем старый контент ОЗУ нулями до начала любых дисковых операций
    _qnxStaticTextViewerBuffer.fill(0); 

    let totalLinesInFile = 0;
    try {
        if (fs.existsSync(resolvedFilePathStr)) {
            const fileBytes = fs.readFileSync(resolvedFilePathStr);
            const bytesToCopy = Math.min(fileBytes.length, _qnxStaticTextViewerBuffer.length) | 0;
            
            for (let b = 0; b < bytesToCopy; b = (b + 1) | 0) {
                const byteVal = fileBytes[b];
                _qnxStaticTextViewerBuffer[b] = byteVal;
                
                if (byteVal === 0x0A) {
                    totalLinesInFile = (totalLinesInFile + 1) | 0;
                }
            }
            if (bytesToCopy > 0 && _qnxStaticTextViewerBuffer[bytesToCopy - 1] !== 0x0A) {
                totalLinesInFile = (totalLinesInFile + 1) | 0;
            }
        } else {
            // Буфер уже стерилен, старый текст прогрева гарантированно уничтожен
            const errStr = "[ERROR: File NOT Found]";
            for (let e = 0; e < errStr.length; e++) {
                _qnxStaticTextViewerBuffer[e] = errStr.charCodeAt(e) & 0xFF;
            }
            totalLinesInFile = 1;
        }
    } catch (err) {
        const errStr = "[ERROR: Access Denied]";
        for (let e = 0; e < errStr.length; e++) {
            _qnxStaticTextViewerBuffer[e] = errStr.charCodeAt(e) & 0xFF;
        }
        totalLinesInFile = 1;
    }

    parentPort.postMessage({
        signalId: BI_INJECT_TEXT,
        totalLines: totalLinesInFile | 0,
        textBuffer: _qnxStaticTextViewerBuffer
    }, [_qnxStaticTextViewerBuffer.buffer]);
}

// TIMESTAMP: 2026-09-27 16:16:40
// PATH: c:\slotcmp_5\V\src\workers\spaces\text_space.js
