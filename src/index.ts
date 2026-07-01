// Core (pure, no UI)
export * from "./types";
export { captureCardImage, type CaptureOptions } from "./capture";
export { createSharer } from "./createSharer";

// Channels (modular registry)
export * from "./channels";

// React layer (optional hooks + helpers)
export * from "./react";
