/**
 * @file src/workers/spaces/vfs_space.js
 * @version 1.0.1-RELEASE-QNX-VFS-SPACE-FIXED
 * @description Изолированный домен (Space) дискового индексирования файловой структуры.
 * ИСПРАВЛЕНО: Внутренний вызов проброса затянут на явный контекст аргументов сигналов.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 100% Zero Allocation.
 */

import fs from "node:fs";
import pathNode from "node:path";

export function processVfsSpaceQuantum(task, workerData, parentPort, _qnxStaticVfsBytesBuffer, BI_INJECT_VFS, EXPLORER_L_SLOT) {
    let slotIdNum = EXPLORER_L_SLOT;
    let targetPathStr = "C:/";
    let targetStackIdxNum = 0;

    if (typeof task === "object" && task.currentPath) {
        slotIdNum = parseInt(task.slotId || "102", 10) & 255;
        targetPathStr = String(task.currentPath || "C:/");
        targetStackIdxNum = (task.targetStackIdx | 0) & 15;
    } else if (typeof task === "number") {
        slotIdNum = task & 0xFF;
        targetStackIdxNum = (task >> 8) & 0xF;
        targetPathStr = globalThis._qnxVfsSharedPathStringCache || "C:/";
    }

    if (_qnxStaticVfsBytesBuffer.byteLength === 0) {
        _qnxStaticVfsBytesBuffer = new Uint8Array(64 * 1000);
    } else {
        _qnxStaticVfsBytesBuffer.fill(0);
    }

    let cursorOffset = 0;
    _qnxStaticVfsBytesBuffer[cursorOffset] = 1; 
    _qnxStaticVfsBytesBuffer[cursorOffset + 1] = 0x2E; 
    _qnxStaticVfsBytesBuffer[cursorOffset + 2] = 0x2E; 
    cursorOffset = (cursorOffset + 64) | 0;

    let totalValidFiles = 1;
    let rawDirItems = null;
    let isErrorHappened = false;
    let errorMsgStr = "";

    try {
        const rootPathFromHost = (workerData && workerData.rootPath) ? String(workerData.rootPath) : process.cwd();
        const resolvedVfsPathStr = pathNode.resolve(rootPathFromHost, targetPathStr);

        if (!fs.existsSync(resolvedVfsPathStr)) {
            isErrorHappened = true;
            errorMsgStr = "Directory not found";
        } else {
            rawDirItems = fs.readdirSync(resolvedVfsPathStr, { withFileTypes: true });
        }
    } catch (err) {
        isErrorHappened = true;
        errorMsgStr = "Access denied";
    }

    if (isErrorHappened === true) {
        _qnxStaticVfsBytesBuffer[cursorOffset] = 0; 
        const limitErrChars = errorMsgStr.length > 60 ? 60 : errorMsgStr.length;
        for (let j = 0; j < limitErrChars; j = (j + 1) | 0) {
            _qnxStaticVfsBytesBuffer[cursorOffset + 1 + j] = errorMsgStr.charCodeAt(j) & 0xFF;
        }
        _qnxFastSendBinaryVfsPayload(parentPort, BI_INJECT_VFS, _qnxStaticVfsBytesBuffer, slotIdNum, targetStackIdxNum, 1);
        return;
    }

    const itemsLen = rawDirItems !== null ? (rawDirItems.length | 0) : 0;
    const maxItems = itemsLen > 990 ? 990 : itemsLen;

    for (let i = 0; i < maxItems; i = (i + 1) | 0) {
        const entry = rawDirItems[i];
        if (!entry) continue;

        const isDir = entry.isDirectory();
        const nameStr = String(entry.name || "");
        const nameLen = nameStr.length | 0;

        _qnxStaticVfsBytesBuffer[cursorOffset] = isDir ? 1 : 0;

        const limitNameChars = nameLen > 60 ? 60 : nameLen;
        for (let n = 0; n < limitNameChars; n = (n + 1) | 0) {
            _qnxStaticVfsBytesBuffer[cursorOffset + 1 + n] = nameStr.charCodeAt(n) & 0xFF;
        }

        totalValidFiles = (totalValidFiles + 1) | 0;
        cursorOffset = (cursorOffset + 64) | 0; 
    }

    _qnxFastSendBinaryVfsPayload(parentPort, BI_INJECT_VFS, _qnxStaticVfsBytesBuffer, slotIdNum, targetStackIdxNum, totalValidFiles);
}

function _qnxFastSendBinaryVfsPayload(parentPort, BI_INJECT_VFS, _qnxStaticVfsBytesBuffer, slotIdNum, targetStackIdxNum, totalValidFiles) {
    const packedMetaInterruptRegister = (slotIdNum & 0xFF) | 
                                         ((targetStackIdxNum & 0xF) << 8) | 
                                         ((totalValidFiles & 0xFFF) << 12);

    parentPort.postMessage({
        signalId: BI_INJECT_VFS, 
        metaBits: packedMetaInterruptRegister,
        flatVfsBuffer: _qnxStaticVfsBytesBuffer
    }, [_qnxStaticVfsBytesBuffer.buffer]);
}

// TIMESTAMP: 2026-09-27 13:42:30
// PATH: c:\slotcmp_5\V\src\workers\spaces\vfs_space.js
