/**
 * @file src/core/qnx/shared_state.js
 * @version 1.8.0-RELEASE-QNX-STRICT-GEOMETRIC-REGISTERS
 * @description Аппаратная карта ОЗУ. Интегрированы семантические регистры REG_SIZE_TYPE (14) и REG_SIZE_VALUE (15).
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 0% хардкода COLS/ROWS, 100% Zero Allocation.
 */

export const MAX_COLS = 256;
export const MAX_ROWS = 100;

export const _virtualCanvasState = new Int32Array(MAX_COLS * MAX_ROWS);
export const _shadowCanvasState  = new Int32Array(MAX_COLS * MAX_ROWS);

// ГЛОБАЛЬНЫЙ DOD-РЕЕСТР СОСТОЯНИЯ ПРИБОРОВ (256 slots * 16 registers = 4096 cells)
export const _qnxHardwareRegistry = new Int32Array(4096);

export const _qnxDisplayIndexToSlotMap = new Int32Array(10);

// =================================================================
// 🏛️ СЕМАНТИЧЕСКИЙ ПАСПОРТ СТРАЙДА ПРИБОРА (OFFSETS REGISTERS)
// =================================================================
export const REG_X             = 0;  
export const REG_Y             = 1;  
export const REG_W             = 2;  
export const REG_H             = 3;  
export const REG_FOCUS         = 4;  
export const REG_ENABLED       = 5;  
export const REG_SCROLL_OFF    = 6;  
export const REG_SELECTED_IDX  = 7;  
export const REG_ACTIVE_TAB    = 8;  
export const REG_TOTAL_ITEMS   = 9;  
export const REG_DISPLAY_IDX   = 10; 
export const REG_LAYOUT_WEIGHT = 13; 

// 🔥 УТВЕРЖДЕНО: Семантические регистры декларативного Window Manager
export const REG_SIZE_TYPE     = 14; // 0 - фиксированные строки, 1 - процентный вес (%)
export const REG_SIZE_VALUE    = 15; // Прямое числовое значение размера или веса

export const REG_CORE_READY_MASK = 2; 
export const REG_CORE_BOOT_STAGE = 3; 

export const CORE_BIT_RESIZE     = 1 << 0; 
export const CORE_BIT_STDIN      = 1 << 1; 
export const CORE_BIT_CLOCK      = 1 << 2; 

export const CORE_BIT_VFS_INIT   = 1 << 3; 
export const CORE_BIT_THEMES     = 1 << 4; 

export const CORE_BIT_SLOT_101   = 1 << 5; 
export const CORE_BIT_SLOT_102   = 1 << 6; 
export const CORE_BIT_SLOT_103   = 1 << 7; 
export const CORE_BIT_SLOT_104   = 1 << 8; 
export const CORE_BIT_SLOT_105   = 1 << 9; 
export const CORE_BIT_SLOT_106   = 1 << 10; 
export const CORE_BIT_SLOT_108   = 1 << 11; 
export const CORE_BIT_SLOT_110   = 1 << 12; 

export const CORE_READY_TARGET   = CORE_BIT_RESIZE | CORE_BIT_VFS_INIT | CORE_BIT_THEMES;

export const VFS_STRIDE_BYTES    = 64;    
export const VFS_SLOT_CAPACITY   = 500;   
export const VFS_L_BASE_BYTE     = 0;     
export const VFS_R_BASE_BYTE     = 32000; 

export const _qnxStaticTextViewerBuffer = new Uint8Array(64 * 1024);

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

// TIMESTAMP: 2026-09-27 21:26:40
// PATH: c:\slotcmp_5\V\src\core\qnx\shared_state.js
