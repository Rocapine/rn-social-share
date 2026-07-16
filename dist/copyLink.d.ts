import { S as ShareChannel } from './types-guoVqHi2.js';

/**
 * Copies `payload.link` to the clipboard. Not a "share" in the OS sense, but modeled as a
 * channel so it slots into the same UI row and analytics funnel as everything else.
 *
 * `expo-clipboard` is a lazy require so importing the channel barrel never forces the
 * dependency on apps that don't use this channel.
 */
declare const copyLink: (options?: {
    id?: string;
}) => ShareChannel;

export { copyLink };
