export const SCREENSHOT_DEBOUNCE_MS = 1000;

export function shouldHandleScreenshot(
  lastHandledAt: number | null,
  now: number,
  windowMs: number = SCREENSHOT_DEBOUNCE_MS,
): boolean {
  if (lastHandledAt === null) {
    return true;
  }
  return now - lastHandledAt >= windowMs;
}

/**
 * A screenshot is a single OS-wide event, but one screenshot can reach a handler more than
 * once: iOS double-fires the notification, and release builds can mount more than one
 * `useScreenshotTrigger` instance (ROC-2854). A per-instance debounce can't dedupe across
 * instances. This gate holds the last-handled timestamp so that, no matter how many callers
 * react to the same screenshot, `gate(now)` returns `true` at most once per `windowMs`.
 *
 * The hook uses a single shared gate (`screenshotGate`); the factory exists so tests (and
 * apps that want isolation) get their own instance.
 */
export function createScreenshotGate(windowMs: number = SCREENSHOT_DEBOUNCE_MS) {
  let lastHandledAt: number | null = null;
  return function tryHandleScreenshot(now: number): boolean {
    if (shouldHandleScreenshot(lastHandledAt, now, windowMs)) {
      lastHandledAt = now;
      return true;
    }
    return false;
  };
}

/** Single app-wide screenshot gate shared by every `useScreenshotTrigger`. */
export const screenshotGate = createScreenshotGate();
