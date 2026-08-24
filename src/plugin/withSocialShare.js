const { withInfoPlist, withAndroidManifest } = require("@expo/config-plugins");

// The URL schemes a channel needs in the iOS Info.plist LSApplicationQueriesSchemes so
// `Linking.canOpenURL()` (used by the channels' `isAvailable`) returns true instead of
// always false.
const IOS_QUERY_SCHEMES = {
  instagram: ["instagram-stories", "instagram"],
  whatsapp: ["whatsapp"],
  tiktok: ["tiktoksharesdk", "snssdk1233", "musically"],
};

// The Android package names a channel needs in <queries> for package visibility
// (Android 11+), so app detection / share targeting works.
const ANDROID_PACKAGES = {
  instagram: ["com.instagram.android"],
  whatsapp: ["com.whatsapp"],
  tiktok: ["com.zhiliaoapp.musically", "com.ss.android.ugc.trill"],
};

// `expo-screen-capture` — the peer behind `/screenshotTrigger` — declares this for API 33,
// because its own emitter reads MediaStore. Google Play then refuses any upload until the
// "Photo and video permissions" declaration is filled, and that declaration is only for apps
// whose CORE functionality is photo/video access. `useScreenshotTrigger` consumes the
// screenshot *event* and never the image, so the permission buys the app nothing — and
// without a runtime `requestPermissionsAsync` call the API-33 emitter bails out anyway.
const SCREENSHOT_PHOTO_PERMISSION = "android.permission.READ_MEDIA_IMAGES";

/**
 * Strip it unless the app wants it: either it declares the permission itself (a real
 * gallery feature, or it does request it at runtime for API-33 screenshot detection), or
 * it opts out with `android: { stripScreenshotPhotoPermission: false }`.
 */
function shouldStripPhotoPermission(config, options = {}) {
  if (
    options.android &&
    options.android.stripScreenshotPhotoPermission === false
  ) {
    return false;
  }
  const declared = (config.android && config.android.permissions) || [];
  return !declared.includes(SCREENSHOT_PHOTO_PERMISSION);
}

// `tools:node` is inert (and fails the merge) without the namespace on <manifest>.
function ensureToolsNamespace(manifest) {
  manifest.$ = manifest.$ || {};
  if (!manifest.$["xmlns:tools"]) {
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
  }
}

/**
 * Expo config plugin that declares the app-query permissions the enabled share channels
 * need, so channel availability detection works on both platforms, and removes the
 * photo permission `/screenshotTrigger` drags in (see SCREENSHOT_PHOTO_PERMISSION).
 *
 * Usage in app.config.ts / app.json:
 *   ["@rocapine/rn-social-share", { "channels": ["instagram", "whatsapp", "tiktok"] }]
 *
 * Scope note: this covers the query/visibility entries only. TikTok's full native wiring
 * (client key in Info.plist / strings.xml, meta-data, and the FileProvider) is heavier and
 * currently lives in the app's own `withTikTokShare` plugin; folding it in here is a
 * follow-up once this package is validated with a prebuild.
 */
const withSocialShare = (config, options = {}) => {
  const channels = Array.isArray(options.channels) ? options.channels : [];
  const stripPhotoPermission = shouldStripPhotoPermission(config, options);

  config = withInfoPlist(config, (cfg) => {
    const existing = cfg.modResults.LSApplicationQueriesSchemes || [];
    const schemes = new Set(existing);
    for (const channel of channels) {
      for (const scheme of IOS_QUERY_SCHEMES[channel] || []) {
        schemes.add(scheme);
      }
    }
    cfg.modResults.LSApplicationQueriesSchemes = Array.from(schemes);
    return cfg;
  });

  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.queries = manifest.queries || [{}];
    const query = manifest.queries[0];
    query.package = query.package || [];
    const seen = new Set(query.package.map((p) => p.$ && p.$["android:name"]));
    for (const channel of channels) {
      for (const pkg of ANDROID_PACKAGES[channel] || []) {
        if (!seen.has(pkg)) {
          query.package.push({ $: { "android:name": pkg } });
          seen.add(pkg);
        }
      }
    }

    if (stripPhotoPermission) {
      ensureToolsNamespace(manifest);
      manifest["uses-permission"] = manifest["uses-permission"] || [];
      const alreadyRemoved = manifest["uses-permission"].some(
        (p) =>
          p.$ &&
          p.$["android:name"] === SCREENSHOT_PHOTO_PERMISSION &&
          p.$["tools:node"] === "remove"
      );
      if (!alreadyRemoved) {
        manifest["uses-permission"].push({
          $: {
            "android:name": SCREENSHOT_PHOTO_PERMISSION,
            "tools:node": "remove",
          },
        });
      }
    }
    return cfg;
  });

  return config;
};

module.exports = withSocialShare;
module.exports.default = withSocialShare;
module.exports.shouldStripPhotoPermission = shouldStripPhotoPermission;
module.exports.SCREENSHOT_PHOTO_PERMISSION = SCREENSHOT_PHOTO_PERMISSION;
