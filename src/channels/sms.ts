import Share, { type ShareSingleOptions } from "react-native-share";
import type { ShareChannel } from "../types";

/**
 * Native SMS/Messages composer with the full text body and the card image attached.
 * `isAvailable` is optimistic (true); a device without SMS makes `shareSingle` throw, and
 * `createSharer` then routes to the fallback channel.
 */
export const sms = (options: { id?: string } = {}): ShareChannel => {
  const id = options.id ?? "messages";
  return {
    id,
    isAvailable: async () => true,
    share: async (payload) => {
      await Share.shareSingle({
        social: Share.Social.SMS,
        message: payload.message,
        url: payload.imageUri,
      } as ShareSingleOptions);
      return { completed: true, channel: id };
    },
  };
};
