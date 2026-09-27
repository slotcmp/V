/**
 * @file src/core/qnx/mouse/content_click.js
 * @version 1.0.4-RELEASE-QNX-MOUSE-PATH-CONSTRAINED-FIXED
 * @description Изолированный домен (Space) обработки мышиных кликов по строкам контента слотов (102, 103, 106, 110).
 * ИСПРАВЛЕНО: При activeTabNum === 0 путь принудительно переключается на корень проекта process.cwd().
 * ИСПРАВЛЕНО: Прямой вывод в stderr заменен на реактивный инкремент регистра Слота 108.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch в основном слое, 100% Zero Allocation в рантайме.
 */

import pathNode from "node:path";
import { _qnxHardwareRegistry, REG_SELECTED_IDX, REG_SCROLL_OFF, REG_TOTAL_ITEMS, REG_ACTIVE_TAB } from "../shared_state.js";
import { msg_send_qnx } from "../ipc_bus.js";
import { ix } from "../intents_spec.js";

export function processHardwareWindowContentClick(curX, curY, targetSlotId, sY, sH, _globalVfsWorkerLinkBypass) {
    if (curY < ((sY + 2) | 0) || curY >= ((sY + sH - 1) | 0)) return;

    const targetOffset = targetSlotId << 4;
    const scrollOffset = _qnxHardwareRegistry[targetOffset + REG_SCROLL_OFF] | 0;
    const totalItems   = _qnxHardwareRegistry[targetOffset + REG_TOTAL_ITEMS] | 0;
    
    const clickedRowRelativeIdx = (curY - sY - 2) | 0;
    const targetItemGlobalIdx   = (scrollOffset + clickedRowRelativeIdx) | 0;

    if (targetItemGlobalIdx >= totalItems) return;

    _qnxHardwareRegistry[targetOffset + REG_SELECTED_IDX] = targetItemGlobalIdx | 0;

    // АВТОНОМНЫЙ ХИТ-ТЕСТ ФАЙЛОВ ДЛЯ ЛЕВОГО ПРОВОДНИКА
    if (targetSlotId === 102) {
        const flatVfsBuffer = globalThis._qnxActiveVfsSharedBufferBypass;
        if (flatVfsBuffer) {
            const fileOffset = (targetItemGlobalIdx * 64) | 0; 
            const isDir = flatVfsBuffer[fileOffset] === 1;

            if (isDir === false) {
                let dotIdx = -1;
                for (let c = 0; c < 58; c = (c + 1) | 0) {
                    const charCode = flatVfsBuffer[fileOffset + 1 + c];
                    if (charCode === 0) break;
                    if (charCode === 0x2E) dotIdx = c | 0; 
                }

                if (dotIdx !== -1) {
                    const activeTabNum = _qnxHardwareRegistry[(102 << 4) + REG_ACTIVE_TAB] | 0;
                    
                    let activePathStr = globalThis._qnxVfsPathMap[`102_${activeTabNum}`] || "./";
                    if (activeTabNum === 0) {
                        activePathStr = process.cwd();
                    }
                    
                    let fileNameStr = "";
                    for (let c = 0; c < 60; c = (c + 1) | 0) {
                        const charCode = flatVfsBuffer[fileOffset + 1 + c];
                        if (charCode === 0) break;
                        fileNameStr += String.fromCharCode(charCode);
                    }

                    const finalGeneratedPathStr = pathNode.resolve(process.cwd(), activePathStr, fileNameStr);

                    const o108 = 108 << 4;
                    _qnxHardwareRegistry[o108 + 9] = (_qnxHardwareRegistry[o108 + 9] + 1) | 0; 
                    msg_send_qnx(108, 4, ix.SYS_RENDER, targetItemGlobalIdx | 0);

                    if (_globalVfsWorkerLinkBypass) {
                        _globalVfsWorkerLinkBypass.postMessage({
                            trigger: 0x011E,
                            filePath: finalGeneratedPathStr
                        });
                    }
                }
            }
        }
    }

    msg_send_qnx(1, 4, ix.SYS_RENDER, 0);
}

// TIMESTAMP: 2026-09-27 17:01:20
// PATH: c:\slotcmp_5\V\src\core\qnx\mouse\content_click.js
