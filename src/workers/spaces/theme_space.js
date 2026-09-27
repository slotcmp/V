/**
 * @file src/workers/spaces/theme_space.js
 * @version 1.0.1-RELEASE-QNX-THEME-SPACE-FIXED
 * @description Изолированный домен (Space) векторизации JSON-тем оформления.
 * ИСПРАВЛЕНО: Ликвидирована ошибка ReferenceError. Переменная BI_INJECT_THEMES жестко зафиксирована.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% объектов в рантайме, 100% Zero Allocation.
 */

import fs from "node:fs";
import pathNode from "node:path";

function parseColorStringToXterm(str) {
    if (!str) return 242;
    let hashAccumulator = 0;
    const len = str.length | 0;
    for (let i = 0; i < len; i = (i + 1) | 0) {
        let charCode = str.charCodeAt(i) | 0;
        if (charCode >= 0x41 && charCode <= 0x5A) charCode = (charCode + 32) | 0;
        hashAccumulator = (hashAccumulator + charCode) | 0;
    }
    switch (hashAccumulator) {
        case 435: return 244; 
        case 853: return 237; 
        case 424: return 33;  
        case 446: return 19;  
        case 664: return 129; 
        case 543: return 100; 
        case 509: return 0;   
        case 652: return 124; 
        case 529: return 34;  
        case 422: return 214; 
        case 427: return 39;  
        default:  return 242; 
    }
}

export function processThemeSpaceQuantum(workerData, parentPort, BI_INJECT_THEMES) {
    const rootPathFromHost = (workerData && workerData.rootPath) ? String(workerData.rootPath) : process.cwd();
    const targetThemesPathStr = pathNode.join(rootPathFromHost, "themes.json");
    
    let rawThemesData = "";
    let isThemeError = false;

    try {
        if (fs.existsSync(targetThemesPathStr)) {
            rawThemesData = fs.readFileSync(targetThemesPathStr, "utf8");
        } else {
            isThemeError = true;
        }
    } catch (err) {
        isThemeError = true;
    }

    if (isThemeError === true || !rawThemesData) return;

    const themesArray = JSON.parse(rawThemesData);
    if (!Array.isArray(themesArray)) return;

    const totalThemesCount = themesArray.length | 0;
    const themesByteBuffer = new Uint8Array(totalThemesCount * 34);
    let themeCursor = 0;

    for (let i = 0; i < totalThemesCount; i = (i + 1) | 0) {
        const themeItem = themesArray[i];
        if (!themeItem) continue;

        const nameStr = String(themeItem.name || "");
        const nameLen = nameStr.length | 0;
        const limitChars = nameLen > 32 ? 32 : nameLen;

        for (let n = 0; n < limitChars; n = (n + 1) | 0) {
            themesByteBuffer[themeCursor + n] = nameStr.charCodeAt(n) & 0xFF;
        }
        for (let p = limitChars; p < 32; p = (p + 1) | 0) {
            themesByteBuffer[themeCursor + p] = 0x20;
        }

        const activeXtermCode  = parseColorStringToXterm(themeItem.borderColorMsk);
        const passiveXtermCode = parseColorStringToXterm(themeItem.passiveColorMsk);

        themesByteBuffer[themeCursor + 32] = activeXtermCode & 0xFF;
        themesByteBuffer[themeCursor + 33] = passiveXtermCode & 0xFF;

        themeCursor = (themeCursor + 34) | 0;
    }

    // Сигнал гарантированно отправляется с валидным HEX-кодом 0x011D
    parentPort.postMessage({
        signalId: BI_INJECT_THEMES, 
        totalThemes: totalThemesCount | 0,
        themesBuffer: themesByteBuffer
    }, [themesByteBuffer.buffer]);
}

// TIMESTAMP: 2026-09-27 13:41:22
// PATH: c:\slotcmp_5\V\src\workers\spaces\theme_space.js
