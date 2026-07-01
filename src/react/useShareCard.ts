import { useCallback, useRef } from "react";
import type { View } from "react-native";
import { captureCardImage, type CaptureOptions } from "../capture";

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
export function useShareCard(options: CaptureOptions) {
  const ref = useRef<View>(null);
  const { fileName, width, height, format, quality, onError } = options;

  const capture = useCallback(
    () => captureCardImage(ref, { fileName, width, height, format, quality, onError }),
    [fileName, width, height, format, quality, onError],
  );

  return { ref, capture };
}
