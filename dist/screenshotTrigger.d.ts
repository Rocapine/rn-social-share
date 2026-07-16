/**
 * Calls `onScreenshot` when the user takes a screenshot, while `enabled` is true — the
 * "share on screenshot" trigger from the Expo Marathon pattern. Dedup is enforced by a
 * shared, app-wide gate so one screenshot fires at most one handler even when iOS
 * double-fires or several instances are mounted (ROC-2854).
 *
 * No-ops silently where screenshot detection is unavailable (iOS supported; Android only
 * API 34+) or when `expo-screen-capture` isn't installed — the lazy require keeps that
 * dependency optional, and an explicit share button remains the fallback.
 */
declare function useScreenshotTrigger(enabled: boolean, onScreenshot: () => void): void;

export { useScreenshotTrigger };
