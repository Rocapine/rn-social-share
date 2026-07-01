import type { ShareChannel } from "../types";

/**
 * Copies `payload.link` to the clipboard. Not a "share" in the OS sense, but modeled as a
 * channel so it slots into the same UI row and analytics funnel as everything else.
 *
 * `expo-clipboard` is a lazy require so importing the channel barrel never forces the
 * dependency on apps that don't use this channel.
 */
export const copyLink = (options: { id?: string } = {}): ShareChannel => {
  const id = options.id ?? "link";
  return {
    id,
    isAvailable: async (payload) => typeof payload.link === "string" && payload.link.length > 0,
    share: async (payload) => {
      if (!payload.link) {
        return { completed: false, channel: id };
      }
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Clipboard = require("expo-clipboard");
      await Clipboard.setStringAsync(payload.link);
      return { completed: true, channel: id };
    },
  };
};
