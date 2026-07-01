import type { ShareChannel } from "../types";
import { openSystemShareSheet } from "./_shareSheet";

/**
 * The generic native share sheet. Always available, so it doubles as the default fallback
 * (register it with the default id "system-sheet" to have `createSharer` pick it up).
 */
export const systemSheet = (options: { id?: string } = {}): ShareChannel => {
  const id = options.id ?? "system-sheet";
  return {
    id,
    isAvailable: async () => true,
    share: (payload) => openSystemShareSheet(payload, id),
  };
};
