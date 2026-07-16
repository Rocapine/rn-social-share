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

// src/channels/tiktok.ts
var tiktok_exports = {};
__export(tiktok_exports, {
  tiktok: () => tiktok
});
module.exports = __toCommonJS(tiktok_exports);
var import_react_native = require("react-native");

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

// src/channels/tiktok.ts
var TIKTOK_SHARE_URL = "tiktoksharesdk://";
var tiktok = (options = {}) => {
  const id = options.id ?? "tiktok";
  const fallback = (payload) => openSystemShareSheet(payload, id).then((outcome) => ({
    ...outcome,
    fellBack: true
  }));
  return {
    id,
    // Only claim availability when there's an image AND TikTok is actually installed.
    // Otherwise createSharer routes to the fallback (system sheet) — invoking the OpenSDK
    // without TikTok present prompts for photo access and then silently no-ops.
    isAvailable: async (payload) => {
      if (!payload.imageUri) {
        return false;
      }
      return import_react_native.Linking.canOpenURL(TIKTOK_SHARE_URL).catch(() => false);
    },
    share: async (payload) => {
      if (!payload.imageUri) {
        return fallback(payload);
      }
      try {
        const mod = require("tiktok-opensdk-react-native");
        const TikTokOpenSDK = mod?.default ?? mod;
        if (TikTokOpenSDK && typeof TikTokOpenSDK.share === "function") {
          TikTokOpenSDK.share([payload.imageUri], true, false).catch(
            (error) => {
              options.onError?.(error);
              void openSystemShareSheet(payload, id);
            }
          );
          return { completed: true, channel: id };
        }
      } catch (error) {
        options.onError?.(error);
      }
      return fallback(payload);
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  tiktok
});
//# sourceMappingURL=tiktok.js.map