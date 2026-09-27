/**
 * @file src/core/qnx/window_manager.js
 * @version 1.1.0-RELEASE-QNX-WINDOW-MANAGER-WITH-TAB-CLICKS
 * @description Единый абстрактный менеджер оконных интерфейсов (DOD Window Manager).
 * ИСПРАВЛЕНО: Интегрирован универсальный безаллокационный хит-тест кликов по вкладкам приборов.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% объектов в рантайме, 100% Zero Allocation.
 */

import fs from "node:fs";
import pathNode from "node:path";
import { 
    _virtualCanvasState, 
    _qnxHardwareRegistry, 
    getDynamicThemeActiveColor, 
    getDynamicThemePassiveColor, 
    REG_X, REG_Y, REG_W, REG_H, REG_FOCUS, REG_ENABLED, REG_ACTIVE_TAB, packCellBits 
} from "./shared_state.js";

// Статический справочник кэша табов из slots_config.json под нужды Window Manager
const _QNX_WINDOW_TABS_DICTIONARY = Object.create(null);

// Инициализируем справочник имен табов один раз при загрузке модуля (Build-Time Preload)
const configPath = pathNode.resolve(process.cwd(), "./slots_config.json");
const slotsConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
for (const idStr in slotsConfig) {
    if (Array.isArray(slotsConfig[idStr].tabs)) {
        _QNX_WINDOW_TABS_DICTIONARY[idStr] = slotsConfig[idStr].tabs;
    }
}

/**
 * Мономорфный накат неспецифического обвеса окна (Рамки и Табы) за 1 проход
 */
export function drawAbstractWindowWrapper(canvas, slotId, currentCols, totalCellsLimit, activeThemeId) {
    const offset = slotId << 4;
    
    const sX = _qnxHardwareRegistry[offset + REG_X] | 0; 
    const sY = _qnxHardwareRegistry[offset + REG_Y] | 0; 
    const sW = _qnxHardwareRegistry[offset + REG_W] | 0; 
    const sH = _qnxHardwareRegistry[offset + REG_H] | 0; 
    const isF = _qnxHardwareRegistry[offset + REG_FOCUS] | 0; 
    const activeTabIdx = _qnxHardwareRegistry[offset + REG_ACTIVE_TAB] | 0;

    // ГВАРД БЕЗРАМОЧНОСТИ: Окна с высотой <= 1 не получают обвес
    if (sH <= 1 || sW < 4) return;

    // Извлекаем цвета темы оформления
    const frameColorNum = (isF === 1) 
        ? (getDynamicThemeActiveColor(activeThemeId) | 0) 
        : (getDynamicThemePassiveColor(activeThemeId) | 0);

    // =================================================================
    // ПАСС А: НАКАТ СТАЛЬНЫХ РЕБЕР ОКНА (Z-1 Рамки)
    // =================================================================
    for (let x = sX; x < ((sX + sW) | 0); x = (x + 1) | 0) {
        const topPtr = (sY * currentCols + x) | 0;
        const botPtr = (((sY + sH - 1) | 0) * currentCols + x) | 0;
        if (topPtr < totalCellsLimit) canvas[topPtr] = packCellBits(0x2550, frameColorNum, 0); 
        if (botPtr < totalCellsLimit) canvas[botPtr] = packCellBits(0x2550, frameColorNum, 0); 
    }
    for (let y = sY; y < ((sY + sH) | 0); y = (y + 1) | 0) {
        const leftPtr = (y * currentCols + sX) | 0;
        const rightPtr = (y * currentCols + (sX + sW - 1)) | 0;
        if (leftPtr < totalCellsLimit)  canvas[leftPtr]  = packCellBits(0x2551, frameColorNum, 0); 
        if (rightPtr < totalCellsLimit) canvas[rightPtr] = packCellBits(0x2551, frameColorNum, 0); 
    }
    const cTL = (sY * currentCols + sX) | 0;
    const cTR = (sY * currentCols + (sX + sW - 1)) | 0;
    const cBL = (((sY + sH - 1) | 0) * currentCols + sX) | 0;
    const cBR = (((sY + sH - 1) | 0) * currentCols + (sX + sW - 1)) | 0;
    if (cTL < totalCellsLimit) canvas[cTL] = packCellBits(0x2554, frameColorNum, 0); 
    if (cTR < totalCellsLimit) canvas[cTR] = packCellBits(0x2557, frameColorNum, 0); 
    if (cBL < totalCellsLimit) canvas[cBL] = packCellBits(0x255A, frameColorNum, 0); 
    if (cBR < totalCellsLimit) canvas[cBR] = packCellBits(0x255D, frameColorNum, 0);

    // =================================================================
    // ПАСС Б: АВТОМАТИЧЕСКИЙ ВЫЖИГ УШЕК ТАБОВ ОКНА (Z-2 Табы)
    // =================================================================
    const tabsList = _QNX_WINDOW_TABS_DICTIONARY[slotId];
    if (!tabsList) return; 

    const tabsY = (sY + 1) | 0;
    let currentTabX = (sX + 2) | 0;
    const rightMaxEdgeX = (sX + sW - 2) | 0;
    const baseTabRowPtr = (tabsY * currentCols) | 0;
    const tabsCount = tabsList.length | 0;

    for (let t = 0; t < tabsCount; t = (t + 1) | 0) {
        const isCurrent = (t === activeTabIdx);
        const bg = isCurrent ? (isF === 1 ? 220 : 51) : 236; 
        const fg = isCurrent ? 16 : 246;

        const tabNode = tabsList[t];
        const labelStr = (typeof tabNode === "object" ? tabNode.title : String(tabNode)) || "";
        const labelLen = labelStr.length | 0;

        if ((currentTabX + labelLen + 2) < rightMaxEdgeX) {
            if ((baseTabRowPtr + currentTabX + labelLen + 2) < totalCellsLimit) {
                canvas[baseTabRowPtr + currentTabX++] = packCellBits(0x5B, fg, bg); 
                for (let ch = 0; ch < labelLen; ch = (ch + 1) | 0) {
                    canvas[baseTabRowPtr + currentTabX++] = packCellBits(labelStr.charCodeAt(ch), fg, bg);
                }
                canvas[baseTabRowPtr + currentTabX++] = packCellBits(0x5D, fg, bg); 
                currentTabX = (currentTabX + 1) | 0; 
            }
        }
    }
}

/**
 * 🔥 УТВЕРЖДЕНО: УНИВЕРСАЛЬНЫЙ КООРДИНАТНЫЙ АВТОМАТ КЛИКОВ ПО ТАБАМ (O(1) / DRY)
 * Рассчитывает хит-тест для вкладок любого прибора на основе словаря slots_config.json
 * @returns {boolean} true, если клик попал в ушко таба и состояние ОЗУ изменилось
 */
export function processAbstractWindowTabClick(clickX, slotId) {
    const tabsList = _QNX_WINDOW_TABS_DICTIONARY[slotId];
    if (!tabsList) return false;

    const offset = slotId << 4;
    const sX = _qnxHardwareRegistry[offset + REG_X] | 0;
    
    let currentTabX = (sX + 2) | 0;
    const tabsCount = tabsList.length | 0;

    for (let t = 0; t < tabsCount; t = (t + 1) | 0) {
        const tabNode = tabsList[t];
        const labelStr = (typeof tabNode === "object" ? tabNode.title : String(tabNode)) || "";
        const tabWidth = (labelStr.length + 2) | 0; // Полная длина структуры [ИМЯ_ТАБА]

        // Проверяем вхождение координаты X мыши в текущее ушко
        if (clickX >= currentTabX && clickX < ((currentTabX + tabWidth) | 0)) {
            _qnxHardwareRegistry[offset + REG_ACTIVE_TAB] = t | 0;
            return true; // Удар зафиксирован, прерывание обработано
        }
        
        currentTabX = (currentTabX + tabWidth + 1) | 0; // Сдвигаемся вперед на ширину ушка + пробел знакоместа
    }
    return false;
}

// TIMESTAMP: 2026-09-27 15:46:12
// PATH: c:\slotcmp_5\V\src\core\qnx\window_manager.js
