import type { ShareChannel } from "../types";

/**
 * Saves the image to the device photo library via `expo-media-library` (add-only / write
 * permission, which avoids needing a full photo-library read description on iOS). Returns
 * `{ completed: false, permissionDenied: true }` when the user denies access, so the host UI
 * can show an "open settings" prompt.
 *
 * `expo-media-library` is a lazy require and optional — only apps that register this channel
 * need it installed.
 */
export const saveToLibrary = (options: { id?: string } = {}): ShareChannel => {
  const id = options.id ?? "save";
  return {
    id,
    isAvailable: async (payload) => Boolean(payload.imageUri),
    share: async (payload) => {
      if (!payload.imageUri) {
        throw new Error("[rn-social-share] saveToLibrary requires payload.imageUri");
      }
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const MediaLibrary = require("expo-media-library");
      const current = await MediaLibrary.getPermissionsAsync(true);
      let granted = current.granted;
      if (!granted) {
        const requested = await MediaLibrary.requestPermissionsAsync(true);
        granted = requested.granted;
      }
      if (!granted) {
        return { completed: false, channel: id, permissionDenied: true };
      }
      await MediaLibrary.saveToLibraryAsync(payload.imageUri);
      return { completed: true, channel: id };
    },
  };
};
