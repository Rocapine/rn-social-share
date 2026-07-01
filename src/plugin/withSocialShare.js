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

/**
 * Expo config plugin that declares the app-query permissions the enabled share channels
 * need, so channel availability detection works on both platforms.
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
    return cfg;
  });

  return config;
};

module.exports = withSocialShare;
module.exports.default = withSocialShare;
