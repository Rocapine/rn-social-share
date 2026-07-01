import * as react from 'react';
import { RefObject } from 'react';
import { View } from 'react-native';

/**
 * The data a share can carry. Every field is optional so a channel can pick what it
 * understands: `copyLink` only needs `link`, `instagramStories` only needs `imageUri`,
 * the system sheet uses all of them.
 */
type SharePayload = {
    /** Local file URI of the image to share (PNG). Produced by `captureCardImage`. */
    imageUri?: string;
    /** Text caption / body. */
    message?: string;
    /** A URL to share or copy. */
    link?: string;
    /** File name (no extension needed) the OS share sheet shows for the attachment. */
    fileName?: string;
};
/** Result of a share attempt. Best-effort: some channels cannot know if the user completed. */
type ShareOutcome = {
    /** Whether the flow was completed as far as we can tell (false = dismissed/denied). */
    completed: boolean;
    /** The channel id that ultimately handled the share (may differ from the requested one). */
    channel: string;
    /** True when the requested channel was unavailable/failed and we routed to the fallback. */
    fellBack?: boolean;
    /** For the system sheet: which app the OS reported handling the share, if any. */
    targetApp?: string | null;
    /** For `saveToLibrary`: the OS denied photo-library permission. */
    permissionDenied?: boolean;
};
/**
 * A single share destination. Implement this to add a new channel — that is the whole
 * extension surface. Register instances with `createSharer({ channels: [...] })`.
 */
type ShareChannel = {
    /** Stable identifier, e.g. "instagram", "tiktok", "system-sheet". */
    readonly id: string;
    /** Can this channel currently handle the payload (app installed, image present…)? */
    isAvailable(payload: SharePayload): Promise<boolean>;
    /** Perform the share. Resolve with the outcome; throw only on unexpected errors. */
    share(payload: SharePayload): Promise<ShareOutcome>;
};
/** Events emitted by the sharer so the host app can wire its own analytics/logging. */
type ShareEvent = {
    type: "share_started";
    channel: string;
    hasImage: boolean;
} | {
    type: "share_completed";
    channel: string;
    fellBack: boolean;
    targetApp?: string | null;
} | {
    type: "share_unavailable";
    channel: string;
} | {
    type: "share_failed";
    channel: string;
    error: unknown;
};
type CreateSharerOptions = {
    /** Ordered list of channels. Order is preserved in `channelIds` for building UIs. */
    channels: ShareChannel[];
    /**
     * Channel id used when a requested channel is unavailable or throws.
     * Defaults to "system-sheet" when a channel with that id is registered.
     */
    fallbackChannelId?: string;
    /** Analytics / logging sink. Fire-and-forget — thrown errors here never break a share. */
    onEvent?: (event: ShareEvent) => void;
};
type Sharer = {
    /** Registered channel ids in registration order (handy for rendering a channel row). */
    readonly channelIds: string[];
    has(channelId: string): boolean;
    isAvailable(channelId: string, payload: SharePayload): Promise<boolean>;
    share(channelId: string, payload: SharePayload): Promise<ShareOutcome>;
};

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
    /** Image format. Default "png". */
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
 * Copies `payload.link` to the clipboard. Not a "share" in the OS sense, but modeled as a
 * channel so it slots into the same UI row and analytics funnel as everything else.
 *
 * `expo-clipboard` is a lazy require so importing the channel barrel never forces the
 * dependency on apps that don't use this channel.
 */
declare const copyLink: (options?: {
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

type TikTokChannelOptions = {
    id?: string;
    /** Called if the OpenSDK is missing or rejects (before falling back to the system sheet). */
    onError?: (error: unknown) => void;
};
/**
 * TikTok via `tiktok-opensdk-react-native`, fire-and-forget. Opening TikTok IS the action —
 * we never await the SDK's result promise because, with no AppDelegate callback wired, it
 * may never settle. We report `completed` optimistically once the share is kicked off; a
 * *real* rejection (e.g. TikTok not installed) still routes to the system sheet so the user
 * can share.
 *
 * The SDK is a lazy require and optional: if it isn't installed, this channel simply falls
 * back to the system sheet. Native setup (client key, FileProvider, package visibility)
 * lives in the app's own TikTok config plugin — see the README.
 *
 * API (tiktok-opensdk-react-native@0.10.x): default export
 *   TikTokOpenSDK.share(mediaPaths: string[], isImage?: boolean, isGreenScreen?: boolean)
 */
declare const tiktok: (options?: TikTokChannelOptions) => ShareChannel;

/**
 * Saves the image to the device photo library via `expo-media-library` (add-only / write
 * permission, which avoids needing a full photo-library read description on iOS). Returns
 * `{ completed: false, permissionDenied: true }` when the user denies access, so the host UI
 * can show an "open settings" prompt.
 *
 * `expo-media-library` is a lazy require and optional — only apps that register this channel
 * need it installed.
 */
declare const saveToLibrary: (options?: {
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

export { type CaptureOptions, type CreateSharerOptions, SCREENSHOT_DEBOUNCE_MS, type ShareChannel, type ShareEvent, type ShareOutcome, type SharePayload, type Sharer, type TikTokChannelOptions, areAllImagesLoaded, captureCardImage, copyLink, createScreenshotGate, createSharer, instagramStories, openSystemShareSheet, saveToLibrary, screenshotGate, shouldHandleScreenshot, sms, systemSheet, tiktok, useScreenshotTrigger, useShareCard, whatsapp };
