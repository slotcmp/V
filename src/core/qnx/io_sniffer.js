/**
 * @file src/core/qnx/io_sniffer.js
 * @version 1.0.1-RELEASE-QNX-STRICT-SNIFFER-PURE
 * @description Стерильный DOD-сниффер входящего TTY-потока и FIFO-интентов шины ядра.
 * ИСПРАВЛЕНО: Ликвидировано повторное объявление идентификаторов. Интегрирован fs.fsyncSync.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, 100% синхронный I/O.
 */

import fs from "node:fs";
import pathNode from "node:path";

let _snifferFileDescriptor = -1;

/**
 * Холодное зажигание сниффера: открывает лог-файл в режиме перезаписи
 */
export function initializeIoSnifferDefaults() {
    const logPath = pathNode.resolve(process.cwd(), "./qnx_io_dump.log");
    _snifferFileDescriptor = fs.openSync(logPath, "w");
    
    const headerStr = `================================================================\n[QNX INT32 KERNEL IO SNIFFER ACTIVE] Start Timestamp: ${new Date().toISOString()}\n================================================================\n\n`;
    fs.writeSync(_snifferFileDescriptor, headerStr);
    fs.fsyncSync(_snifferFileDescriptor);
}

/**
 * Синхронно логирует сырую входящую пачку байт мыши/клавиатуры из stdin
 */
export function snifferLogRawTtyInput(buf) {
    if (_snifferFileDescriptor === -1) return;

    const len = buf.length | 0;
    fs.writeSync(_snifferFileDescriptor, `\n[STDIN_INPUT_PACKET] Bytes Received: ${len} | Raw: `);

    let hexAccumulatorStr = "";
    for (let i = 0; i < len; i = (i + 1) | 0) {
        hexAccumulatorStr += buf[i].toString(16).toUpperCase().padStart(2, "0") + " ";
    }
    fs.writeSync(_snifferFileDescriptor, hexAccumulatorStr + "\n");
    fs.fsyncSync(_snifferFileDescriptor);
}

/**
 * Наносекундный перехватчик FIFO-сигналов, пролетающих через кольцевую шину
 */
export function snifferLogBusIntent(targetSlot, originSlot, signalId, payload) {
    
    if (_snifferFileDescriptor === -1) return;

    const logEntryStr = `  ├── [BUS_INTENT] 0x${signalId.toString(16).toUpperCase().padStart(4, "0")} | TargetSlot: ${targetSlot} | OriginSlot: ${originSlot} | Payload: ${payload}\n`;
    fs.writeSync(_snifferFileDescriptor, logEntryStr);
    fs.fsyncSync(_snifferFileDescriptor);
}

/**
 * Логирует факт и размер физического флешинга кадра в TTY
 */
export function snifferLogTtyFlush(bytesCount) {
    if (_snifferFileDescriptor === -1) return;
    fs.writeSync(_snifferFileDescriptor, `  └── [TTY_FLUSH_FRAME] Physical Buffer Sent to stdout: ${bytesCount} bytes\n`);
    fs.fsyncSync(_snifferFileDescriptor);
}
