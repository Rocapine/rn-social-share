/**
 * A shareable card often contains several asynchronously-loaded images (a fruit
 * illustration, a logo…). view-shot must not capture until every one has painted, or an
 * image that loads after the capture fires is absent from the file. This was ROC-2883: the
 * capture only awaited one image, so the logo was frequently missing from the export.
 *
 * Track loaded keys in a Set as each `<Image onLoad>` fires, then gate the capture on
 * `areAllImagesLoaded(loaded, REQUIRED_KEYS)`.
 */
export function areAllImagesLoaded(
  loaded: ReadonlySet<string>,
  required: readonly string[],
): boolean {
  return required.every((key) => loaded.has(key));
}
