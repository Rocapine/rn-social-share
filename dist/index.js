"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  SCREENSHOT_DEBOUNCE_MS: () => SCREENSHOT_DEBOUNCE_MS,
  areAllImagesLoaded: () => areAllImagesLoaded,
  captureCardImage: () => captureCardImage,
  copyLink: () => copyLink,
  createScreenshotGate: () => createScreenshotGate,
  createSharer: () => createSharer,
  instagramStories: () => instagramStories,
  openSystemShareSheet: () => openSystemShareSheet,
  saveToLibrary: () => saveToLibrary,
  screenshotGate: () => screenshotGate,
  shouldHandleScreenshot: () => shouldHandleScreenshot,
  sms: () => sms,
  systemSheet: () => systemSheet,
  tiktok: () => tiktok,
  useScreenshotTrigger: () => useScreenshotTrigger,
  useShareCard: () => useShareCard,
  whatsapp: () => whatsapp
});
module.exports = __toCommonJS(index_exports);

// src/capture.ts
var import_legacy = require("expo-file-system/legacy");
var import_react_native_view_shot = require("react-native-view-shot");
async function captureCardImage(ref, options) {
  const { fileName, width = 1080, height = 1920, format = "png", quality = 1, onError } = options;
  try {
    const tmpUri = await (0, import_react_native_view_shot.captureRef)(ref, { format, quality, width, height });
    const namedUri = `${import_legacy.cacheDirectory}${fileName}`;
    await (0, import_legacy.deleteAsync)(namedUri, { idempotent: true });
    await (0, import_legacy.copyAsync)({ from: tmpUri, to: namedUri });
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
var import_react_native_share = __toESM(require("react-native-share"));
async function openSystemShareSheet(payload, channelId) {
  const result = await import_react_native_share.default.open({
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
var import_react_native = require("react-native");
var WHATSAPP_PROBE_URL = "whatsapp://send";
var whatsapp = (options = {}) => {
  const id = options.id ?? "whatsapp";
  return {
    id,
    isAvailable: () => import_react_native.Linking.canOpenURL(WHATSAPP_PROBE_URL).catch(() => false),
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
      const Clipboard = require("expo-clipboard");
      await Clipboard.setStringAsync(payload.link);
      return { completed: true, channel: id };
    }
  };
};

// src/channels/instagramStories.ts
var import_react_native2 = require("react-native");
var import_react_native_share2 = __toESM(require("react-native-share"));
var INSTAGRAM_STORIES_URL = "instagram-stories://share";
var instagramStories = (options) => {
  const id = options.id ?? "instagram";
  return {
    id,
    isAvailable: async (payload) => {
      if (!payload.imageUri) {
        return false;
      }
      return import_react_native2.Linking.canOpenURL(INSTAGRAM_STORIES_URL).catch(() => false);
    },
    share: async (payload) => {
      if (!payload.imageUri) {
        throw new Error("[rn-social-share] instagramStories requires payload.imageUri");
      }
      await import_react_native_share2.default.shareSingle({
        social: import_react_native_share2.default.Social.INSTAGRAM_STORIES,
        backgroundImage: payload.imageUri,
        appId: options.appId
      });
      return { completed: true, channel: id };
    }
  };
};

// src/channels/sms.ts
var import_react_native_share3 = __toESM(require("react-native-share"));
var sms = (options = {}) => {
  const id = options.id ?? "messages";
  return {
    id,
    isAvailable: async () => true,
    share: async (payload) => {
      await import_react_native_share3.default.shareSingle({
        social: import_react_native_share3.default.Social.SMS,
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
        const mod = require("tiktok-opensdk-react-native");
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
      const MediaLibrary = require("expo-media-library");
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
var import_react = require("react");
function useShareCard(options) {
  const ref = (0, import_react.useRef)(null);
  const { fileName, width, height, format, quality, onError } = options;
  const capture = (0, import_react.useCallback)(
    () => captureCardImage(ref, { fileName, width, height, format, quality, onError }),
    [fileName, width, height, format, quality, onError]
  );
  return { ref, capture };
}

// src/react/useScreenshotTrigger.ts
var import_react2 = require("react");

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
  const onScreenshotRef = (0, import_react2.useRef)(onScreenshot);
  onScreenshotRef.current = onScreenshot;
  (0, import_react2.useEffect)(
    function subscribeToScreenshots() {
      if (!enabled) {
        return;
      }
      let subscription;
      try {
        const { addScreenshotListener } = require("expo-screen-capture");
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
//# sourceMappingURL=index.js.map