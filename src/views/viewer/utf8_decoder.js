/**
 * @file src/views/viewer/utf8_decoder.js
 * @version 1.0.5-RELEASE-QNX-TRIPLE-PASS-DECODER-STABLE
 * @description Анемичный конечный автомат побайтовой векторизации UTF-8 символов.
 * СТРОГИЙ КОНТРАКТ: 0% создания HeapNumber, 100% мономорфные целые числа Smi.
 */

const _utf8StateRegistry = new Int32Array(2); 

/**
 * Сбрасывает регистры конечного автомата UTF-8 в исходное состояние
 */
export function clearUtf8DecoderState() {
    _utf8StateRegistry[0] = 0;
    _utf8StateRegistry[1] = 0;
}

/**
 * Проталкивает один сырой байт через логические вентили UTF-8 декодера
 * 
 * @returns {number} Декодированный код символа, либо 0, если автомат ожидает следующие байты
 */
export function processUtf8QuantumByte(charByte) {
    const currentState = _utf8StateRegistry[0] | 0;
    
    if (currentState === 0) {
        if ((charByte & 0x80) === 0x00) {
            return charByte; 
        } else if ((charByte & 0xE0) === 0xC0) {
            _utf8StateRegistry[1] = (charByte & 0x1F) << 6;
            _utf8StateRegistry[0] = 1;
            return 0;
        } else if ((charByte & 0xF0) === 0xE0) {
            _utf8StateRegistry[1] = (charByte & 0x0F) << 12;
            _utf8StateRegistry[0] = 2;
            return 0;
        }
    } else if (currentState === 1) {
        const finalCharCode = _utf8StateRegistry[1] | (charByte & 0x3F);
        _utf8StateRegistry[0] = 0;
        return finalCharCode | 0;
    } else if (currentState === 2) {
        _utf8StateRegistry[1] |= (charByte & 0x3F) << 6;
        _utf8StateRegistry[0] = 1;
        return 0;
    }
    
    return 0;
}

// TIMESTAMP: 2026-09-27 18:41:40
// PATH: c:\slotcmp_5\V\src\views\viewer\utf8_decoder.js
