var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/capture.ts
import { cacheDirectory, copyAsync, deleteAsync } from "expo-file-system/legacy";
import { captureRef } from "react-native-view-shot";
async function captureCardImage(ref, options) {
  const { fileName, width = 1080, height = 1920, format = "png", quality = 1, onError } = options;
  try {
    const tmpUri = await captureRef(ref, { format, quality, width, height });
    const namedUri = `${cacheDirectory}${fileName}`;
    await deleteAsync(namedUri, { idempotent: true });
    await copyAsync({ from: tmpUri, to: namedUri });
    return namedUri;
  } catch (error) {
    onError?.(error);
    return void 0;
  }
}

// src/createSharer.ts
var DEFAULT_FALLBACK_ID = "system-sheet";
function createSharer(options) {
  const { channels, onEvent } = options;
  const registry = /* @__PURE__ */ new Map();
  for (const channel of channels) {
    if (registry.has(channel.id)) {
      throw new Error(`[rn-social-share] Duplicate channel id "${channel.id}"`);
    }
    registry.set(channel.id, channel);
  }
  const fallbackId = options.fallbackChannelId ?? DEFAULT_FALLBACK_ID;
  const fallbackChannel = registry.get(fallbackId);
  const emit = (event) => {
    try {
      onEvent?.(event);
    } catch {
    }
  };
  const emitCompleted = (outcome) => {
    emit({
      type: "share_completed",
      channel: outcome.channel,
      fellBack: outcome.fellBack ?? false,
      targetApp: outcome.targetApp
    });
  };
  const runFallback = async (requestedId, payload) => {
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
  const share = async (channelId, payload) => {
    emit({ type: "share_started", channel: channelId, hasImage: Boolean(payload.imageUri) });
    const channel = registry.get(channelId);
    let available = channel !== void 0;
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
    share
  };
}

// src/channels/_shareSheet.ts
import Share from "react-native-share";
async function openSystemShareSheet(payload, channelId) {
  const result = await Share.open({
    message: payload.message,
    url: payload.imageUri,
    type: payload.imageUri ? "image/png" : void 0,
    filename: payload.fileName,
    failOnCancel: false
  });
  if (result?.dismissedAction) {
    return { completed: false, channel: channelId };
  }
  return { completed: true, channel: channelId, targetApp: result?.app ?? null };
}

// src/channels/systemSheet.ts
var systemSheet = (options = {}) => {
  const id = options.id ?? "system-sheet";
  return {
    id,
    isAvailable: async () => true,
    share: (payload) => openSystemShareSheet(payload, id)
  };
};

// src/channels/whatsapp.ts
import { Linking } from "react-native";
var WHATSAPP_PROBE_URL = "whatsapp://send";
var whatsapp = (options = {}) => {
  const id = options.id ?? "whatsapp";
  return {
    id,
    isAvailable: () => Linking.canOpenURL(WHATSAPP_PROBE_URL).catch(() => false),
    share: (payload) => openSystemShareSheet(payload, id)
  };
};

// src/channels/copyLink.ts
var copyLink = (options = {}) => {
  const id = options.id ?? "link";
  return {
    id,
    isAvailable: async (payload) => typeof payload.link === "string" && payload.link.length > 0,
    share: async (payload) => {
      if (!payload.link) {
        return { completed: false, channel: id };
      }
      const Clipboard = __require("expo-clipboard");
      await Clipboard.setStringAsync(payload.link);
      return { completed: true, channel: id };
    }
  };
};

// src/channels/instagramStories.ts
import { Linking as Linking2 } from "react-native";
import Share2 from "react-native-share";
var INSTAGRAM_STORIES_URL = "instagram-stories://share";
var instagramStories = (options) => {
  const id = options.id ?? "instagram";
  return {
    id,
    isAvailable: async (payload) => {
      if (!payload.imageUri) {
        return false;
      }
      return Linking2.canOpenURL(INSTAGRAM_STORIES_URL).catch(() => false);
    },
    share: async (payload) => {
      if (!payload.imageUri) {
        throw new Error("[rn-social-share] instagramStories requires payload.imageUri");
      }
      await Share2.shareSingle({
        social: Share2.Social.INSTAGRAM_STORIES,
        backgroundImage: payload.imageUri,
        appId: options.appId
      });
      return { completed: true, channel: id };
    }
  };
};

// src/channels/sms.ts
import Share3 from "react-native-share";
var sms = (options = {}) => {
  const id = options.id ?? "messages";
  return {
    id,
    isAvailable: async () => true,
    share: async (payload) => {
      await Share3.shareSingle({
        social: Share3.Social.SMS,
        message: payload.message,
        url: payload.imageUri
      });
      return { completed: true, channel: id };
    }
  };
};

// src/channels/tiktok.ts
var tiktok = (options = {}) => {
  const id = options.id ?? "tiktok";
  const fallback = (payload) => openSystemShareSheet(payload, id).then((outcome) => ({ ...outcome, fellBack: true }));
  return {
    id,
    isAvailable: async (payload) => Boolean(payload.imageUri),
    share: async (payload) => {
      if (!payload.imageUri) {
        return fallback(payload);
      }
      try {
        const mod = __require("tiktok-opensdk-react-native");
        const TikTokOpenSDK = mod?.default ?? mod;
        if (TikTokOpenSDK && typeof TikTokOpenSDK.share === "function") {
          TikTokOpenSDK.share([payload.imageUri], true, false).catch((error) => {
            options.onError?.(error);
            void openSystemShareSheet(payload, id);
          });
          return { completed: true, channel: id };
        }
      } catch (error) {
        options.onError?.(error);
      }
      return fallback(payload);
    }
  };
};

// src/channels/saveToLibrary.ts
var saveToLibrary = (options = {}) => {
  const id = options.id ?? "save";
  return {
    id,
    isAvailable: async (payload) => Boolean(payload.imageUri),
    share: async (payload) => {
      if (!payload.imageUri) {
        throw new Error("[rn-social-share] saveToLibrary requires payload.imageUri");
      }
      const MediaLibrary = __require("expo-media-library");
      const current = await MediaLibrary.getPermissionsAsync(true);
      let granted = current.granted;
      if (!granted) {
        const requested = await MediaLibrary.requestPermissionsAsync(true);
        granted = requested.granted;
      }
      if (!granted) {
        return { completed: false, channel: id, permissionDenied: true };
      }
      await MediaLibrary.saveToLibraryAsync(payload.imageUri);
      return { completed: true, channel: id };
    }
  };
};

// src/react/useShareCard.ts
import { useCallback, useRef } from "react";
function useShareCard(options) {
  const ref = useRef(null);
  const { fileName, width, height, format, quality, onError } = options;
  const capture = useCallback(
    () => captureCardImage(ref, { fileName, width, height, format, quality, onError }),
    [fileName, width, height, format, quality, onError]
  );
  return { ref, capture };
}

// src/react/useScreenshotTrigger.ts
import { useEffect, useRef as useRef2 } from "react";

// src/react/screenshotDebounce.ts
var SCREENSHOT_DEBOUNCE_MS = 1e3;
function shouldHandleScreenshot(lastHandledAt, now, windowMs = SCREENSHOT_DEBOUNCE_MS) {
  if (lastHandledAt === null) {
    return true;
  }
  return now - lastHandledAt >= windowMs;
}
function createScreenshotGate(windowMs = SCREENSHOT_DEBOUNCE_MS) {
  let lastHandledAt = null;
  return function tryHandleScreenshot(now) {
    if (shouldHandleScreenshot(lastHandledAt, now, windowMs)) {
      lastHandledAt = now;
      return true;
    }
    return false;
  };
}
var screenshotGate = createScreenshotGate();

// src/react/useScreenshotTrigger.ts
function useScreenshotTrigger(enabled, onScreenshot) {
  const onScreenshotRef = useRef2(onScreenshot);
  onScreenshotRef.current = onScreenshot;
  useEffect(
    function subscribeToScreenshots() {
      if (!enabled) {
        return;
      }
      let subscription;
      try {
        const { addScreenshotListener } = __require("expo-screen-capture");
        subscription = addScreenshotListener(() => {
          if (screenshotGate(Date.now())) {
            onScreenshotRef.current();
          }
        });
      } catch {
      }
      return () => subscription?.remove();
    },
    [enabled]
  );
}

// src/react/imageReadiness.ts
function areAllImagesLoaded(loaded, required) {
  return required.every((key) => loaded.has(key));
}
export {
  SCREENSHOT_DEBOUNCE_MS,
  areAllImagesLoaded,
  captureCardImage,
  copyLink,
  createScreenshotGate,
  createSharer,
  instagramStories,
  openSystemShareSheet,
  saveToLibrary,
  screenshotGate,
  shouldHandleScreenshot,
  sms,
  systemSheet,
  tiktok,
  useScreenshotTrigger,
  useShareCard,
  whatsapp
};
//# sourceMappingURL=index.mjs.map