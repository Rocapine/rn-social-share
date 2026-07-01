import { Linking } from "react-native";
import Share, { type ShareSingleOptions } from "react-native-share";
import type { ShareChannel } from "../types";

const INSTAGRAM_STORIES_URL = "instagram-stories://share";

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
export const instagramStories = (options: { appId: string; id?: string }): ShareChannel => {
  const id = options.id ?? "instagram";
  return {
    id,
    isAvailable: async (payload) => {
      if (!payload.imageUri) {
        return false;
      }
      return Linking.canOpenURL(INSTAGRAM_STORIES_URL).catch(() => false);
    },
    share: async (payload) => {
      if (!payload.imageUri) {
        throw new Error("[rn-social-share] instagramStories requires payload.imageUri");
      }
      await Share.shareSingle({
        social: Share.Social.INSTAGRAM_STORIES,
        backgroundImage: payload.imageUri,
        appId: options.appId,
      } as ShareSingleOptions);
      return { completed: true, channel: id };
    },
  };
};
