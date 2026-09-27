/**
 * @file test_themes_pipeline.js
 * @description Стерильный безаллокационный тест бинарного конвейера динамических тем.
 */

import fs from "node:fs";
import pathNode from "node:path";

function runDiagnosticTest() {
    console.log("=== ЗАПУСК ДИАГНОСТИКИ БИНАРНОГО КОНВЕЙЕРА ТЕМ ===");
    
    const targetPathStr = pathNode.resolve(process.cwd(), "./themes.json");
    console.log("1. Проверка физического наличия файла:", targetPathStr);
    
    if (!fs.existsSync(targetPathStr)) {
        console.error("❌ СБОЙ ШАГА 1: Файл themes.json отсутствует в корневой директории рантайма!");
        return;
    }
    console.log("✅ Шаг 1 пройден.");

    let rawData = "";
    try {
        rawData = fs.readFileSync(targetPathStr, "utf8");
        console.log(`2. Чтение файла успешно. Размер: ${rawData.length} байт.`);
    } catch(e) {
        console.error("❌ СБОЙ ШАГА 2: Операционная система заблокировала доступ к файлу!", e);
        return;
    }

    let themesArray = null;
    try {
        themesArray = JSON.parse(rawData);
        console.log(`3. Парсинг JSON успешен. Обнаружено тем: ${themesArray.length}`);
    } catch(e) {
        console.error("❌ СБОЙ ШАГА 3: Искажение синтаксиса JSON! Проверьте themes.json на лишние запятые или кодировку BOM.", e.message);
        return;
    }

    console.log("4. Сканирование структуры первой темы:");
    const first = themesArray[0];
    if (!first) {
        console.error("❌ СБОЙ ШАГА 4: Массив тем пуст.");
        return;
    }
    console.log(`   ├── id: ${first.id}`);
    console.log(`   ├── name: "${first.name}"`);
    console.log(`   ├── borderColorMsk: "${first.borderColorMsk}"`);
    console.log(`   └── passiveColorMsk: "${first.passiveColorMsk}"`);

    if (first.borderColorMsk === undefined || first.passiveColorMsk === undefined) {
        console.error("❌ СБОЙ ШАГА 4: Ошибка валидации схемы! Ключи в JSON не соответствуют borderColorMsk / passiveColorMsk.");
        return;
    }
    console.log("✅ Шаг 4 пройден.");

    // Симуляция хэш-сумматора
    console.log("5. Тестирование ASCII-сумматора для первой темы:");
    const activeColorStr = String(first.borderColorMsk);
    let hashAccumulator = 0;
    for (let i = 0; i < activeColorStr.length; i++) {
        let charCode = activeColorStr.charCodeAt(i);
        if (charCode >= 0x41 && charCode <= 0x5A) charCode += 32;
        hashAccumulator += charCode;
    }
    console.log(`   ├── Вычисленный хэш строки "${activeColorStr}": ${hashAccumulator}`);
    
    let xtermCode = 242;
    switch (hashAccumulator) {
        case 435: xtermCode = 244; break; // gray
        case 853: xtermCode = 237; break; // darkgray
        case 424: xtermCode = 33;  break; // blue
        case 446: xtermCode = 19;  break; // navy
        case 664: xtermCode = 129; break; // purple
        case 543: xtermCode = 100; break; // olive
        case 509: xtermCode = 0;   break; // black
        case 652: xtermCode = 124; break; // maroon
        case 529: xtermCode = 34;  break; // green
        case 422: xtermCode = 214; break; // gold
        case 427: xtermCode = 39;  break; // cyan
    }
    console.log(`   └── Результирующий xterm-код: ${xtermCode} (Ожидалось отличное от 242 для валидных цветов)`);
    if (xtermCode === 242) {
        console.warn("⚠️ ПРЕДУПРЕЖДЕНИЕ: Сумматор выдал дефолтный цвет. Проверьте отсутствие скрытых пробелов в строке цвета.");
    }
    console.log("✅ ТЕСТ ЗАВЕРШЕН. СТРУКТУРНЫХ АВАРИЙ В ЛОГИКЕ НЕ ОБНАРУЖЕНО.");
}

runDiagnosticTest();
