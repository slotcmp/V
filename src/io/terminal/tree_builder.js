/**
 * @file src/io/terminal/tree_builder.js
 * @version 1.5.0-RELEASE-QNX-PIPELINED-ZATVOR-DIAGNOSTIC
 * @description Реактивный мономорфный композитор сборки растра кадра по слоям.
 * ИСПРАВЛЕНО: Интегрирован посимвольный отладочный вывод Boot Diagnostic Bar при блокировке затвора.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% объектов в рантайме, 100% Zero Allocation.
 */

import { 
    _qnxHardwareRegistry, 
    _virtualCanvasState, 
    REG_CORE_READY_MASK, 
    REG_CORE_BOOT_STAGE, // Импортируем регистр отслеживания стадий загрузки
    CORE_READY_TARGET,
    packCellBits
} from "../../core/qnx/shared_state.js";

import { reduceFrameLayer } from "../../views/z1_frame_layer.js";
import { reduceTabsLayer } from "../../views/z2_tabs_layer.js";
import { reduceContentLayer } from "../../views/z3_content_layer.js";
import { reduceBarsLayer } from "../../views/z4_bars_layer.js";
import { drawDashboardContent } from "../../views/dashboard_view.js";
import { processInteractiveReducer } from "../../views/z3_interactive_reducer.js";

/**
 * Верховная мономорфная точка сборки растра кадра
 */
export function blitDisplayFrameMonomorphic() {
    // 🔥 СЕМАНТИЧЕСКИЙ ХАРДВЕРНЫЙ ЗАТВОР ИНИЦИАЛИЗАЦИИ
    // Считываем живую 31-битную маску готовности подсистем ядра из Слота 0 (ячейка +2)
    const currentReadyMask = _qnxHardwareRegistry[(0 << 4) + REG_CORE_READY_MASK] | 0;

    // Сверяем накопленные биты с целевым паттерном CORE_READY_TARGET (0x19 = 0b11001)
    // Если воркеры или ресайз еще не отчитались — выводим Boot Diagnostic Bar и блокируем кадр
    if ((currentReadyMask & CORE_READY_TARGET) !== CORE_READY_TARGET) {
        const currentCols = _qnxHardwareRegistry[(0 << 4) + 0] || 120;
        const currentStage = _qnxHardwareRegistry[(0 << 4) + REG_CORE_BOOT_STAGE] | 0;
        
        // Посимвольно пишем отладочную строку прямо в нулевую линию холста (Y=0)
        const prefixStr = "[BOOT LOCK] Target: 0x19 | Mask: ";
        let cX = 2;
        
        // Накатываем префикс ярко-красным цветом
        for (let i = 0; i < prefixStr.length; i = (i + 1) | 0) {
            const ptr = (0 * currentCols + cX++) | 0;
            if (ptr < _virtualCanvasState.length) {
                _virtualCanvasState[ptr] = packCellBits(prefixStr.charCodeAt(i), 196, 0);
            }
        }
        
        // Накатываем текущее значение маски в виде символа (симуляция 0-9)
        const maskChar = (0x30 + (currentReadyMask & 0xF)) | 0;
        const ptrM = (0 * currentCols + cX++) | 0;
        if (ptrM < _virtualCanvasState.length) _virtualCanvasState[ptrM] = packCellBits(maskChar, 220, 0);

        const dividerStr = " | Stage: ";
        for (let i = 0; i < dividerStr.length; i = (i + 1) | 0) {
            const ptr = (0 * currentCols + cX++) | 0;
            if (ptr < _virtualCanvasState.length) {
                _virtualCanvasState[ptr] = packCellBits(dividerStr.charCodeAt(i), 196, 0);
            }
        }

        // Накатываем цифру текущей стадии инициализации гидратора
        const stageChar = (0x30 + currentStage) | 0;
        const ptrS = (0 * currentCols + cX++) | 0;
        if (ptrS < _virtualCanvasState.length) _virtualCanvasState[ptrS] = packCellBits(stageChar, 220, 0);

        return; // Аппаратный блок. Предотвращаем рендер недогруженных Z-слоев.
    }

    const currentCols = _qnxHardwareRegistry[(0 << 4) + 0] | 0;
    const currentRows = _qnxHardwareRegistry[(0 << 4) + 1] | 0;
    
    if (currentCols === 0 || currentRows === 0) return; // Гвард холодного пуска

    // =================================================================
    // ТАКТОВЫЙ КОНВЕЙЕР РЕДУКЦИИ Z-СЛОЕВ ВИДЕОПАМЯТИ ОЗУ
    // =================================================================
    reduceFrameLayer(currentCols);             // Z-1: Ребра оконных рам
    reduceTabsLayer(currentCols);              // Z-2: Паспорта окон и ушки табов
    reduceContentLayer(currentCols);           // Z-3: Текстура фона и VFS-списки / ТЕМЫ
    reduceBarsLayer(currentCols, currentRows); // Z-4: Системный обвес (Линейки, Логгер)

    // Финальный безаллокационный накат интерактивных элементов
    processInteractiveReducer(currentCols);
    drawDashboardContent(_virtualCanvasState, currentCols); 
}

// TIMESTAMP: 2026-09-27 14:46:15
// PATH: c:\slotcmp_5\V\src\io\terminal\tree_builder.js
