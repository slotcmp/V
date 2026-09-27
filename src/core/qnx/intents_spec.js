/**
 * @file src/core/qnx/intents_spec.js
 * @version 1.1.0-RELEASE-QNX-HOTSWAP-INTENTS
 * @description Каноническая бинарная спецификация HEX-кодов интентов и прерываний шины.
 * ИСПРАВЛЕНО: Интегрированы прерывания горячей замены модулей BI_HOT_LOAD и BI_HOT_UNLOAD.
 * СТРОГИЙ КОНТРАКТ: 0% try/catch, только плоские неизменяемые HEX-числа.
 */

export const ix = {
    // Системные аппаратно-зависимые прерывания (0x00A2 - 0x0100)
    SYS_RESIZE: 0x00A2,   
    SYS_RENDER: 0x00B5,   

    // Прерывания мышиного ввода и ротации Window Manager (0x0101 - 0x0200)
    STACK_SET:        0x011A,   
    BI_INJECT_VFS:    0x011C, 
    BI_INJECT_THEMES: 0x011D, // Асинхронный инжект динамических тем из воркера
    BI_HOT_LOAD:      0x011E, // 🔥 УТВЕРЖДЕНО: Горячее включение прибора в реальном времени (Hot-Plug)
    BI_HOT_UNLOAD:    0x011F, // 🔥 УТВЕРЖДЕНО: Горячее выключение прибора в реальном времени (Hot-Unload)
    
    // Прерывания клавиатурного ввода (0x0201 - 0x0303)
    KBD_ENTER:  0x020A,   
    KBD_UP:     0x0215,   
    KBD_DOWN:   0x0216    
};

// Запечатываем бинарную карту интентов в куче V8 TurboFan
Object.freeze(ix);
Object.preventExtensions(ix);
