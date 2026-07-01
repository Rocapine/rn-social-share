import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
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
