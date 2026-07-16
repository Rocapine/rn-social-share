"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/channels/saveToLibrary.ts
var saveToLibrary_exports = {};
__export(saveToLibrary_exports, {
  saveToLibrary: () => saveToLibrary
});
module.exports = __toCommonJS(saveToLibrary_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  saveToLibrary
});
//# sourceMappingURL=saveToLibrary.js.map