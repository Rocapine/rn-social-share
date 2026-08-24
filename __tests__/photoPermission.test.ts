/**
 * The config plugin strips READ_MEDIA_IMAGES (dragged in by expo-screen-capture behind
 * `/screenshotTrigger`) so Google Play stops demanding the Photo and video permissions
 * declaration. These cover the "unless the app wants it" escape hatches.
 */

const {
  shouldStripPhotoPermission,
  SCREENSHOT_PHOTO_PERMISSION,
} = require("../src/plugin/withSocialShare");

describe("shouldStripPhotoPermission", () => {
  it("strips by default", () => {
    expect(shouldStripPhotoPermission({}, {})).toBe(true);
    expect(shouldStripPhotoPermission({}, undefined)).toBe(true);
  });

  it("keeps it when the app declares the permission itself", () => {
    const config = {
      android: {
        permissions: [
          "android.permission.VIBRATE",
          SCREENSHOT_PHOTO_PERMISSION,
        ],
      },
    };
    expect(shouldStripPhotoPermission(config, {})).toBe(false);
  });

  it("keeps it when the app opts out", () => {
    const options = { android: { stripScreenshotPhotoPermission: false } };
    expect(shouldStripPhotoPermission({}, options)).toBe(false);
  });

  it("still strips for unrelated android permissions or options", () => {
    const config = { android: { permissions: ["android.permission.CAMERA"] } };
    const options = {
      android: { stripScreenshotPhotoPermission: true },
      channels: ["tiktok"],
    };
    expect(shouldStripPhotoPermission(config, options)).toBe(true);
  });
});
