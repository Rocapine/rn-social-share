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

// src/channels/copyLink.ts
var copyLink_exports = {};
__export(copyLink_exports, {
  copyLink: () => copyLink
});
module.exports = __toCommonJS(copyLink_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  copyLink
});
//# sourceMappingURL=copyLink.js.map