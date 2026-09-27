/**
 * @file src/core/qnx/kbd_driver.js
 * @version 1.3.3-RELEASE-QNX-ALT-ISR-FIXED
 * @description Драйвер TTY-ввода с потоковым сбросом SGR-регистров автомата мыши.
 * ИСПРАВЛЕНО: Ликвидировано проглатывание двухбайтовых ALT-последовательностей (ESC + цифра).
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% ООП, 100% плоская память.
 */

import pathNode from "node:path";
import { 
    _qnxHardwareRegistry, REG_FOCUS, REG_SELECTED_IDX, REG_TOTAL_ITEMS, REG_ACTIVE_TAB, REG_SCROLL_OFF
} from "./shared_state.js";
import { msg_send_qnx } from "./ipc_bus.js";
import { ix } from "./intents_spec.js";
import { processHardwareMouseQuantum } from "./mouse_driver.js";
import { performSynchronousVfsInject } from "./vfs_initializer.js";
import { dispatchHardwareKeyStep } from "./key_dispatcher.js";

let _lastLoggedMouseX = -1;
let _lastLoggedMouseY = -1;
let sgrState = 0;
let mBtn = 0;
let mX = 0;
let mY = 0;
let mParamIdx = 0;

export function restoreStandardHardwareBuffers() {
    if (process.stderr) {
        process.stderr.write("\x1b[?1000l\x1b[?1006l\x1b[?1049l\x1b[?25h\x1b[0m\n");
    }
}

export function processHardwareKeyboardStream(buf) {
    const len = buf.length | 0;
    const flatVfsBuffer = globalThis._qnxActiveVfsSharedBufferBypass;
    
    for (let i = 0; i < len; i = (i + 1) | 0) {
        const b = buf[i] | 0;

        if (b === 0x03) {
            restoreStandardHardwareBuffers();
            process.exit(0);
        }

        // ENTER НАВИГАЦИЯ (0x0D)
        if (sgrState === 0 && b === 0x0D) {
            let activeSlotIdNum = 102;
            if (_qnxHardwareRegistry[(102 << 4) + REG_FOCUS] === 1) activeSlotIdNum = 102;
            else if (_qnxHardwareRegistry[(103 << 4) + REG_FOCUS] === 1) activeSlotIdNum = 103;

            const offset = activeSlotIdNum << 4;
            const currentSelectedRow = _qnxHardwareRegistry[offset + REG_SELECTED_IDX] | 0;

            const slotMemoryBaseOffset = (activeSlotIdNum === 102) ? 0 : 32000;
            const fileFrameOffset = (slotMemoryBaseOffset + (currentSelectedRow * 64)) | 0;
            const isDir = (flatVfsBuffer[fileFrameOffset] === 1);

            if (isDir === true) {
                let folderNameStr = "";
                for (let c = 0; c < 60; c = (c + 1) | 0) {
                    const charCode = flatVfsBuffer[fileFrameOffset + 1 + c] | 0;
                    if (charCode === 0x00 || charCode === 0x20) break;
                    folderNameStr += String.fromCharCode(charCode);
                }

                const activeTabIdx = _qnxHardwareRegistry[offset + REG_ACTIVE_TAB] | 0;
                const cacheKeyStr = `${activeSlotIdNum}_${activeTabIdx}`;
                const currentDirectoryPath = globalThis._qnxVfsPathMap[cacheKeyStr] || "./";

                let nextResolvedPath = "";
                if (folderNameStr === "..") {
                    nextResolvedPath = pathNode.dirname(currentDirectoryPath);
                } else {
                    nextResolvedPath = pathNode.resolve(currentDirectoryPath, folderNameStr);
                }

                globalThis._qnxVfsPathMap[cacheKeyStr] = nextResolvedPath;
                performSynchronousVfsInject(activeSlotIdNum, nextResolvedPath);

                _qnxHardwareRegistry[offset + REG_SELECTED_IDX] = 0;
                _qnxHardwareRegistry[offset + REG_SCROLL_OFF] = 0;

                msg_send_qnx(1, 4, ix.SYS_RENDER, 0);
            }
            continue;
        }

        // ДЕКОДЕР МЫШИ SGR (\x1b[<)
        if (sgrState === 0 && b === 0x1B && (i + 2) < len && buf[i + 1] === 0x5B && buf[i + 2] === 0x3C) {
            sgrState = 1; 
            mParamIdx = 0; 
            mBtn = 0;  
            mX = 0; 
            mY = 0;
            i = (i + 2) | 0; 
            continue;
        }

        if (sgrState === 1) {
            if (b === 0x3B) { 
                mParamIdx = (mParamIdx + 1) | 0; 
                continue; 
            }
            if (b >= 0x30 && b <= 0x39) {
                const digit = (b - 0x30) | 0;
                if (mParamIdx === 0)      mBtn = ((mBtn * 10) + digit) | 0;
                else if (mParamIdx === 1) mX   = ((mX * 10) + digit) | 0;
                else if (mParamIdx === 2) mY   = ((mY * 10) + digit) | 0;
                continue;
            }
            if (b === 0x4D || b === 0x6D) {
                const isReleaseBit = (b === 0x6D) ? 1 : 0;
                sgrState = 0;

                const curX = (mX - 1) | 0;
                const curY = (mY - 1) | 0;

                if (mBtn < 64) {
                    if (curX === _lastLoggedMouseX && curY === _lastLoggedMouseY && isReleaseBit === 0) {
                        continue;
                    }
                    _lastLoggedMouseX = curX;
                    _lastLoggedMouseY = curY;
                }

                processHardwareMouseQuantum(curX, curY, mBtn | 0, isReleaseBit | 0);
                continue;
            }
        }

        // 🔥 ИСПРАВЛЕНО: Безопасный разбор прерываний клавиатуры без склеивания буфера
        if (sgrState === 0 && b === 0x1B) {
            // Если в буфере больше ничего нет — это одиночный ESC, игнорируем
            if ((i + 1) >= len) continue;
            
            const nextByte = buf[i + 1] | 0;

            // Вариант А: Стандартный VT-пакет стрелок (ESC [ A) — требует 3 байта
            if (nextByte === 0x5B && (i + 2) < len) {
                dispatchHardwareKeyStep(b, nextByte, buf[i + 2] | 0);
                i = (i + 2) | 0;
                continue;
            } 
            
            // Вариант Б: Прецизионная обработка ALT + [0-9] (ESC + цифра) — требует ВСЕГО 2 байта!
            if (nextByte >= 0x30 && nextByte <= 0x39) {
                dispatchHardwareKeyStep(b, nextByte, 0); // Передаем byte3 = 0, так как его нет
                i = (i + 1) | 0; // Сдвигаем каретку на 1 шаг вперед
                continue;
            }
        }
    }
}
