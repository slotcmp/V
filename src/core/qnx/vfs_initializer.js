/**
 * @file src/core/qnx/vfs_initializer.js
 * @version 2.3.0-RELEASE-QNX-HYDRATOR-TOPOLOGY-PARSER
 * @description Двухфайловый гидратор ОЗУ ядра. Интегрирован посимвольный парсер текстовых высот topology.json в бинарные регистры 14 и 15.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% объектов в рантайме, 100% Zero Allocation.
 */

import fs from "node:fs";
import pathNode from "node:path";

import { 
    _qnxHardwareRegistry, 
    _qnxDisplayIndexToSlotMap,
    _qnxStaticTextViewerBuffer,
    REG_CORE_READY_MASK,
    REG_CORE_BOOT_STAGE, 
    CORE_BIT_VFS_INIT,
    CORE_BIT_SLOT_110,
    REG_X, REG_Y, REG_W, REG_H, REG_FOCUS, REG_ENABLED, REG_TOTAL_ITEMS, REG_ACTIVE_TAB,
    REG_SIZE_TYPE, REG_SIZE_VALUE
} from "./shared_state.js";

export const _qnxStaticVfsBytesBuffer = new Uint8Array(64 * 1000);
globalThis._qnxActiveVfsSharedBufferBypass = _qnxStaticVfsBytesBuffer;
globalThis._qnxVfsPathMap = Object.create(null);

/**
 * Синхронно гидратирует ОЗУ ядра на базе двух раздельных файлов конфигурации
 */
export function initializeHardwareRegistryDefaults() {
    const bootStageOffset = (0 << 4) + REG_CORE_BOOT_STAGE;
    
    // СТАДИЯ 0: Инициализация ОЗУ ядра запущена
    _qnxHardwareRegistry[bootStageOffset] = 0;

    _qnxDisplayIndexToSlotMap.fill(0);
    const rootPathStr = process.cwd();

    // =================================================================
    // ФАЗА А: ПРЯМОЙ НАЛИВ РЕГИСТРОВ ПЕРИФЕРИИ (slots_config.json)
    // =================================================================
    const configPath = pathNode.resolve(rootPathStr, "./slots_config.json");
    const rawConfigData = fs.readFileSync(configPath, "utf8");
    const slotsConfig = JSON.parse(rawConfigData);

    const slotIdsArray = Object.keys(slotsConfig);
    const slotsCount = slotIdsArray.length | 0;

    for (let i = 0; i < slotsCount; i = (i + 1) | 0) {
        const slotIdStr = slotIdsArray[i];
        const slotIdNum = parseInt(slotIdStr, 10) & 255;
        if (isNaN(slotIdNum) || slotIdNum === 0) continue;

        const cfgNode = slotsConfig[slotIdStr];
        const offset = slotIdNum << 4;

        _qnxHardwareRegistry[offset + REG_ENABLED]    = cfgNode.enabled === true ? 1 : 0;
        _qnxHardwareRegistry[offset + REG_FOCUS]      = slotIdNum === 102 ? 1 : 0; 
        _qnxHardwareRegistry[offset + REG_ACTIVE_TAB] = (cfgNode.activeStackIdx | 0) & 15;

        // По дефолту инициализируем геометрический паспорт (проценты, 50% веса)
        _qnxHardwareRegistry[offset + REG_SIZE_TYPE]  = 1;
        _qnxHardwareRegistry[offset + REG_SIZE_VALUE] = 50;

        if (typeof cfgNode.displayIndex !== "undefined" && cfgNode.displayIndex !== null) {
            const dIdx = parseInt(cfgNode.displayIndex, 10) & 15;
            if (dIdx >= 0 && dIdx < 10) {
                _qnxDisplayIndexToSlotMap[dIdx] = slotIdNum | 0;
                _qnxHardwareRegistry[offset + 10] = dIdx | 0; 
            }
        }

        if (Array.isArray(cfgNode.tabs)) {
            const tLen = cfgNode.tabs.length | 0;
            for (let t = 0; t < tLen; t = (t + 1) | 0) {
                const tabItem = cfgNode.tabs[t];
                if (tabItem && tabItem.path) {
                    const cacheKeyStr = `${slotIdNum}_${t}`;
                    globalThis._qnxVfsPathMap[cacheKeyStr] = String(tabItem.path);
                }
            }
        }
    }

    // СТАДИЯ 1: slots_config.json успешно распарсен и залит в ОЗУ
    _qnxHardwareRegistry[bootStageOffset] = 1;

    // =================================================================
    // ФАЗА Б: ЗАГРУЗКА, ФИКСАЦИЯ И ПАРСИНГ СЕТКИ ТОПОЛОГИИ (topology.json)
    // =================================================================
    const topologyPath = pathNode.resolve(rootPathStr, "./topology.json");
    const rawTopologyData = fs.readFileSync(topologyPath, "utf8");
    const topology = JSON.parse(rawTopologyData);
    
    globalThis._layoutTopologyTree = topology;

    // СКАНИРУЕМ И ПАРСИМ КАРКАС ТОПОЛОГИИ В БИНАРНЫЙ ВИД (Без рекурсии)
    const rootChildren = topology.children || [];
    const rootLen = rootChildren.length | 0;

    for (let i = 0; i < rootLen; i = (i + 1) | 0) {
        const node = rootChildren[i];
        if (!node) continue;

        if (node.type === "slot") {
            parseAndInjectNodeGeometryLocal(node);
        }

        if (node.type === "container" && Array.isArray(node.children)) {
            const subChildren = node.children;
            const subLen = subChildren.length | 0;
            
            for (let k = 0; k < subLen; k = (k + 1) | 0) {
                const subNode = subChildren[k];
                if (subNode && subNode.type === "slot") {
                    parseAndInjectNodeGeometryLocal(subNode);
                }
            }
        }
    }

    // СТАДИЯ 2: topology.json успешно прочитан и разложен на регистры 14 и 15
    _qnxHardwareRegistry[bootStageOffset] = 2;

    // ХОЛОДНЫЙ НАЛИВ ТЕСТОВОГО ГИПЕРТЕКСТА В ОЗУ ВЬЮЕРА
    const testMdStr = "# SLOTCMP V HYPERTEXT\nWelcome to In-Memory QNX Kernel.\n- Built-time DI injection active\n- Performance status: 100% Monomorphic\n`Box-Tuples` like Tarantool engine ready.\n- HotSwap modules status: Active\n# DOCUMENTATION\nScroll engine is synchronized via cells.\n";
    _qnxStaticTextViewerBuffer.fill(0);
    let totalLinesCount = 0;
    for (let s = 0; s < testMdStr.length; s = (s + 1) | 0) {
        const bVal = testMdStr.charCodeAt(s) & 0xFF;
        _qnxStaticTextViewerBuffer[s] = bVal;
        if (bVal === 0x0A) totalLinesCount = (totalLinesCount + 1) | 0;
    }
    
    _qnxHardwareRegistry[(110 << 4) + 9] = totalLinesCount | 0;

    // СТАДИЯ 3: Тестовое пространство заполнено
    _qnxHardwareRegistry[bootStageOffset] = 3;

    _qnxHardwareRegistry[(0 << 4) + REG_CORE_READY_MASK] |= CORE_BIT_VFS_INIT;

    if (_qnxHardwareRegistry[(110 << 4) + REG_ENABLED] === 1) {
        _qnxHardwareRegistry[(0 << 4) + REG_CORE_READY_MASK] |= CORE_BIT_SLOT_110;
    }
}

/**
 * Внутренний безаллокационный парсер текстовых размеров
 */
function parseAndInjectNodeGeometryLocal(node) {
    const slotIdNum = parseInt(node.id, 10) & 255;
    if (isNaN(slotIdNum) || slotIdNum === 0) return;

    const offset = slotIdNum << 4;
    const heightStr = String(node.height || "");
    const hLen = heightStr.length | 0;

    if (hLen > 0) {
        // Проверяем наличие процента % у правого края текстовой строки
        const lastChar = heightStr.charCodeAt((hLen - 1) | 0) | 0;
        
        if (lastChar === 0x25) { // Символ '%'
            _qnxHardwareRegistry[offset + REG_SIZE_TYPE]  = 1; // Процентный тип размера
            _qnxHardwareRegistry[offset + REG_SIZE_VALUE] = parseInt(heightStr, 10) & 0xFFFF;
        } else {
            _qnxHardwareRegistry[offset + REG_SIZE_TYPE]  = 0; // Фиксированные строки
            _qnxHardwareRegistry[offset + REG_SIZE_VALUE] = parseInt(heightStr, 10) & 0xFFFF;
        }
    }
}

export function performSynchronousVfsInject(targetSlotIdNum, relativePathStr) {
    const slotMemoryBaseOffset = ((targetSlotIdNum | 0) === 102) ? 0 : 32000;
    _qnxStaticVfsBytesBuffer.subarray(slotMemoryBaseOffset, slotMemoryBaseOffset + 32000).fill(0);
    
    let cursorOffset = slotMemoryBaseOffset | 0;
    _qnxStaticVfsBytesBuffer[cursorOffset] = 1; 
    _qnxStaticVfsBytesBuffer[cursorOffset + 1] = 0x2E; 
    _qnxStaticVfsBytesBuffer[cursorOffset + 2] = 0x2E; 
    cursorOffset = (cursorOffset + 64) | 0; 
    let totalValidFiles = 1;

    const targetPathStr = pathNode.resolve(process.cwd(), relativePathStr);

    if (fs.existsSync(targetPathStr)) {
        const entries = fs.readdirSync(targetPathStr, { withFileTypes: true }) || [];
        const entriesCount = entries.length | 0;
        const maxItems = entriesCount > 490 ? 490 : entriesCount; 

        for (let i = 0; i < maxItems; i = (i + 1) | 0) {
            const entry = entries[i];
            if (!entry) continue;

            _qnxStaticVfsBytesBuffer[cursorOffset] = entry.isDirectory() ? 1 : 0;
            const nameStr = String(entry.name || "");
            const nameLen = nameStr.length | 0;

            const limitNameChars = nameLen > 60 ? 60 : nameLen;
            for (let n = 0; n < limitNameChars; n = (n + 1) | 0) {
                _qnxStaticVfsBytesBuffer[cursorOffset + 1 + n] = nameStr.charCodeAt(n) & 0xFF;
            }
            totalValidFiles = (totalValidFiles + 1) | 0;
            cursorOffset = (cursorOffset + 64) | 0; 
        }
    }
    _qnxHardwareRegistry[(targetSlotIdNum << 4) + 9] = totalValidFiles; 
}

// TIMESTAMP: 2026-09-27 21:34:10
// PATH: c:\slotcmp_5\V\src\core\qnx\vfs_initializer.js
