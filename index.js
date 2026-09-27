/**
 * @file index.js
 * @version 1.7.4-RELEASE-QNX-MAM-INTERPOLATION-FIXED
 * @description Входная точка рантайма. ИСПРАВЛЕНО: Ликвидирована ошибка экранирования строк бандлера воркера.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch в рантайме, 100% асинхронный предстартовый бандлинг модулей.
 */

import fs from "node:fs";
import { execSync } from "node:child_process";
import { Worker } from "node:worker_threads";
import pathNode from "node:path";
import { _qnxHardwareRegistry, _qnxActiveThemesRegistryContainer, _qnxStaticTextViewerBuffer } from "./src/core/qnx/shared_state.js";
import { msg_send_qnx, executeKernelReactiveTick, dispatchHardwareClockPulse } from "./src/core/qnx/ipc_bus.js";
import { ix } from "./src/core/qnx/intents_spec.js";
import { initializeHardwareRegistryDefaults, performSynchronousVfsInject } from "./src/core/qnx/vfs_initializer.js";
import { processHardwareKeyboardStream } from "./src/core/qnx/kbd_driver.js";
import { initializeIoSnifferDefaults } from "./src/core/qnx/io_sniffer.js";

// Форсируем загрузку вьюшек для автоматического налива таблицы диспетчеризации (Self-Registration)
import "./src/views/explorer_view.js";
import "./src/views/viewer_view.js";

export let _globalVfsWorkerLinkBypass = null;

async function bootstrapMonolithicRuntime() {
    if (process.stdout && process.stdout.isTTY) {
        process.stdout.write("\x1b[?1049h\x1b[?1000h\x1b[?1006h\x1b[?25h"); 
    }
    execSync("chcp 65001", { stdio: "ignore" });

    initializeIoSnifferDefaults();
    initializeHardwareRegistryDefaults();
    performSynchronousVfsInject(102, "./");
    performSynchronousVfsInject(103, "./src");

    const initCols = Math.max(40, process.stdout.columns || 120); 
    const initRows = Math.max(10, process.stdout.rows || 30); 
    const packedGeo = (initCols & 0xFFFF) | ((initRows & 0xFFFF) << 16); 
    
    msg_send_qnx(9, 0, ix.SYS_RESIZE, packedGeo); 
    msg_send_qnx(1, 0, ix.SYS_RENDER, 0);
    
    executeKernelReactiveTick();
    dispatchHardwareClockPulse();

    const rootPathStr = pathNode.resolve(process.cwd());

    const spaceThemePath = pathNode.join(rootPathStr, "./src/workers/spaces/theme_space.js");
    const spaceTextPath  = pathNode.join(rootPathStr, "./src/workers/spaces/text_space.js");
    const spaceVfsPath   = pathNode.join(rootPathStr, "./src/workers/spaces/vfs_space.js");

    let [codeTheme, codeText, codeVfs] = await Promise.all([
        fs.promises.readFile(spaceThemePath, "utf8"),
        fs.promises.readFile(spaceTextPath, "utf8"),
        fs.promises.readFile(spaceVfsPath, "utf8")
    ]);

    const cleanImportRegex = /import\s+[\s\S]*?from\s+["']node:(fs|path)["'];?/g;
    codeTheme = codeTheme.replace(cleanImportRegex, "");
    codeText  = codeText.replace(cleanImportRegex, "");
    codeVfs   = codeVfs.replace(cleanImportRegex, "");

    // 🔥 ИСПРАВЛЕНО: Бэкслеши убраны. Шаблоны переменных раскрываются корректно на этапе композиции
    const monolithicWorkerBundleCode = `
        import fs from "node:fs";
        import pathNode from "node:path";
        import { parentPort, workerData } from "node:worker_threads";

        ${codeTheme}
        ${codeText}
        ${codeVfs}
        
        let _qnxStaticVfsBytesBuffer = new Uint8Array(64 * 1000);
        let _qnxStaticTextViewerBuffer = new Uint8Array(64 * 1024);
        const EXPLORER_L_SLOT = 102;
        const BI_INJECT_VFS   = 0x011C; 
        const BI_INJECT_THEMES = 0x011D; 
        const BI_INJECT_TEXT   = 0x011E; 

        process.on("uncaughtException", (err) => {
            if (parentPort) parentPort.postMessage((0xDEAD << 16) | 0x0911);
            process.exit(1);
        });

        if (parentPort) {
            parentPort.on("message", (task) => {
                if (!task) return;
                if (task === 0x011D || (typeof task === "object" && task.trigger === 0x011D)) {
                    processThemeSpaceQuantum(workerData, parentPort, BI_INJECT_THEMES);
                    return;
                }
                if (typeof task === "object" && task.trigger === 0x011E) {
                    if (_qnxStaticTextViewerBuffer.byteLength === 0) _qnxStaticTextViewerBuffer = new Uint8Array(64 * 1024);
                    processTextSpaceQuantum(task, workerData, parentPort, _qnxStaticTextViewerBuffer, BI_INJECT_TEXT);
                    return;
                }
                if (_qnxStaticVfsBytesBuffer.byteLength === 0) _qnxStaticVfsBytesBuffer = new Uint8Array(64 * 1000);
                processVfsSpaceQuantum(task, workerData, parentPort, _qnxStaticVfsBytesBuffer, BI_INJECT_VFS, EXPLORER_L_SLOT);
            });
        }
        if (parentPort) parentPort.postMessage(0x011D);
    `;

    const vfsWorker = new Worker(monolithicWorkerBundleCode, {
        eval: true,
        workerData: { rootPath: rootPathStr }
    });

    _globalVfsWorkerLinkBypass = vfsWorker;

    vfsWorker.on("message", (msg) => {
        if (!msg) return;

        if (msg === 0x011D) {
            vfsWorker.postMessage(0x011D); 
            return;
        }

        if (msg.signalId === 0x011C) {
            const slotIdNum = msg.metaBits & 0xFF;
            const slotMemoryBaseOffset = (slotIdNum === 102) ? 0 : 32000;
            globalThis._qnxActiveVfsSharedBufferBypass.set(msg.flatVfsBuffer, slotMemoryBaseOffset);
            msg_send_qnx(slotIdNum, 0, 0x011C, msg.metaBits);
            executeKernelReactiveTick();
            dispatchHardwareClockPulse();
        }

        if (msg.signalId === 0x011D) {
            _qnxActiveThemesRegistryContainer.buffer = msg.themesBuffer;
            msg_send_qnx(106, 0, 0x011D, msg.totalThemes | 0);
            executeKernelReactiveTick();
            dispatchHardwareClockPulse();
        }

        if (msg.signalId === 0x011E) {
            _qnxStaticTextViewerBuffer.set(msg.textBuffer);
            msg_send_qnx(110, 0, 0x011E, msg.totalLines | 0);
            executeKernelReactiveTick();
            dispatchHardwareClockPulse();
        }
    });

    const stdin = process.stdin;
    if (stdin) {
        if (typeof stdin.setRawMode === "function") stdin.setRawMode(true);
        stdin.resume();
        
        stdin.on("data", (buf) => {
            processHardwareKeyboardStream(buf);
            executeKernelReactiveTick();
            dispatchHardwareClockPulse();
        });

        stdin.on("end", () => { process.exit(0); });
    }

    if (process.stdout) {
        process.stdout.on("resize", () => {
            const cols = Math.max(40, process.stdout.columns || 120);
            const rows = Math.max(10, process.stdout.rows || 30);
            const reactivePackedGeo = (cols & 0xFFFF) | ((rows & 0xFFFF) << 16);
            
            msg_send_qnx(9, 0, ix.SYS_RESIZE, reactivePackedGeo);
            executeKernelReactiveTick();
            dispatchHardwareClockPulse();
        });
    }
}

bootstrapMonolithicRuntime();
