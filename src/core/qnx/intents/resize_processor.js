/**
 * @file src/core/qnx/intents/resize_processor.js
 * @version 3.1.1-RELEASE-QNX-GENERIC-2-PASS-CLEAN-IMPORTS
 * @description Безаллокационный процессор пересчета геометрии Window Manager (PAC/DOD).
 * ИСПРАВЛЕНО: Выжжен фантомный импорт _qnxActiveSlotsCountContainer, вызывавший SyntaxError.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% ООП-зажимов, 100% Zero Allocation.
 */

import { 
    _qnxHardwareRegistry, _shadowCanvasState,
    REG_X, REG_Y, REG_W, REG_H, REG_ENABLED, REG_SCROLL_OFF, REG_TOTAL_ITEMS,
    REG_SIZE_TYPE, REG_SIZE_VALUE
} from "../shared_state.js";

// Преаллоцированные статические буферы цепочек укладки для 100% защиты от GC в рантайме
const _STATIC_LAYOUT_CHAIN_BUF = new Int16Array(8);
const _STATIC_SCROLL_CHAIN_BUF = new Int16Array(4);

export function executeHardwareResizeStep(payload) {
    const cols = (payload & 0xFFFF) | 0;
    const rows = ((payload >> 16) & 0xFFFF) | 0;

    if (cols < 20 || rows < 8) return;

    // Прошиваем глобальные габариты терминала в Слот 0
    _qnxHardwareRegistry[(0 << 4) + 0] = cols; 
    _qnxHardwareRegistry[(0 << 4) + 1] = rows; 

    const isDashboardOpen = _qnxHardwareRegistry[(101 << 4) + REG_ENABLED] | 0;
    const isViewerEnabled = _qnxHardwareRegistry[(110 << 4) + REG_ENABLED] | 0;

    // Вычисляем горизонтальные флекс-пропорции воркспейса кадра (40% левый проводник, 60% вьюер)
    const w102 = Math.floor(cols * 0.4) | 0;
    const w110 = isViewerEnabled === 1 ? ((cols - w102) | 0) : 0;
    const w103 = isViewerEnabled === 1 ? 0 : Math.floor(cols * 0.4) | 0;
    const w106 = isViewerEnabled === 1 ? 0 : ((cols - w102 - w103) | 0);

    // Безаллокационное наполнение строго упорядоченной вертикальной цепочки слотов растра
    let chainLen = 0;
    _STATIC_LAYOUT_CHAIN_BUF[chainLen++] = 200; // Tabsbar
    _STATIC_LAYOUT_CHAIN_BUF[chainLen++] = 101; // Dashboard
    _STATIC_LAYOUT_CHAIN_BUF[chainLen++] = 102; // Workspace (якорь для 103, 106, 110)
    _STATIC_LAYOUT_CHAIN_BUF[chainLen++] = 105; // Command line
    _STATIC_LAYOUT_CHAIN_BUF[chainLen++] = 104; // Fnbar
    _STATIC_LAYOUT_CHAIN_BUF[chainLen++] = 108; // Logger
    _STATIC_LAYOUT_CHAIN_BUF[chainLen++] = 100; // Taskbar

    // =================================================================
    // 🔥 ПРОХОД 1: СНИЗУ ВВЕРХ (Bottom-Up) — Слепой сбор требований ОЗУ
    // =================================================================
    let freePoolH = rows | 0; 
    let totalPercentWeight = 0;

    for (let slotId = 100; slotId <= 200; slotId = (slotId + 1) | 0) {
        const offset = slotId << 4;
        if (_qnxHardwareRegistry[offset + REG_ENABLED] === 0) continue;

        const sizeType  = _qnxHardwareRegistry[offset + REG_SIZE_TYPE] | 0;
        const sizeValue = _qnxHardwareRegistry[offset + REG_SIZE_VALUE] | 0;

        if (sizeType === 0) {
            freePoolH = (freePoolH - sizeValue) | 0;
        } else {
            totalPercentWeight = (totalPercentWeight + sizeValue) | 0;
        }
    }

    if (freePoolH < 2) freePoolH = 2; 
    if (totalPercentWeight === 0) totalPercentWeight = 100;

    // =================================================================
    // 🔥 ПРОХОД 2: СВЕРХУ ВНИЗ (Top-Down) — Расчет пикселей и Координат Y
    // =================================================================
    let currentGlobalY = 0;

    for (let i = 0; i < chainLen; i = (i + 1) | 0) {
        const slotId = _STATIC_LAYOUT_CHAIN_BUF[i] | 0;
        const offset = slotId << 4;

        if (_qnxHardwareRegistry[offset + REG_ENABLED] === 0) continue;

        const sizeType  = _qnxHardwareRegistry[offset + REG_SIZE_TYPE] | 0;
        const sizeValue = _qnxHardwareRegistry[offset + REG_SIZE_VALUE] | 0;

        let calculatedH = 0;

        if (sizeType === 0) {
            calculatedH = sizeValue | 0;
        } else {
            calculatedH = Math.floor((sizeValue * freePoolH) / totalPercentWeight) | 0;
            if (calculatedH < 1) calculatedH = 1;
        }

        // Синхронизируем горизонтальные сдвиги окон внутри воркспейса
        if (slotId === 102) {
            if (calculatedH < 3) calculatedH = 3;

            const o110 = 110 << 4;
            _qnxHardwareRegistry[o110 + REG_X] = w102; _qnxHardwareRegistry[o110 + REG_Y] = currentGlobalY;
            _qnxHardwareRegistry[o110 + REG_W] = w110; _qnxHardwareRegistry[o110 + REG_H] = calculatedH;

            const o103 = 103 << 4;
            _qnxHardwareRegistry[o103 + REG_X] = w102; _qnxHardwareRegistry[o103 + REG_Y] = currentGlobalY;
            _qnxHardwareRegistry[o103 + REG_W] = w103; _qnxHardwareRegistry[o103 + REG_H] = calculatedH;

            const o106 = 106 << 4;
            _qnxHardwareRegistry[o106 + REG_X] = (w102 + w103) | 0; _qnxHardwareRegistry[o106 + REG_Y] = currentGlobalY;
            _qnxHardwareRegistry[o106 + REG_W] = w106;              _qnxHardwareRegistry[o106 + REG_H] = calculatedH;
        }

        _qnxHardwareRegistry[offset + REG_X] = 0;
        _qnxHardwareRegistry[offset + REG_Y] = currentGlobalY;
        _qnxHardwareRegistry[offset + REG_W] = cols;
        _qnxHardwareRegistry[offset + REG_H] = calculatedH;

        // КЛАМПИНГ СКРОЛЛБАРОВ (Выполняется по месту за один такт)
        if (slotId === 102 || slotId === 108) {
            let scrLen = 0;
            _STATIC_SCROLL_CHAIN_BUF[scrLen++] = 102;
            _STATIC_SCROLL_CHAIN_BUF[scrLen++] = 103;
            _STATIC_SCROLL_CHAIN_BUF[scrLen++] = 106;
            _STATIC_SCROLL_CHAIN_BUF[scrLen++] = 110;

            for (let k = 0; k < scrLen; k = (k + 1) | 0) {
                const sId = _STATIC_SCROLL_CHAIN_BUF[k] | 0;
                const sOff = sId << 4;
                if (_qnxHardwareRegistry[sOff + REG_ENABLED] === 1) {
                    const totalItems = _qnxHardwareRegistry[sOff + REG_TOTAL_ITEMS] | 0;
                    const winH = _qnxHardwareRegistry[sOff + REG_H] | 0;
                    const maxVisibleRows = (winH - 4) | 0; 
                    const currentScroll = _qnxHardwareRegistry[sOff + REG_SCROLL_OFF] | 0;
                    
                    if (maxVisibleRows > 0 && (currentScroll + maxVisibleRows) > totalItems) {
                        _qnxHardwareRegistry[sOff + REG_SCROLL_OFF] = Math.max(0, (totalItems - maxVisibleRows) | 0);
                    }
                }
            }
        }

        currentGlobalY = (currentGlobalY + calculatedH) | 0;
    }

    _shadowCanvasState.fill(-1); 
}

// TIMESTAMP: 2026-09-27 21:44:20
// PATH: c:\slotcmp_5\V\src\core\qnx\intents\resize_processor.js
