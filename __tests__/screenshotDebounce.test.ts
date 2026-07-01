import {
  createScreenshotGate,
  shouldHandleScreenshot,
  SCREENSHOT_DEBOUNCE_MS,
} from "../src/react/screenshotDebounce";

describe("shouldHandleScreenshot", () => {
  it("handles the first screenshot (no prior timestamp)", () => {
    expect(shouldHandleScreenshot(null, 1000)).toBe(true);
  });

  it("suppresses a second screenshot inside the window", () => {
    expect(shouldHandleScreenshot(1000, 1000 + SCREENSHOT_DEBOUNCE_MS - 1)).toBe(false);
  });

  it("allows a screenshot once the window has elapsed", () => {
    expect(shouldHandleScreenshot(1000, 1000 + SCREENSHOT_DEBOUNCE_MS)).toBe(true);
  });
});

describe("createScreenshotGate", () => {
  it("admits at most one call per window across callers", () => {
    const gate = createScreenshotGate(1000);
    // Two listeners react to the same OS screenshot at the same instant.
    expect(gate(5000)).toBe(true);
    expect(gate(5000)).toBe(false);
    // A genuinely new screenshot after the window is admitted again.
    expect(gate(6000)).toBe(true);
  });

  it("keeps separate instances independent", () => {
    const a = createScreenshotGate(1000);
    const b = createScreenshotGate(1000);
    expect(a(0)).toBe(true);
    expect(b(0)).toBe(true);
  });
});
