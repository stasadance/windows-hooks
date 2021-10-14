import { Library, Callback, CIF } from "ffi-napi";
import delay from "delay";

const user32 = new Library("user32", {
    GetDC: ["int", ["int"]],
    ReleaseDC: ["int", ["int", "int"]],
    EnumWindows: ["bool", ["pointer", "int"]],
    GetWindowTextA: ["int", ["int", "pointer", "int"]],
    GetWindowRect: ["bool", ["int", "pointer"]],
    ShowWindow: ["bool", ["int", "int"]],
    SetWindowPos: ["bool", ["int", "int", "int", "int", "int", "int", "uint8"]],
    GetSystemMetrics: ["int", ["int"]],
    GetCursorPos: ["bool", ["pointer"]],
    SetCursorPos: ["bool", ["int", "int"]],
    mouse_event: ["void", ["int", "int", "int", "int", "int"]],
    SendInput: ["int", ["int", "pointer", "int"]],
    GetKeyState: ["short", ["int"]],
    BlockInput: ["bool", ["bool"]],
});

const gdi32 = new Library("gdi32", {
    GetPixel: ["uint32", ["int", "int", "int"]],
});

function getWindowList() {
    const windowCallbackPointer = new Callback(
        "bool",
        ["long", "int"],
        windowHandleCallback
    );

    let list = [];
    function windowHandleCallback(handle, extraParam) {
        const maxTitleLength = 20;
        const stringBuffer = CIF("string", ["char"]);
        const result = user32.GetWindowTextA(
            handle,
            stringBuffer,
            maxTitleLength
        );

        if (result > 0) {
            const title = stringBuffer.readCString();
            list.push({ handle, title });
        }

        return true;
    }

    user32.EnumWindows(windowCallbackPointer, 0);
    return list;
}

function searchForWindowHandle(name) {
    const filteredList = getWindowList().filter((x) =>
        x.title.toLowerCase().includes(name.toLowerCase())
    );
    if (filteredList.length) {
        return filteredList[0].handle;
    } else {
        return;
    }
}

function getWindowPosition(handle) {
    if (handle == null) {
        return;
    }

    const rectBuffer = CIF("Object", ["long", "long", "long", "long"]);
    user32.GetWindowRect(handle, rectBuffer);
    const left = rectBuffer.readInt16LE(0);
    const top = rectBuffer.readInt16LE(4);
    const right = rectBuffer.readInt16LE(8);
    const bottom = rectBuffer.readInt16LE(12);
    const rect = {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
    };
    return rect;
}

function restoreWindow(handle) {
    if (handle == null) {
        return;
    }

    user32.ShowWindow(handle, 9);
}

function minimizeWindow(handle) {
    if (handle == null) {
        return;
    }

    user32.ShowWindow(handle, 6);
}

function maximizeWindow(handle) {
    if (handle == null) {
        return;
    }

    user32.ShowWindow(handle, 3);
}

function moveWindow(handle, x, y, width, height) {
    if (handle == null) {
        return;
    }

    user32.SetWindowPos(x.handle, 0, x, y, width, height, 0);
}

function getScreenDimensions() {
    const width = user32.GetSystemMetrics(0);
    const height = user32.GetSystemMetrics(1);

    return {
        width,
        height,
    };
}

function getCursorPosition() {
    const cursorBuffer = CIF("Object", ["long", "long"]);
    user32.GetCursorPos(cursorBuffer);
    const cursor = {
        x: cursorBuffer.readInt16LE(0),
        y: cursorBuffer.readInt16LE(4),
    };
    return cursor;
}

function setCursorPosition(x, y) {
    user32.SetCursorPos(x, y);
}

async function dragCursor(x1, y1, x2, y2) {
    user32.SetCursorPos(x1, y1);
    user32.mouse_event(0x0002, 0, 0, 0, 0);
    user32.SetCursorPos(x2, y2);
    await delay(10);
    user32.mouse_event(0x0004, 0, 0, 0, 0);
}

function leftClick(double) {
    user32.mouse_event(0x0002, 0, 0, 0, 0);
    user32.mouse_event(0x0004, 0, 0, 0, 0);

    if (double) {
        user32.mouse_event(0x0002, 0, 0, 0, 0);
        user32.mouse_event(0x0004, 0, 0, 0, 0);
    }
}

function rightClick() {
    user32.mouse_event(0x0008, 0, 0, 0, 0);
    user32.mouse_event(0x0010, 0, 0, 0, 0);
}

async function typeString(str, delayMs) {
    const strToType = str.toString();
    const caps = isCapsEnabled();
    for (let index in strToType) {
        if (
            (caps && strToType[index].toLowerCase() == strToType[index]) ||
            (!caps && strToType[index].toUpperCase() == strToType[index])
        ) {
            pressKeys(["shift", strToType[index]]);
        } else {
            pressKey(strToType[index]);
            pressKey(strToType[index], true);
        }

        if (delayMs) {
            await delay(delayMs);
        }
    }
}

async function pressKeys(keys, delayMs) {
    for (let i = 0; i < keys.length; i++) {
        pressKey(keys[i]);
        if (delayMs) {
            await delay(delayMs);
        }
    }
    for (let i = keys.length - 1; i >= 0; i--) {
        pressKey(keys[i], true);
        if (delayMs) {
            await delay(delayMs);
        }
    }
}

function pressKey(key, release) {
    const keyChar = key.toString().toLowerCase();
    const scanKeys =
        "**1234567890-=**qwertyuiop[]**asdfghjkl;'`*\\zxcvbnm,./".split("");

    let scanCode = 0;
    switch (keyChar) {
        case "enter":
            scanCode = 28;
            break;
        case "ctrl":
            scanCode = 29;
            break;
        case "shift":
            scanCode = 54;
            break;
        case "tab":
            scanCode = 15;
            break;
        case " ":
        case "space":
            scanCode = 57;
            break;
        case "back":
        case "backspace":
            scanCode = 14;
            break;
        case "delete":
            scanCode = 83;
            break;
        case "escape":
            scanCode = 1;
            break;
        case "caps":
        case "capslock":
            scanCode = 58;
            break;
        case "up":
            scanCode = 72;
            break;
        case "down":
            scanCode = 80;
            break;
        case "left":
            scanCode = 75;
            break;
        case "right":
            scanCode = 77;
            break;
        default:
            scanCode = scanKeys.indexOf(keyChar);
    }

    const inputBuffer = CIF("pointer", [
        "int",
        "int",
        "short",
        "short",
        "int",
        "int",
        "int64",
    ]);

    inputBuffer.writeInt32LE(1, 0);
    inputBuffer.writeInt32LE(0, 4);
    inputBuffer.writeInt16LE(0, 8);
    inputBuffer.writeInt16LE(scanCode, 10);
    inputBuffer.writeInt32LE(release ? 0x0008 | 0x0002 : 0x0008, 12);
    inputBuffer.writeInt32LE(0, 16);
    inputBuffer.writeInt64LE(0, 20);

    user32.SendInput(1, inputBuffer, 40);
}

function isCapsEnabled() {
    return user32.GetKeyState(0x14) == 1;
}

/**
 * Requires administrator
 */
function setInputEnabled(enabled) {
    user32.BlockInput(!enabled);
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function getPixelColor() {
    const cursor = getCursorPosition();
    const hdc = user32.GetDC(0);
    const pixel = gdi32.GetPixel(hdc, cursor.x, cursor.y);
    user32.ReleaseDC(0, hdc);
    const color = rgbToHex(
        pixel & 0x000000ff,
        (pixel & 0x0000ff00) >> 8,
        (pixel & 0x00ff0000) >> 16
    );
    return color;
}

export {
    searchForWindowHandle,
    getWindowList,
    getWindowPosition,
    getScreenDimensions,
    getPixelColor,
    getCursorPosition,
    setCursorPosition,
    isCapsEnabled,
    setInputEnabled,
    leftClick,
    rightClick,
    dragCursor,
    pressKey,
    pressKeys,
    typeString,
    restoreWindow,
    maximizeWindow,
    minimizeWindow,
    moveWindow,
};
