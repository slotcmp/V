/**
 * @file src/modules/fnbar/fnbar_mdl.js
 * @version 7.1.2-RELEASE-QNX-STRICT-DOD
 * @description Мономорфная анемичная модель Функциональной панели (Слот 104) на параллельных массивах.
 * СТРОГИЙ КОНТРАКТ: 1-based индексация клавиш (размер 11), 0% try/catch.
 */

// Каноническая матрица ярлыков, где индекс элемента равен номеру функциональной клавиши
export const _STATIC_FN_MATRIX = [
    // 0: DEFAULT
    ["", "Help", "Menu", "View", "Edit", "Copy", "RenMov", "MkDir", "Delete", "Conf", "Exit"],
    // 1: CTRL
    ["", "Left", "Right", "Ver", "Edit", "Print", "Link", "Find", "History", "Video", "Tree"],
    // 2: SHIFT
    ["", "Help", "User", "Cmd", "Arch", "Copy", "RenMov", "MkDir", "Delete", "Save", "Last"],
    // 3: ALT
    ["", "Left", "Right", "View", "Hex", "Pack", "Unpack", "Find", "History", "Video", "Tree"]
];

Object.preventExtensions(_STATIC_FN_MATRIX[0]);
Object.preventExtensions(_STATIC_FN_MATRIX[1]);
Object.preventExtensions(_STATIC_FN_MATRIX[2]);
Object.preventExtensions(_STATIC_FN_MATRIX[3]);
