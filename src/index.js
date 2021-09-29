import { Library, Callback, CIF } from "ffi-napi";

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
    const filteredList = getWindowList().filter((x) => x.title.includes(name));
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
    getCursorPosition,
    getPixelColor,
    restoreWindow,
    maximizeWindow,
    minimizeWindow,
    moveWindow,
};
