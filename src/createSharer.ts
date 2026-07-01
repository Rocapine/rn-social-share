import type {
  CreateSharerOptions,
  ShareChannel,
  ShareEvent,
  SharePayload,
  ShareOutcome,
  Sharer,
} from "./types";

const DEFAULT_FALLBACK_ID = "system-sheet";

/**
 * Builds a sharer from a list of channels. This is the abstraction layer between the app
 * and react-native-share / the OpenSDKs: the app only ever calls `sharer.share(id, payload)`
 * and adds/removes channels by editing the `channels` array.
 *
 * Routing per share:
 *   1. Emit `share_started`.
 *   2. Unknown id, or `isAvailable()` false/throws → `share_unavailable`, route to fallback.
 *   3. `share()` throws → `share_failed`, route to fallback.
 *   4. Emit `share_completed` with the channel that actually handled it.
 *
 * The fallback (default: the channel registered as "system-sheet") is never used to route
 * back into itself, so a missing/failed fallback yields a non-completed outcome instead of
 * looping.
 */
export function createSharer(options: CreateSharerOptions): Sharer {
  const { channels, onEvent } = options;

  const registry = new Map<string, ShareChannel>();
  for (const channel of channels) {
    if (registry.has(channel.id)) {
      throw new Error(`[rn-social-share] Duplicate channel id "${channel.id}"`);
    }
    registry.set(channel.id, channel);
  }

  const fallbackId = options.fallbackChannelId ?? DEFAULT_FALLBACK_ID;
  const fallbackChannel = registry.get(fallbackId);

  const emit = (event: ShareEvent): void => {
    try {
      onEvent?.(event);
    } catch {
      // Analytics/logging must never break a share.
    }
  };

  const emitCompleted = (outcome: ShareOutcome): void => {
    emit({
      type: "share_completed",
      channel: outcome.channel,
      fellBack: outcome.fellBack ?? false,
      targetApp: outcome.targetApp,
    });
  };

  const runFallback = async (requestedId: string, payload: SharePayload): Promise<ShareOutcome> => {
    if (!fallbackChannel || fallbackChannel.id === requestedId) {
      return { completed: false, channel: requestedId, fellBack: false };
    }
    try {
      const outcome = await fallbackChannel.share(payload);
      return { ...outcome, channel: fallbackChannel.id, fellBack: true };
    } catch {
      return { completed: false, channel: fallbackChannel.id, fellBack: true };
    }
  };

  const share = async (channelId: string, payload: SharePayload): Promise<ShareOutcome> => {
    emit({ type: "share_started", channel: channelId, hasImage: Boolean(payload.imageUri) });

    const channel = registry.get(channelId);

    let available = channel !== undefined;
    if (channel) {
      try {
        available = await channel.isAvailable(payload);
      } catch {
        available = false;
      }
    }

    if (!channel || !available) {
      emit({ type: "share_unavailable", channel: channelId });
      const outcome = await runFallback(channelId, payload);
      emitCompleted(outcome);
      return outcome;
    }

    try {
      const outcome = await channel.share(payload);
      emitCompleted(outcome);
      return outcome;
    } catch (error) {
      emit({ type: "share_failed", channel: channelId, error });
      const outcome = await runFallback(channelId, payload);
      emitCompleted(outcome);
      return outcome;
    }
  };

  return {
    channelIds: channels.map((channel) => channel.id),
    has: (channelId) => registry.has(channelId),
    isAvailable: async (channelId, payload) => {
      const channel = registry.get(channelId);
      if (!channel) {
        return false;
      }
      try {
        return await channel.isAvailable(payload);
      } catch {
        return false;
      }
    },
    share,
  };
}
