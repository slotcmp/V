/**
 * @file src/views/z4_bars_layer.js
 * @version 1.0.9-RELEASE-QNX-Z4-CLEAN-LOGGER
 * @description DOD-процедура блайтинга безрамочных линеек и объемного каркаса логгера 108.
 * ИСПРАВЛЕНО: Информационная строка вынесена из тела логгера согласно спецификации.
 */

import { 
    _virtualCanvasState, 
    _shadowCanvasState, 
    _qnxHardwareRegistry, 
    REG_X, REG_Y, REG_W, REG_H, 
    REG_FOCUS, REG_ENABLED, REG_SCROLL_OFF, REG_SELECTED_IDX, REG_ACTIVE_TAB, REG_TOTAL_ITEMS,
    packCellBits // 🔥 ИСПРАВЛЕНО: Упаковщик битов теперь наливается отсюда
} from "../core/qnx/shared_state.js";

import { drawFnbarTuchesOverlay } from "./fnbar_view.js";

const _MODIFIER_NAMES = ["DEFAULT", "CTRL", "SHIFT", "ALT"];

export function reduceBarsLayer(currentCols, currentRows) {
    if ((currentCols | 0) <= 0 || (currentRows | 0) <= 0) return;
    const totalCellsLimit = (currentCols * currentRows) | 0;

    // 1. СЛОТ 200: TABSBAR (Y = 0)
    const activeModIdx = _qnxHardwareRegistry[(200 << 4) + REG_ACTIVE_TAB] & 3; 
    let tabX = 2;
    for (let x = 0; x < currentCols; x = (x + 1) | 0) {
        if (x < totalCellsLimit) _virtualCanvasState[x] = packCellBits(0x20, 246, 236);
    }

    for (let m = 0; m < 4; m = (m + 1) | 0) {
        const isCurrent = (m === activeModIdx);
        const bg = isCurrent ? 220 : 236; 
        const fg = isCurrent ? 16 : 246;
        const name = _MODIFIER_NAMES[m];

        if ((tabX + name.length + 2) < currentCols) {
            _virtualCanvasState[tabX++] = packCellBits(0x20, fg, bg);
            for (let i = 0; i < name.length; i++) {
                _virtualCanvasState[tabX++] = packCellBits(name.charCodeAt(i), fg, bg);
            }
            _virtualCanvasState[tabX++] = packCellBits(0x20, fg, bg);
            tabX = (tabX + 2) | 0; 
        }
    }

    const titleStr = " SLOTCMP GEN III REAL-TIME QNX MICROKERNEL ";
    let tX = ((currentCols - titleStr.length) - 2) | 0;
    if (tX < 0) tX = 0;

    const maxTitleChars = (currentCols - tX) | 0;
    for (let i = 0; i < titleStr.length; i = (i + 1) | 0) {
        if (i >= maxTitleChars) break;
        _virtualCanvasState[0 * currentCols + tX++] = packCellBits(titleStr.charCodeAt(i), 16, 220); 
    }

    // 2. СЛОТ 105: COMMAND (CLI строка ввода)
    const y105 = _qnxHardwareRegistry[(105 << 4) + REG_Y] | 0;
    if (y105 > 0 && y105 < currentRows) {
        let cliPtr = (y105 * currentCols) | 0;
        const lineEndPtr = ((y105 + 1) * currentCols) | 0;

        if ((cliPtr + 2) < totalCellsLimit) {
            _virtualCanvasState[cliPtr++] = packCellBits(0x3E, 46, 0); 
            _virtualCanvasState[cliPtr++] = packCellBits(0x20, 46, 0); 
            const cliTxtStr = "READY. ENTER COMMAND FOR QNX IPC CORE...";
            for (let i = 0; i < cliTxtStr.length; i = (i + 1) | 0) {
                if (cliPtr >= lineEndPtr) break;
                _virtualCanvasState[cliPtr++] = packCellBits(cliTxtStr.charCodeAt(i), 250, 0);
            }
            while (cliPtr < lineEndPtr && cliPtr < totalCellsLimit) {
                _virtualCanvasState[cliPtr++] = packCellBits(0x20, 7, 0);
            }
        }
    }

    // 3. СЛОТ 104: FNBAR (Тушки меню F1-F10)
    const y104 = _qnxHardwareRegistry[(104 << 4) + REG_Y] | 0;
    if (y104 > 0 && y104 < currentRows) {
        drawFnbarTuchesOverlay(_virtualCanvasState, y104, currentCols, activeModIdx);
    }

    // 4. СЛОТ 108: LOGGER (Чистый эксплуатационный контур)
    const y108 = _qnxHardwareRegistry[(108 << 4) + REG_Y] | 0;
    const h108 = _qnxHardwareRegistry[(108 << 4) + REG_H] | 0;
    if (y108 > 0 && h108 > 0 && ((y108 + h108) <= currentRows)) {
        let topBarPtr = (y108 * currentCols) | 0;
        if ((topBarPtr + currentCols) <= totalCellsLimit) {
            _virtualCanvasState[topBarPtr] = packCellBits(0x2554, 242, 0); 
            for (let x = 1; x < (currentCols - 1); x = (x + 1) | 0) {
                _virtualCanvasState[topBarPtr + x] = packCellBits(0x2550, 242, 0); 
            }
            _virtualCanvasState[topBarPtr + currentCols - 1] = packCellBits(0x2557, 242, 0); 

            const pspStr = " [6: 108 1/1]== ";
            let pspPtr = (topBarPtr + 2) | 0;
            for (let i = 0; i < pspStr.length; i++) {
                if (pspPtr >= (topBarPtr + currentCols - 1)) break;
                _virtualCanvasState[pspPtr++] = packCellBits(pspStr.charCodeAt(i), 244, 0);
            }
        }

        // 🔥 ИСПРАВЛЕНО: Тело логгера теперь стерильно и не содержит вырезанной строки DOD_MONITOR
        for (let y = (y108 + 1); y < ((y108 + h108 - 1) | 0); y = (y + 1) | 0) {
            let logPtr = (y * currentCols) | 0;
            if ((logPtr + currentCols) > totalCellsLimit) break;

            _virtualCanvasState[logPtr] = packCellBits(0x2551, 242, 0); 
            for (let x = 1; x < (currentCols - 1); x = (x + 1) | 0) {
                _virtualCanvasState[logPtr + x] = packCellBits(0x20, 242, 0); 
            }
            _virtualCanvasState[logPtr + currentCols - 1] = packCellBits(0x2551, 242, 0);
        }

        let botBarPtr = ((y108 + h108 - 1) * currentCols) | 0;
        if ((botBarPtr + currentCols) <= totalCellsLimit) {
            _virtualCanvasState[botBarPtr] = packCellBits(0x255A, 242, 0); 
            for (let x = 1; x < (currentCols - 1); x = (x + 1) | 0) {
                _virtualCanvasState[botBarPtr + x] = packCellBits(0x2550, 242, 0); 
            }
            _virtualCanvasState[botBarPtr + currentCols - 1] = packCellBits(0x255D, 242, 0); 
        }
    }

    // 5. СЛОТ 100: TASKBAR (Самая последняя строчка)
    const y100 = _qnxHardwareRegistry[(100 << 4) + REG_Y] | 0;
    if (y100 > 0 && y100 < currentRows) {
        let taskPtr = (y100 * currentCols) | 0;
        const taskEndPtr = ((y100 + 1) * currentCols) | 0;
        
        for (let x = 0; x < currentCols; x = (x + 1) | 0) {
            if ((taskPtr + x) < totalCellsLimit) _virtualCanvasState[taskPtr + x] = packCellBits(0x20, 16, 51);
        }

        const taskTxtStr = "  ■ 102:explorer  ■ 103:explorer  ■ 106:theme  ■ 108:logger ";
        for (let i = 0; i < taskTxtStr.length; i = (i + 1) | 0) {
            if (taskPtr >= taskEndPtr || taskPtr >= totalCellsLimit) break;
            _virtualCanvasState[taskPtr++] = packCellBits(taskTxtStr.charCodeAt(i), 16, 51);
        }
    }
}
