/**
 * @file src/core/qnx/ipc_bus.js
 * @version 3.0.1-RELEASE-QNX-BUS-VIEWER-ROUTING-FIXED
 * @description Высокоскоростная FIFO-шина. Полностью размонолитизирована на изолированные кванты прерываний.
 * ИСПРАВЛЕНО: Ссылка регистрации 0x011E теперь корректно пробрасывает targetSlot в процессор инжекта контента.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% ООП, 100% плоская shared memory.
 */

import os from "node:os";
import { ix } from "./intents_spec.js";
import { blitDisplayFrameMonomorphic } from "../../io/terminal/tree_builder.js";
import { flushVirtualCanvasToTtyMonomorphic } from "../../io/terminal/flusher.js";
import { snifferLogBusIntent } from "./io_sniffer.js";
import { _qnxHardwareRegistry, REG_CORE_READY_MASK, CORE_BIT_RESIZE } from "./shared_state.js";

import { executeHardwareResizeStep } from "./intents/resize_processor.js";
import { executeHardwareFocusStep } from "./intents/focus_processor.js";
import { executeVfsInjectStep } from "./intents/vfs_inject_processor.js";
import { executeThemesInjectStep } from "./intents/themes_inject_processor.js";
import { executeViewerInjectStep } from "./intents/viewer_inject_processor.js";

const _ipcRingBuffer = new Int32Array(4096 * 2);
let _ipcHeadPtr = 0;
let _ipcTailPtr = 0;

let _isCanvasDirtyBool = false;

let _prevCpuIdle = 0;
let _prevCpuTotal = 0;
let _lastTelemetryTime = 0;

const _qnxBusIntentDispatchTable = [];

export function msg_send_qnx(targetSlot, originSlot, signalId, payload) {
    const sig = signalId & 0xFFFF;

    if (typeof signalId === "undefined" || signalId === null) {
        process.stderr.write(`\x1b[?1000l\x1b[?1006l\x1b[?1049l\x1b[?25h\x1b[0m\n`);
        process.stderr.write(`[KERNEL PANIC] Прорыв пустой транзакции! Слот ${originSlot} отправил undefined интент на Слот ${targetSlot}\n`);
        process.exit(1);
    }

    snifferLogBusIntent(targetSlot & 0xFF, originSlot & 0xFF, sig, payload | 0);

    if (sig < 0x00A2 || sig > 0x0303) {
        process.stderr.write(`\x1b[?1000l\x1b[?1006l\x1b[?1049l\x1b[?25h\x1b[0m\n`);
        process.stderr.write(`[KERNEL PANIC] Искажение шины! Слот ${originSlot} прислал невалидный интент: 0x${signalId.toString(16)}\n`);
        process.exit(1);
    }

    const nextTail = (_ipcTailPtr + 1) & 4095;
    if (nextTail === _ipcHeadPtr) return; 

    const idx = _ipcTailPtr << 1;
    _ipcRingBuffer[idx] = (targetSlot & 0xFF) | ((originSlot & 0xFF) << 8) | (sig << 16);
    _ipcRingBuffer[idx + 1] = payload | 0;

    _ipcTailPtr = nextTail;

    if (sig === 0x00B5 || sig === 0x011A || sig === 0x00A2 || sig === 0x011C || sig === 0x011D || sig === 0x011E) {
        _isCanvasDirtyBool = true;
    }
}

export function dispatchHardwareClockPulse() {
    const now = Date.now();
    
    if ((now - _lastTelemetryTime) >= 1000) {
        _lastTelemetryTime = now;
        const o101 = 101 << 4;

        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        if (totalMem > 0) {
            _qnxHardwareRegistry[o101 + 12] = Math.floor(((totalMem - freeMem) * 100) / totalMem) | 0;
        }

        const cpus = os.cpus() || [];
        let currentIdle = 0;
        let currentTotal = 0;
        
        for (let i = 0; i < cpus.length; i = (i + 1) | 0) {
            const t = cpus[i].times;
            currentIdle = (currentIdle + t.idle) | 0;
            currentTotal = (currentTotal + t.user + t.nice + t.sys + t.idle + t.irq) | 0;
        }
        
        const deltaIdle = (currentIdle - _prevCpuIdle) | 0;
        const deltaTotal = (currentTotal - _prevCpuTotal) | 0;
        _prevCpuIdle = currentIdle; 
        _prevCpuTotal = currentTotal;

        if (deltaTotal > 0) {
            const cpuPercent = (100 - Math.floor((deltaIdle * 100) / deltaTotal)) | 0;
            _qnxHardwareRegistry[o101 + 11] = Math.max(0, Math.min(100, cpuPercent)) | 0;
            
            if ((_qnxHardwareRegistry[o101 + 5] | 0) === 1) {
                _isCanvasDirtyBool = true;
            }
        }
    }

    if (_isCanvasDirtyBool === true) {
        _isCanvasDirtyBool = false; 
        blitDisplayFrameMonomorphic();
        flushVirtualCanvasToTtyMonomorphic();
    }
}

export function executeKernelReactiveTick() {
    const coreReadyOffset = (0 << 4) + REG_CORE_READY_MASK;

    while (_ipcHeadPtr !== _ipcTailPtr) {
        const idx = _ipcHeadPtr << 1;
        const header = _ipcRingBuffer[idx];
        const payload = _ipcRingBuffer[idx + 1];

        const signalId   = (header >> 16) & 0xFFFF;
        const targetSlot = header & 0xFF;

        if (_ipcHeadPtr > 4095) {
            process.stderr.write(`\x1b[?1000l\x1b[?1006l\x1b[?1049l\x1b[?25h\x1b[0m\n`);
            process.stderr.write(`[KERNEL PANIC] Разрушение адресной каретки шины! HeadPtr: ${_ipcHeadPtr}\n`);
            process.exit(1);
        }

        const intentProcessorFn = _qnxBusIntentDispatchTable[signalId];

        if (intentProcessorFn) {
            // Передаем сквозной targetSlot третьим аргументом для динамического роутинга
            intentProcessorFn(payload, coreReadyOffset, targetSlot);
            _isCanvasDirtyBool = true;
        } else {
            if (signalId === ix.SYS_RESIZE) {
                executeHardwareResizeStep(payload);
                _qnxHardwareRegistry[coreReadyOffset] |= CORE_BIT_RESIZE;
                _isCanvasDirtyBool = true;
            } else if (signalId === ix.STACK_SET) {
                executeHardwareFocusStep(targetSlot, payload);
                _isCanvasDirtyBool = true;
            }
        }

        _ipcHeadPtr = (_ipcHeadPtr + 1) & 4095;
    }
}

_qnxBusIntentDispatchTable[0x011C] = (payload, coreReadyOffset) => executeVfsInjectStep(payload, coreReadyOffset);
_qnxBusIntentDispatchTable[0x011D] = (payload, coreReadyOffset) => executeThemesInjectStep(payload, coreReadyOffset);
// 🔥 ИСПРАВЛЕНО: Сквозной проброс targetSlot в квант вьюера
_qnxBusIntentDispatchTable[0x011E] = (payload, coreReadyOffset, targetSlot) => executeViewerInjectStep(payload, coreReadyOffset, targetSlot);

Object.freeze(_qnxBusIntentDispatchTable);
Object.preventExtensions(_ipcRingBuffer);
