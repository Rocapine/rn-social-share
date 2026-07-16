// Channels whose only native dependency is react-native-share (a required peer dep) live
// in the main barrel. Channels backed by an OPTIONAL native module are published as their
// own subpath entry point instead — see package.json "exports" — so an app only pulls
// (and must install) the native dep for a channel it actually imports:
//   @rocapine/rn-social-share/copyLink        → expo-clipboard
//   @rocapine/rn-social-share/tiktok          → tiktok-opensdk-react-native
//   @rocapine/rn-social-share/saveToLibrary   → expo-media-library
// Metro statically bundles every literal require(), so keeping these in the barrel would
// force every consumer to install every optional dep (or the build fails).
export { systemSheet } from "./systemSheet";
export { whatsapp } from "./whatsapp";
export { instagramStories } from "./instagramStories";
export { sms } from "./sms";
export { openSystemShareSheet } from "./_shareSheet";
