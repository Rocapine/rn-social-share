import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    // Optional-native-dep channels as separate subpath entry points (see channels/index.ts).
    copyLink: "src/channels/copyLink.ts",
    tiktok: "src/channels/tiktok.ts",
    saveToLibrary: "src/channels/saveToLibrary.ts",
    screenshotTrigger: "src/react/useScreenshotTrigger.ts",
  },
  // CJS only. React Native / Metro is the sole consumer, and it must get plain
  // `require("...")` calls: esbuild's ESM output rewrites the lazy optional-native
  // requires to a `__require` shim that Metro's dependency collector does NOT see,
  // so those modules (expo-clipboard, tiktok-opensdk, expo-media-library,
  // expo-screen-capture) never get bundled and blow up at runtime with
  // "Requiring unknown module". The CJS build keeps literal requires Metro collects.
  format: ["cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  // RN/Hermes-friendly target; Metro/Babel re-transpiles downstream.
  target: "es2020",
  // All runtime deps are peerDependencies (incl. the lazy-required optional
  // native modules) — keep them external so nothing gets bundled.
  external: [
    "react",
    "react-native",
    "react-native-share",
    "react-native-view-shot",
    "expo-file-system",
    "expo-clipboard",
    "expo-media-library",
    "expo-screen-capture",
    "tiktok-opensdk-react-native",
    "@expo/config-plugins",
  ],
});
