/**
 * The data a share can carry. Every field is optional so a channel can pick what it
 * understands: `copyLink` only needs `link`, `instagramStories` only needs `imageUri`,
 * the system sheet uses all of them.
 */
export type SharePayload = {
  /** Local file URI of the image to share (PNG). Produced by `captureCardImage`. */
  imageUri?: string;
  /** Text caption / body. */
  message?: string;
  /** A URL to share or copy. */
  link?: string;
  /** File name (no extension needed) the OS share sheet shows for the attachment. */
  fileName?: string;
};

/** Result of a share attempt. Best-effort: some channels cannot know if the user completed. */
export type ShareOutcome = {
  /** Whether the flow was completed as far as we can tell (false = dismissed/denied). */
  completed: boolean;
  /** The channel id that ultimately handled the share (may differ from the requested one). */
  channel: string;
  /** True when the requested channel was unavailable/failed and we routed to the fallback. */
  fellBack?: boolean;
  /** For the system sheet: which app the OS reported handling the share, if any. */
  targetApp?: string | null;
  /** For `saveToLibrary`: the OS denied photo-library permission. */
  permissionDenied?: boolean;
};

/**
 * A single share destination. Implement this to add a new channel — that is the whole
 * extension surface. Register instances with `createSharer({ channels: [...] })`.
 */
export type ShareChannel = {
  /** Stable identifier, e.g. "instagram", "tiktok", "system-sheet". */
  readonly id: string;
  /** Can this channel currently handle the payload (app installed, image present…)? */
  isAvailable(payload: SharePayload): Promise<boolean>;
  /** Perform the share. Resolve with the outcome; throw only on unexpected errors. */
  share(payload: SharePayload): Promise<ShareOutcome>;
};

/** Events emitted by the sharer so the host app can wire its own analytics/logging. */
export type ShareEvent =
  | { type: "share_started"; channel: string; hasImage: boolean }
  | { type: "share_completed"; channel: string; fellBack: boolean; targetApp?: string | null }
  | { type: "share_unavailable"; channel: string }
  | { type: "share_failed"; channel: string; error: unknown };

export type CreateSharerOptions = {
  /** Ordered list of channels. Order is preserved in `channelIds` for building UIs. */
  channels: ShareChannel[];
  /**
   * Channel id used when a requested channel is unavailable or throws.
   * Defaults to "system-sheet" when a channel with that id is registered.
   */
  fallbackChannelId?: string;
  /** Analytics / logging sink. Fire-and-forget — thrown errors here never break a share. */
  onEvent?: (event: ShareEvent) => void;
};

export type Sharer = {
  /** Registered channel ids in registration order (handy for rendering a channel row). */
  readonly channelIds: string[];
  has(channelId: string): boolean;
  isAvailable(channelId: string, payload: SharePayload): Promise<boolean>;
  share(channelId: string, payload: SharePayload): Promise<ShareOutcome>;
};
