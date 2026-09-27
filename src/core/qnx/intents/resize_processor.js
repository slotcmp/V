/**
 * @file src/core/qnx/intents/resize_processor.js
 * @version 1.3.2-RELEASE-QNX-RESIZE-Y104-FIXED
 * @description Безаллокационный процессор пересчета геометрии Window Manager.
 * ИСПРАВЛЕНО: Ликвидирована ошибка ReferenceError на расчете координаты currentY104.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% ООП-зажимов, 100% Zero Allocation.
 */

import { 
    _qnxHardwareRegistry, _shadowCanvasState,
    REG_X, REG_Y, REG_W, REG_H, REG_ENABLED, REG_SCROLL_OFF, REG_TOTAL_ITEMS
} from "../shared_state.js";

export function executeHardwareResizeStep(payload) {
    const cols = (payload & 0xFFFF) | 0;
    const rows = ((payload >> 16) & 0xFFFF) | 0;

    if (cols < 20 || rows < 8) return;

    _qnxHardwareRegistry[(0 << 4) + 0] = cols; 
    _qnxHardwareRegistry[(0 << 4) + 1] = rows; 

    const dynamicPoolH = (rows - 5) | 0; 
    if (dynamicPoolH <= 0) return;

    const loggerWeight = _qnxHardwareRegistry[(108 << 4) + 13] || 20;
    let h108 = 1;
    if (loggerWeight === 20) {
        h108 = (dynamicPoolH / 5) | 0; 
    } else {
        h108 = Math.floor((loggerWeight * dynamicPoolH) / 100) | 0;
    }
    if (h108 < 1) h108 = 1;
    
    let totalWorkspacePoolH = (dynamicPoolH - h108) | 0;
    if (totalWorkspacePoolH < 3) totalWorkspacePoolH = 3;

    const o101 = 101 << 4;
    const isDashboardOpen = _qnxHardwareRegistry[o101 + REG_ENABLED] | 0;

    let h101 = 0;
    let workspaceYStart = 1; 

    if (isDashboardOpen === 1) {
        if ((totalWorkspacePoolH - 7) >= 3) {
            h101 = 7;
            totalWorkspacePoolH = (totalWorkspacePoolH - 7) | 0; 
            workspaceYStart = 8; 
        } else {
            _qnxHardwareRegistry[o101 + REG_ENABLED] = 0;
        }
    }

    const workspaceH = totalWorkspacePoolH | 0;

    const w102 = Math.floor(cols * 0.4) | 0; 
    
    let w103 = 0;
    let w106 = 0;
    let w110 = 0;

    const isViewerEnabled = _qnxHardwareRegistry[(110 << 4) + REG_ENABLED] | 0;

    if (isViewerEnabled === 1) {
        w110 = (cols - w102) | 0;
        w103 = 0; 
        w106 = 0; 
    } else {
        w103 = Math.floor(cols * 0.4) | 0;
        w106 = (cols - w102 - w103) | 0;
        w110 = 0;
    }

    // СЛОТ 200: TABSBAR
    const o200 = 200 << 4;
    _qnxHardwareRegistry[o200 + REG_X] = 0;    _qnxHardwareRegistry[o200 + REG_Y] = 0;
    _qnxHardwareRegistry[o200 + REG_W] = cols; _qnxHardwareRegistry[o200 + REG_H] = 1;

    // СЛОТ 101: DASHBOARD
    _qnxHardwareRegistry[o101 + REG_X] = 0;    _qnxHardwareRegistry[o101 + REG_Y] = 1;
    _qnxHardwareRegistry[o101 + REG_W] = cols; _qnxHardwareRegistry[o101 + REG_H] = h101;

    // СЛОТ 102: EXPLORER ЛЕВЫЙ
    const o102 = 102 << 4;
    _qnxHardwareRegistry[o102 + REG_X] = 0;    _qnxHardwareRegistry[o102 + REG_Y] = workspaceYStart;
    _qnxHardwareRegistry[o102 + REG_W] = w102; _qnxHardwareRegistry[o102 + REG_H] = workspaceH;

    // СЛОТ 103: EXPLORER ПРАВЫЙ
    const o103 = 103 << 4;
    _qnxHardwareRegistry[o103 + REG_X] = w102; _qnxHardwareRegistry[o103 + REG_Y] = workspaceYStart;
    _qnxHardwareRegistry[o103 + REG_W] = w103; _qnxHardwareRegistry[o103 + REG_H] = workspaceH;

    // СЛОТ 106: THEME SIDEBAR
    const o106 = 106 << 4;
    _qnxHardwareRegistry[o106 + REG_X] = (w102 + w103) | 0; _qnxHardwareRegistry[o106 + REG_Y] = workspaceYStart;
    _qnxHardwareRegistry[o106 + REG_W] = w106;              _qnxHardwareRegistry[o106 + REG_H] = workspaceH;

    // СЛОТ 110: МАРКДОУН/ТЕКСТ ПРОСМОТРЩИК
    const o110 = 110 << 4;
    _qnxHardwareRegistry[o110 + REG_X] = w102; _qnxHardwareRegistry[o110 + REG_Y] = workspaceYStart;
    _qnxHardwareRegistry[o110 + REG_W] = w110; _qnxHardwareRegistry[o110 + REG_H] = workspaceH;

    // Безопасный последовательный обход с гвардом REG_ENABLED
    for (let slotId = 102; slotId <= 110; slotId = (slotId === 103 ? 110 : slotId + 1) | 0) {
        const sOff = slotId << 4;
        
        if (_qnxHardwareRegistry[sOff + REG_ENABLED] === 0) continue;

        const totalItems = _qnxHardwareRegistry[sOff + REG_TOTAL_ITEMS] | 0;
        const maxVisibleRows = (workspaceH - 4) | 0; 
        const currentScroll = _qnxHardwareRegistry[sOff + REG_SCROLL_OFF] | 0;
        
        if (maxVisibleRows > 0 && (currentScroll + maxVisibleRows) > totalItems) {
            _qnxHardwareRegistry[sOff + REG_SCROLL_OFF] = Math.max(0, (totalItems - maxVisibleRows) | 0);
        }
    }

    // СЛУЖЕБНЫЙ ОБВЕС
    const currentY105 = (workspaceYStart + workspaceH) | 0;
    const o105 = 105 << 4;
    _qnxHardwareRegistry[o105 + REG_X] = 0;    _qnxHardwareRegistry[o105 + REG_Y] = currentY105;
    _qnxHardwareRegistry[o105 + REG_W] = cols; _qnxHardwareRegistry[o105 + REG_H] = 1;

    // СЛОТ 104: FNBAR
    const o104 = 104 << 4;
    _qnxHardwareRegistry[o104 + REG_X] = 0;    _qnxHardwareRegistry[o104 + REG_Y] = (currentY105 + 1) | 0;
    _qnxHardwareRegistry[o104 + REG_W] = cols; _qnxHardwareRegistry[o104 + REG_H] = 1;

    // СЛОТ 108: LOGGER
    const currentY108 = (_qnxHardwareRegistry[o104 + REG_Y] + 1) | 0;
    const o108 = 108 << 4;
    _qnxHardwareRegistry[o108 + REG_X] = 0;    _qnxHardwareRegistry[o108 + REG_Y] = currentY108;
    _qnxHardwareRegistry[o108 + REG_W] = cols; _qnxHardwareRegistry[o108 + REG_H] = h108;

    // СЛОТ 100: TASKBAR
    const currentY100 = Math.min(rows - 1, (currentY108 + h108) | 0);
    const o100 = 100 << 4;
    _qnxHardwareRegistry[o100 + REG_X] = 0;    _qnxHardwareRegistry[o100 + REG_Y] = currentY100;
    _qnxHardwareRegistry[o100 + REG_W] = cols; _qnxHardwareRegistry[o100 + REG_H] = 1;

    _shadowCanvasState.fill(-1);
}

// TIMESTAMP: 2026-09-27 15:10:10
// PATH: c:\slotcmp_5\V\src\core\qnx\intents\resize_processor.js
