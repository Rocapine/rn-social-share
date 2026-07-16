import { S as ShareChannel } from './types-guoVqHi2.js';

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

export { type TikTokChannelOptions, tiktok };
