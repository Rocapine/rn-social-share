import { C as CreateSharerOptions, a as Sharer, S as ShareChannel, b as SharePayload, c as ShareOutcome } from './types-guoVqHi2.js';
export { d as ShareEvent } from './types-guoVqHi2.js';
import * as react from 'react';
import { RefObject } from 'react';
import { View } from 'react-native';

type CaptureOptions = {
    /**
     * Branded file name (with extension) the captured image is copied to, so every
     * consumer — the share sheet, an SMS attachment, TikTok, the saved photo — shows a
     * clean name (e.g. "unchaind-invite.png") instead of view-shot's random UUID.
     */
    fileName: string;
    /** Output width in px. Default 1080 (story resolution at 3× of a 360pt card). */
    width?: number;
    /** Output height in px. Default 1920. */
    height?: number;
    /**
     * Image format. Default "png". Prefer "jpg" for an opaque card: iOS renders the
     * snapshot at 16 bits per channel, so a 1080×1920 PNG weighs ~9 MB there, a JPEG ~0.3 MB.
     */
    format?: "png" | "jpg";
    /** 0..1. Default 1. */
    quality?: number;
    /** Called with the underlying error if capture fails (the function still resolves undefined). */
    onError?: (error: unknown) => void;
};
/**
 * Captures an off-screen view (via its ref) to an image file at story resolution, then
 * copies it to a branded file name. Returns the file URI, or `undefined` on failure so
 * callers can fall back to a text-only share.
 *
 * This is the single, deduplicated version of the capture logic both apps had copied
 * verbatim. Extracted as a plain async function so it is testable without rendering.
 *
 * Note (ROC-2883): view-shot must not run until every async image in the card has
 * painted, or a late-loading image is absent from the file. Coordinate readiness with
 * `areAllImagesLoaded` before calling this.
 */
declare function captureCardImage(ref: RefObject<unknown>, options: CaptureOptions): Promise<string | undefined>;

/**
 * Builds a sharer from a list of channels. This is the abstraction layer between the app
 * and react-native-share / the OpenSDKs: the app only ever calls `sharer.share(id, payload)`
 * and adds/removes channels by editing the `channels` array.
 *
 * Routing per share:
 *   1. Emit `share_started`.
 *   2. Unknown id, or `isAvailable()` false/throws → `share_unavailable`, route to fallback.
 *   3. `share()` throws → `share_failed`, route to fallback.
 *   4. Emit `share_completed` with the channel that actually handled it.
 *
 * The fallback (default: the channel registered as "system-sheet") is never used to route
 * back into itself, so a missing/failed fallback yields a non-completed outcome instead of
 * looping.
 */
declare function createSharer(options: CreateSharerOptions): Sharer;

/**
 * The generic native share sheet. Always available, so it doubles as the default fallback
 * (register it with the default id "system-sheet" to have `createSharer` pick it up).
 */
declare const systemSheet: (options?: {
    id?: string;
}) => ShareChannel;

/**
 * WhatsApp — intentionally routed through the system share sheet. iOS has no reliable
 * direct deep link that carries the full text AND an image: both `whatsapp://send?text=`
 * and `wa.me` drop everything but the URL on real devices, and RNShare's WhatsApp-text
 * path builds an invalid URL (literal spaces). The share sheet's WhatsApp extension is the
 * only dependable path. `isAvailable` still probes for the app so the UI can hide the
 * button when WhatsApp isn't installed.
 *
 * iOS: requires `whatsapp` in LSApplicationQueriesSchemes (see `withSocialShare`).
 */
declare const whatsapp: (options?: {
    id?: string;
}) => ShareChannel;

/**
 * Instagram Stories with the captured image as the full-bleed background.
 *
 * `appId` is required and app-specific — it is the Facebook/Meta App ID tied to your app
 * (mandatory for the Stories deep link since Jan 2023). Pass your own; the two apps that
 * seeded this package use different ids.
 *
 * iOS: requires `instagram-stories` in LSApplicationQueriesSchemes (see `withSocialShare`)
 * for `isAvailable` to detect Instagram. When unavailable, `createSharer` routes to the
 * fallback channel.
 */
declare const instagramStories: (options: {
    appId: string;
    id?: string;
}) => ShareChannel;

/**
 * Native SMS/Messages composer with the full text body and the card image attached.
 * `isAvailable` is optimistic (true); a device without SMS makes `shareSingle` throw, and
 * `createSharer` then routes to the fallback channel.
 */
declare const sms: (options?: {
    id?: string;
}) => ShareChannel;

/**
 * Opens the native OS share sheet with the image + caption + branded file name. Shared by
 * the `systemSheet` and `whatsapp` channels and used as the TikTok fallback. With
 * `failOnCancel: false`, a user cancel resolves (with `dismissedAction`) instead of throwing.
 */
declare function openSystemShareSheet(payload: SharePayload, channelId: string): Promise<ShareOutcome>;

/**
 * Headless capture hook: gives you a `ref` to attach to your off-screen card view and a
 * `capture()` that renders it to a branded image file (or `undefined` on failure).
 *
 * The card visual itself stays in the app — the package only captures whatever you point
 * the ref at. Render the card off-screen (e.g. `position: "absolute", left: -10000`) and
 * gate `capture()` on `areAllImagesLoaded` if the card has async images.
 *
 * Need two variants (e.g. rounded for the sheet, square full-bleed for Stories)? Call this
 * hook twice, or call `captureCardImage` directly with each ref.
 */
declare function useShareCard(options: CaptureOptions): {
    ref: react.RefObject<View | null>;
    capture: () => Promise<string | undefined>;
};

/**
 * A shareable card often contains several asynchronously-loaded images (a fruit
 * illustration, a logo…). view-shot must not capture until every one has painted, or an
 * image that loads after the capture fires is absent from the file. This was ROC-2883: the
 * capture only awaited one image, so the logo was frequently missing from the export.
 *
 * Track loaded keys in a Set as each `<Image onLoad>` fires, then gate the capture on
 * `areAllImagesLoaded(loaded, REQUIRED_KEYS)`.
 */
declare function areAllImagesLoaded(loaded: ReadonlySet<string>, required: readonly string[]): boolean;

declare const SCREENSHOT_DEBOUNCE_MS = 1000;
declare function shouldHandleScreenshot(lastHandledAt: number | null, now: number, windowMs?: number): boolean;
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
declare function createScreenshotGate(windowMs?: number): (now: number) => boolean;
/** Single app-wide screenshot gate shared by every `useScreenshotTrigger`. */
declare const screenshotGate: (now: number) => boolean;

export { type CaptureOptions, CreateSharerOptions, SCREENSHOT_DEBOUNCE_MS, ShareChannel, ShareOutcome, SharePayload, Sharer, areAllImagesLoaded, captureCardImage, createScreenshotGate, createSharer, instagramStories, openSystemShareSheet, screenshotGate, shouldHandleScreenshot, sms, systemSheet, useShareCard, whatsapp };
