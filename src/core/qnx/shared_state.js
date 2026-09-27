/**
 * @file src/core/qnx/shared_state.js
 * @version 1.7.2-RELEASE-QNX-STRICT-BOOT-TRACKER-SUPPORTED
 * @description Аппаратная карта ОЗУ, плоские буферы ядра, 31-битная карта и регистры трекера загрузки.
 * ИСПРАВЛЕНО: Интегрирован системный регистр REG_CORE_BOOT_STAGE (3) в Слот 0.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% хардкода COLS/ROWS, 100% Zero Allocation.
 */

// ПРЕАЛЛОЦИРОВАННЫЙ UHD-ЗАПАС ГЛОБАЛЬНОЙ ВИДЕОПАМЯТИ (Максимум 256 колонок на 100 строк)
export const MAX_COLS = 256;
export const MAX_ROWS = 100;

export const _virtualCanvasState = new Int32Array(MAX_COLS * MAX_ROWS);
export const _shadowCanvasState  = new Int32Array(MAX_COLS * MAX_ROWS);

// ГЛОБАЛЬНЫЙ DOD-РЕЕСТР СОСТОЯНИЯ ПРИБОРОВ (256 slots * 16 registers = 4096 cells)
export const _qnxHardwareRegistry = new Int32Array(4096);

// ПРЕАЛЛОЦИРОВАННАЯ БИНАРНАЯ КАРТА АДРЕСОВ АLТ-ФОКУСИРОВКИ (displayIndex -> slotId)
export const _qnxDisplayIndexToSlotMap = new Int32Array(10);

// =================================================================
// 🏛️ СЕМАНТИЧЕСКИЙ ПАСПОРТ СТРАЙДА ПРИБОРА (OFFSETS REGISTERS)
// =================================================================
export const REG_X             = 0;  // Глобальная координата X окна
export const REG_Y             = 1;  // Глобальная координата Y окна
export const REG_W             = 2;  // Физическая ширина прибора
export const REG_H             = 3;  // Физическая высота прибора
export const REG_FOCUS         = 4;  // Флаг активного фокуса ввода (1/0)
export const REG_ENABLED       = 5;  // Флаг аппаратного включения прибора (1/0)
export const REG_SCROLL_OFF    = 6;  // Вертикальный сдвиг вьюпорта (ScrollOffset)
export const REG_SELECTED_IDX  = 7;  // Индекс выбранной строки (курсор выделения)
export const REG_ACTIVE_TAB    = 8;  // Index выбранного ушка вкладки
export const REG_TOTAL_ITEMS   = 9;  // Фактическая емкость буфера (число файлов/тем)
export const REG_DISPLAY_IDX   = 10; // Порядковый номер displayIndex для Alt-фокусировки
export const REG_LAYOUT_WEIGHT = 13; // Процентная доля или фиксированный вес прибора (0-100)

// =================================================================
// 🚨 БИТОВАЯ КАРТА hardware_initialization_lock (Ready-Mask / HotSwap)
// =================================================================
export const REG_CORE_READY_MASK = 2; // Системный регистр маски затвора в Слоте 0
export const REG_CORE_BOOT_STAGE = 3; // 🔥 УТВЕРЖДЕНО: Системный регистр пошагового трекера загрузки в Слоте 0

// Контур А: Системный обвес (Биты 0 - 2)
export const CORE_BIT_RESIZE     = 1 << 0; // 0x01 : Геометрия ConPTY рассчитана (Слот 0 ресайзнут)
export const CORE_BIT_STDIN      = 1 << 1; // 0x02 : ISR-драйвер ввода TTY готов и resume'нут
export const CORE_BIT_CLOCK      = 1 << 2; // 0x04 : Generator тактовых импульсов (60Hz) взведен

// Контур Б: Фоновые воркеры и данные (Биты 3 - 4)
export const CORE_BIT_VFS_INIT   = 1 << 3; // 0x08 : Первичная VFS-индексация каталогов выполнена
export const CORE_BIT_THEMES     = 1 << 4; // 0x10 : Векторизация палитры themes.json воркером завершена

// Контур В: Реестр приборов к HotSwap-замене (Биты 5 - 12)
export const CORE_BIT_SLOT_101   = 1 << 5; // 0x20 : Дашборд полностью готов
export const CORE_BIT_SLOT_102   = 1 << 6; // 0x40 : Левый Проводник готов
export const CORE_BIT_SLOT_103   = 1 << 7; // 0x80 : Правый Проводник готов
export const CORE_BIT_SLOT_104   = 1 << 8; // 0x0100 : Функциональная панель F1-F10 готова
export const CORE_BIT_SLOT_105   = 1 << 9; // 0x0200 : Командная строка готова
export const CORE_BIT_SLOT_106   = 1 << 10; // 0x0400 : Сайдбар тем готов
export const CORE_BIT_SLOT_108   = 1 << 11; // 0x0800 : Системный Логгер готов
export const CORE_BIT_SLOT_110   = 1 << 12; // 0x1000 : Просмотрщик файлов (Viewers) готов

// 🔥 ЦЕЛЕВАЯ МАСКА ХОЛОДНОГО ПУСКА (0x01 | 0x08 | 0x10 = 0x19, или 25 в десятичной СМО)
export const CORE_READY_TARGET   = CORE_BIT_RESIZE | CORE_BIT_VFS_INIT | CORE_BIT_THEMES;

// =================================================================
// 📡 БИНАРНАЯ КАРТА АДРЕСОВ СЕГМЕНТОВ VFS (MEMORY MAP)
// =================================================================
export const VFS_STRIDE_BYTES    = 64;    
export const VFS_SLOT_CAPACITY   = 500;   
export const VFS_L_BASE_BYTE     = 0;     
export const VFS_R_BASE_BYTE     = 32000; 

// =================================================================
// 📝 ПРЕАЛЛОЦИРОВАННЫЙ ТЕКСТОВЫЙ БУФЕР ПРОСМОТРА MARKDOWN/TEXT (64 KB)
// =================================================================
export const _qnxStaticTextViewerBuffer = new Uint8Array(64 * 1024);

// =================================================================
// 🎨 ДИНАМИЧЕСКИЙ РЕАКТИВНЫЙ КОНТУР ТЕМ ОФОРМЛЕНИЯ
// =================================================================
export const THEME_STRIDE_BYTES  = 34; 

export const _qnxActiveThemesRegistryContainer = {
    buffer: null
};

export function getDynamicThemeActiveColor(themeIdx) {
    const buf = _qnxActiveThemesRegistryContainer.buffer;
    if (buf === null) return 51; 
    return buf[(themeIdx * 34) + 32] | 0;
}

export function getDynamicThemePassiveColor(themeIdx) {
    const buf = _qnxActiveThemesRegistryContainer.buffer;
    if (buf === null) return 242; 
    return buf[(themeIdx * 34) + 33] | 0;
}

export function packCellBits(charCode, fg, bg) {
    return ((charCode & 0xFFFF) << 16) | ((fg & 0xFF) << 8) | (bg & 0xFF);
}

Object.preventExtensions(_qnxActiveThemesRegistryContainer);
Object.preventExtensions(_virtualCanvasState);
Object.preventExtensions(_shadowCanvasState);
Object.preventExtensions(_qnxHardwareRegistry);
Object.preventExtensions(_qnxDisplayIndexToSlotMap);

// TIMESTAMP: 2026-09-27 14:49:10
// PATH: c:\slotcmp_5\V\src\core\qnx\shared_state.js
