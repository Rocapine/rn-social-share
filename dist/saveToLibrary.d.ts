import { S as ShareChannel } from './types-guoVqHi2.js';

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

export { saveToLibrary };
