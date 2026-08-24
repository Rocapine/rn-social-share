# @rocapine/rn-social-share

A **headless** social-sharing engine for React Native / Expo apps. It captures a view as an
image and shares it across **modular channels** (Instagram Stories, TikTok, WhatsApp, SMS,
the system share sheet, save-to-library, copy-link), behind a small abstraction so the app
never touches `react-native-share` / the OpenSDKs directly.

Extracted from the sharing features in **Eve** (weekly baby card) and **Unchaind** (invite
card). This is the shared _plumbing_ — the visual card, the UI chrome, analytics wiring and
i18n stay in each app and are injected.

## What's in the box

```
src/
  types.ts          SharePayload · ShareOutcome · ShareChannel · ShareEvent · Sharer
  capture.ts        captureCardImage(ref, opts)   — view-shot → branded PNG
  createSharer.ts   createSharer({channels, onEvent, fallbackChannelId})
  channels/         systemSheet · whatsapp · copyLink · instagramStories · sms · tiktok · saveToLibrary
  react/            useShareCard · useScreenshotTrigger · areAllImagesLoaded · screenshot gate
  plugin/           withSocialShare  — iOS LSApplicationQueriesSchemes + Android <queries>
```

**Design principle — headless first.** The package owns capture, channel routing, screenshot
detection and native query-permissions. It ships **no UI**: the two apps' share surfaces are
very different (a Tamagui bottom sheet vs. a two-theme custom hub), so UI stays in the app.

## Install (peer deps)

Required in the host app:

```
react-native-share  react-native-view-shot  expo-file-system
```

Optional — each ships as its **own subpath import** so you only pull (and only need to
install) the native dep for a channel you actually use:

| Dependency                    | Subpath import                                |
| ----------------------------- | --------------------------------------------- |
| `expo-clipboard`              | `@rocapine/rn-social-share/copyLink`          |
| `tiktok-opensdk-react-native` | `@rocapine/rn-social-share/tiktok`            |
| `expo-media-library`          | `@rocapine/rn-social-share/saveToLibrary`     |
| `expo-screen-capture`         | `@rocapine/rn-social-share/screenshotTrigger` |
| `@expo/config-plugins`        | `withSocialShare` (build-time)                |

Metro statically bundles every literal `require()`, so if these channels lived in the main
barrel every consumer would have to install every optional dep or the build fails. Keeping
them behind subpaths means an app that never imports `.../tiktok` never pulls the TikTok SDK.
The core barrel only needs the three required peers above (+ `react-native`, `react`).

## Usage

### 1. Build a sharer (once, near your feature)

```ts
import {
  createSharer,
  systemSheet,
  sms,
  whatsapp,
  instagramStories,
} from "@rocapine/rn-social-share";
// Optional-native-dep channels are subpath imports (see the install table):
import { copyLink } from "@rocapine/rn-social-share/copyLink";
import { tiktok } from "@rocapine/rn-social-share/tiktok";

export const inviteSharer = createSharer({
  channels: [
    copyLink(),
    sms(),
    whatsapp(),
    instagramStories({ appId: FACEBOOK_APP_ID }),
    tiktok({ onError: (e) => logger.warn("tiktok", e) }),
    systemSheet(), // default fallback (id "system-sheet")
  ],
  onEvent: (e) => {
    if (e.type === "share_completed") {
      analytics.logEvent("invite_link_shared", {
        channel: e.channel,
        fell_back: e.fellBack,
      });
    }
  },
});
```

Add or remove a channel = edit the array. That's the whole extension surface.

### 2. Capture the card and share

```tsx
import { useShareCard } from "@rocapine/rn-social-share";

const { ref, capture } = useShareCard({ fileName: "unchaind-invite.png" });

const onChannel = async (channelId: string) => {
  const imageUri = channelId === "link" ? undefined : await capture();
  await inviteSharer.share(channelId, {
    message,
    link,
    imageUri,
    fileName: "unchaind-invite",
  });
};

// Render the card off-screen; point the ref at it:
<View style={{ position: "absolute", left: -10000 }} pointerEvents="none">
  <YourShareCard ref={ref} inviteCode={code} />
</View>;
```

Need a rounded variant for the sheet and a square full-bleed one for Stories? Call
`useShareCard` twice, or call `captureCardImage(ref, opts)` directly with each ref.

### 3. Share on screenshot (optional, the Expo Marathon pattern)

```ts
import { useScreenshotTrigger } from "@rocapine/rn-social-share";

useScreenshotTrigger(isVisible && !isSheetOpen, () =>
  openShareSheet("screenshot")
);
```

A shared, app-wide gate dedupes the iOS double-fire / multiple-listener case (ROC-2854).

> **Android / Google Play — read before shipping.** This subpath pulls `expo-screen-capture`,
> whose manifest declares `READ_MEDIA_IMAGES` (API 33 only). Play then **rejects every
> upload** — _"All developers requesting access to the photo and video permissions are
> required to tell Google Play about the core functionality of their app"_ — until the _Photo
> and video permissions_ declaration is filled, and Google only grants that to apps whose
> **core** functionality is photo/video access. This hook consumes the screenshot _event_ and
> never the image, and the API-33 emitter bails out anyway unless you call
> `ScreenCapture.requestPermissionsAsync()` yourself — so the config plugin below strips the
> permission by default. Detection still works on API ≤ 32 (`READ_EXTERNAL_STORAGE`) and API
> 34+ (`DETECT_SCREEN_CAPTURE`). Not using the plugin? Strip it in your own
> `withAndroidManifest` mod with `tools:node="remove"`, or fill the declaration.

### 4. Wire native query-permissions (build time)

```jsonc
// app.json / app.config.ts plugins
[
  "@rocapine/rn-social-share",
  { "channels": ["instagram", "whatsapp", "tiktok"] }
]
```

Adds the iOS `LSApplicationQueriesSchemes` and Android `<queries>` entries the channels'
`isAvailable` checks need, and removes the `READ_MEDIA_IMAGES` that `/screenshotTrigger`
drags in (see the warning above). **Scope:** query/visibility only — TikTok's full native
wiring (client key, FileProvider) still lives in the app's `withTikTokShare` plugin for now.

Keep the permission — because you request it at runtime for API-33 screenshot detection, or
because another feature needs the gallery — by declaring it in `android.permissions`, or:

```jsonc
[
  "@rocapine/rn-social-share",
  { "android": { "stripScreenshotPhotoPermission": false } }
]
```

## Authoring a channel

```ts
import type { ShareChannel } from "@rocapine/rn-social-share";

export const threads = (opts: { id?: string } = {}): ShareChannel => {
  const id = opts.id ?? "threads";
  return {
    id,
    isAvailable: async (p) => Boolean(p.imageUri),
    share: async (p) => {
      /* ...open Threads... */
      return { completed: true, channel: id };
    },
  };
};
```

`createSharer` handles routing, availability checks, fallback and events around it.

## Consuming this package

Published to the **public npm registry**:

```bash
npm install @rocapine/rn-social-share
```

```jsonc
"@rocapine/rn-social-share": "^0.1.0"
```

The built `dist/` (CJS + ESM + `.d.ts`) is committed and shipped in the tarball, so there's
no install-time build step. Then declare the peer deps you actually use and add the config
plugin (see above).

> A git-tag install (`github:Rocapine/rn-social-share#v0.1.0`) also works since the repo is
> public and `dist/` is committed — handy for consuming an unpublished commit.

## Development

```bash
npm install
npm run type    # tsc --noEmit
npm test        # jest
npm run build   # tsup → dist/ (CJS + ESM + d.ts)
```

CI (GitHub Actions) runs type-check + tests + build on every push/PR and fails if the
committed `dist/` is stale. **Rebuild and commit `dist/` before tagging a release.**

Release: bump `version`, `npm run build` + commit `dist/`, then `npm publish` (`prepack`
rebuilds and `publishConfig.access` is already `public`), and tag `vX.Y.Z`.

## Status & next steps

- [x] Core: types, capture, `createSharer`, channels, React hooks, config plugin
- [x] Tests for `createSharer`, the screenshot gate, and channel translation (24 passing)
- [x] Build (tsup) + type-check + CI, published as `v0.1.0`
- [ ] Migrate Unchaind's `components/invite/` onto the package (superset of channels)
- [ ] Migrate Eve's `features/Sharing/` (adds `saveToLibrary` + screenshot trigger usage)
- [ ] Fold TikTok's full native config into `withSocialShare`
