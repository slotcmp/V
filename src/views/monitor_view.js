/**
 * @file src/views/monitor_view.js
 * @version 4.0.0-RELEASE-QNX-MONITOR-PURE-DOD
 * @description Пассивный процедурный отрисовщик шкал CPU/RAM Дашборда.
 * ИСПРАВЛЕНО: Чтение данных переведено на плоские регистры ОЗУ ядра (+11 и +12) вместо mdlState.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% объектов в рантайме кучи V8, 100% Zero Allocation.
 */

import { packCellBits } from "../core/qnx/shared_state.js";
import { _qnxHardwareRegistry } from "../core/qnx/shared_state.js";

// Статические преаллоцированные ASCII-массивы заголовков шкал (0% GC кучи)
const _CPU_LABEL = new Uint8Array([0x20, 0x20, 0x43, 0x50, 0x55, 0x20, 0x4C, 0x4F, 0x41, 0x44, 0x49, 0x4E, 0x47, 0x3A, 0x20, 0x5B]); // "  CPU LOADING: ["
const _RAM_LABEL = new Uint8Array([0x20, 0x20, 0x52, 0x41, 0x4D, 0x20, 0x43, 0x4F, 0x4E, 0x53, 0x55, 0x4D, 0x45, 0x3A, 0x20, 0x5B]); // "  RAM CONSUME: ["

export function renderMonitorContent(canvas, currentCols, sX, startContentY, sW, sH) {
    if (!canvas || (sH | 0) < 3) return;
    const canvasLimit = canvas.length | 0;
    const o101 = 101 << 4;

    // 🔥 ИСПРАВЛЕНО: Считываем живые значения из выделенных регистров ОЗУ ядра вместо mdlState
    const cpu = Math.max(0, Math.min(100, _qnxHardwareRegistry[o101 + 11] | 0));
    const ram = Math.max(0, Math.min(100, _qnxHardwareRegistry[o101 + 12] | 0));

    // =================================================================
    // 1. СТРОКА CPU (Смещена на Y = startContentY + 1)
    // =================================================================
    const cpuRowGlobalY = (startContentY + 1) | 0;
    let cpuPtr = (cpuRowGlobalY * currentCols + sX + 1) | 0;

    // Накат заголовка CPU
    for (let i = 0; i < _CPU_LABEL.length; i = (i + 1) | 0) {
        if (cpuPtr < canvasLimit) canvas[cpuPtr++] = packCellBits(_CPU_LABEL[i], 255, 0);
    }

    // Рендерим число процентов CPU
    if ((cpuPtr + 5) < canvasLimit) {
        canvas[cpuPtr++] = packCellBits(0x30 + (Math.floor(cpu / 100) % 10), 220, 0);
        canvas[cpuPtr++] = packCellBits(0x30 + (Math.floor(cpu / 10) % 10), 220, 0);
        canvas[cpuPtr++] = packCellBits(0x30 + (cpu % 10), 220, 0);
        canvas[cpuPtr++] = packCellBits(0x25, 255, 0); // '%'
        canvas[cpuPtr++] = packCellBits(0x5D, 255, 0); // ']'
        canvas[cpuPtr++] = packCellBits(0x20, 255, 0); // ' '
    }

    // Расчет и накат прогресс-бара CPU
    let cpuScalePtr = (cpuRowGlobalY * currentCols + sX + 24) | 0;
    const cpuScaleWidth = Math.max(10, (sW - 26) | 0); 
    const cpuFilledChars = Math.floor((cpuScaleWidth * cpu) / 100) | 0;

    for (let x = 0; x < cpuScaleWidth; x = (x + 1) | 0) {
        if (cpuScalePtr < canvasLimit) {
            const isFilled = (x < cpuFilledChars);
            canvas[cpuScalePtr++] = packCellBits(isFilled ? 0x2588 : 0x2591, isFilled ? 46 : 236, 0); 
        }
    }

    // =================================================================
    // 2. СТРОКА RAM (Смещена на Y = startContentY + 2)
    // =================================================================
    const ramRowGlobalY = (startContentY + 2) | 0;
    let ramPtr = (ramRowGlobalY * currentCols + sX + 1) | 0;

    // Накат заголовка RAM
    for (let i = 0; i < _RAM_LABEL.length; i = (i + 1) | 0) {
        if (ramPtr < canvasLimit) canvas[ramPtr++] = packCellBits(_RAM_LABEL[i], 255, 0);
    }

    // Рендерим число процентов RAM
    if ((ramPtr + 5) < canvasLimit) {
        canvas[ramPtr++] = packCellBits(0x30 + (Math.floor(ram / 100) % 10), 220, 0);
        canvas[ramPtr++] = packCellBits(0x30 + (Math.floor(ram / 10) % 10), 220, 0);
        canvas[ramPtr++] = packCellBits(0x30 + (ram % 10), 220, 0);
        canvas[ramPtr++] = packCellBits(0x25, 255, 0); // '%'
        canvas[ramPtr++] = packCellBits(0x5D, 255, 0); // ']'
        canvas[ramPtr++] = packCellBits(0x20, 255, 0); // ' '
    }

    // Расчет и накат прогресс-бара RAM
    let ramScalePtr = (ramRowGlobalY * currentCols + sX + 24) | 0;
    const ramScaleWidth = Math.max(10, (sW - 26) | 0);
    const ramFilledChars = Math.floor((ramScaleWidth * ram) / 100) | 0;

    for (let x = 0; x < ramScaleWidth; x = (x + 1) | 0) {
        if (ramScalePtr < canvasLimit) {
            const isFilled = (x < ramFilledChars);
            canvas[ramScalePtr++] = packCellBits(isFilled ? 0x2588 : 0x2591, isFilled ? 51 : 236, 0); 
        }
    }
}
