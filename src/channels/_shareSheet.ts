import Share from "react-native-share";
import type { ShareOutcome, SharePayload } from "../types";

type ShareOpenResult = { dismissedAction?: boolean; app?: string | null };

/**
 * Opens the native OS share sheet with the image + caption + branded file name. Shared by
 * the `systemSheet` and `whatsapp` channels and used as the TikTok fallback. With
 * `failOnCancel: false`, a user cancel resolves (with `dismissedAction`) instead of throwing.
 */
export async function openSystemShareSheet(
  payload: SharePayload,
  channelId: string,
): Promise<ShareOutcome> {
  const result = (await Share.open({
    message: payload.message,
    url: payload.imageUri,
    type: payload.imageUri ? "image/png" : undefined,
    filename: payload.fileName,
    failOnCancel: false,
  })) as ShareOpenResult;

  if (result?.dismissedAction) {
    return { completed: false, channel: channelId };
  }
  return { completed: true, channel: channelId, targetApp: result?.app ?? null };
}
