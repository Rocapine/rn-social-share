"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/react/useScreenshotTrigger.ts
var useScreenshotTrigger_exports = {};
__export(useScreenshotTrigger_exports, {
  useScreenshotTrigger: () => useScreenshotTrigger
});
module.exports = __toCommonJS(useScreenshotTrigger_exports);
var import_react = require("react");

// src/react/screenshotDebounce.ts
var SCREENSHOT_DEBOUNCE_MS = 1e3;
function shouldHandleScreenshot(lastHandledAt, now, windowMs = SCREENSHOT_DEBOUNCE_MS) {
  if (lastHandledAt === null) {
    return true;
  }
  return now - lastHandledAt >= windowMs;
}
function createScreenshotGate(windowMs = SCREENSHOT_DEBOUNCE_MS) {
  let lastHandledAt = null;
  return function tryHandleScreenshot(now) {
    if (shouldHandleScreenshot(lastHandledAt, now, windowMs)) {
      lastHandledAt = now;
      return true;
    }
    return false;
  };
}
var screenshotGate = createScreenshotGate();

// src/react/useScreenshotTrigger.ts
function useScreenshotTrigger(enabled, onScreenshot) {
  const onScreenshotRef = (0, import_react.useRef)(onScreenshot);
  onScreenshotRef.current = onScreenshot;
  (0, import_react.useEffect)(
    function subscribeToScreenshots() {
      if (!enabled) {
        return;
      }
      let subscription;
      try {
        const { addScreenshotListener } = require("expo-screen-capture");
        subscription = addScreenshotListener(() => {
          if (screenshotGate(Date.now())) {
            onScreenshotRef.current();
          }
        });
      } catch {
      }
      return () => subscription?.remove();
    },
    [enabled]
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  useScreenshotTrigger
});
//# sourceMappingURL=screenshotTrigger.js.map