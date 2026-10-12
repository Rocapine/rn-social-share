import { cacheDirectory, copyAsync, deleteAsync } from "expo-file-system/legacy";
import type { RefObject } from "react";
import { PixelRatio, Platform } from "react-native";
import { captureRef } from "react-native-view-shot";

export type CaptureOptions = {
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
export async function captureCardImage(
  ref: RefObject<unknown>,
  options: CaptureOptions,
): Promise<string | undefined> {
  const { fileName, width = 1080, height = 1920, format = "png", quality = 1, onError } = options;
  try {
    // view-shot's temp file is managed and can't be moved reliably — copy it instead.
    // view-shot reads width/height as points on iOS (rendered at the device scale) and as
    // pixels on Android; without this an iPhone 3× produces a 3240×5760 file.
    const scale = Platform.OS === "ios" ? PixelRatio.get() : 1;
    const tmpUri = await captureRef(ref as never, {
      format,
      quality,
      width: width / scale,
      height: height / scale,
    });
    const namedUri = `${cacheDirectory}${fileName}`;
    await deleteAsync(namedUri, { idempotent: true });
    await copyAsync({ from: tmpUri, to: namedUri });
    return namedUri;
  } catch (error) {
    onError?.(error);
    return undefined;
  }
}
