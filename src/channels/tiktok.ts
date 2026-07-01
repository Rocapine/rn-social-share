import type { ShareChannel } from "../types";
import { openSystemShareSheet } from "./_shareSheet";

export type TikTokChannelOptions = {
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
export const tiktok = (options: TikTokChannelOptions = {}): ShareChannel => {
  const id = options.id ?? "tiktok";

  const fallback = (payload: Parameters<ShareChannel["share"]>[0]) =>
    openSystemShareSheet(payload, id).then((outcome) => ({ ...outcome, fellBack: true }));

  return {
    id,
    isAvailable: async (payload) => Boolean(payload.imageUri),
    share: async (payload) => {
      if (!payload.imageUri) {
        return fallback(payload);
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require("tiktok-opensdk-react-native");
        const TikTokOpenSDK = mod?.default ?? mod;
        if (TikTokOpenSDK && typeof TikTokOpenSDK.share === "function") {
          // Fire-and-forget. Fall back only on a real rejection; the promise-never-settles
          // case simply never runs `.catch`, which is the intended behavior.
          TikTokOpenSDK.share([payload.imageUri], true, false).catch((error: unknown) => {
            options.onError?.(error);
            void openSystemShareSheet(payload, id);
          });
          return { completed: true, channel: id };
        }
      } catch (error) {
        options.onError?.(error);
      }
      return fallback(payload);
    },
  };
};
