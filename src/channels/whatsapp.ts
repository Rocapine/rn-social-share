import { Linking } from "react-native";
import type { ShareChannel } from "../types";
import { openSystemShareSheet } from "./_shareSheet";

const WHATSAPP_PROBE_URL = "whatsapp://send";

/**
 * WhatsApp — intentionally routed through the system share sheet. iOS has no reliable
 * direct deep link that carries the full text AND an image: both `whatsapp://send?text=`
 * and `wa.me` drop everything but the URL on real devices, and RNShare's WhatsApp-text
 * path builds an invalid URL (literal spaces). The share sheet's WhatsApp extension is the
 * only dependable path. `isAvailable` still probes for the app so the UI can hide the
 * button when WhatsApp isn't installed.
 *
 * iOS: requires `whatsapp` in LSApplicationQueriesSchemes (see `withSocialShare`).
 */
export const whatsapp = (options: { id?: string } = {}): ShareChannel => {
  const id = options.id ?? "whatsapp";
  return {
    id,
    isAvailable: () => Linking.canOpenURL(WHATSAPP_PROBE_URL).catch(() => false),
    share: (payload) => openSystemShareSheet(payload, id),
  };
};
