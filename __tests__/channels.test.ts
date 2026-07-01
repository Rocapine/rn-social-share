/**
 * Channel unit tests. The native modules aren't installed in this package, so they're
 * mocked virtually — we assert the channels translate a payload into the right calls and
 * outcomes, not the native behavior itself.
 */

const mockOpen = jest.fn();
const mockShareSingle = jest.fn();
const mockCanOpenURL = jest.fn();
const mockSetString = jest.fn();

jest.mock(
  "react-native",
  () => ({ Linking: { canOpenURL: (...a: unknown[]) => mockCanOpenURL(...a) } }),
  { virtual: true },
);

jest.mock(
  "react-native-share",
  () => ({
    __esModule: true,
    default: {
      open: (...a: unknown[]) => mockOpen(...a),
      shareSingle: (...a: unknown[]) => mockShareSingle(...a),
      Social: { INSTAGRAM_STORIES: "instagramstories", SMS: "sms" },
    },
  }),
  { virtual: true },
);

jest.mock(
  "expo-clipboard",
  () => ({ setStringAsync: (...a: unknown[]) => mockSetString(...a) }),
  { virtual: true },
);

import { systemSheet } from "../src/channels/systemSheet";
import { copyLink } from "../src/channels/copyLink";
import { whatsapp } from "../src/channels/whatsapp";
import { instagramStories } from "../src/channels/instagramStories";
import { sms } from "../src/channels/sms";

const PAYLOAD = {
  message: "Join!",
  link: "https://unchaind.app/invite/ABCDE",
  imageUri: "file://card.png",
  fileName: "unchaind-invite",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("systemSheet", () => {
  it("opens the OS sheet with image + caption and reports the target app", async () => {
    mockOpen.mockResolvedValue({ app: "com.apple.UIKit.activity.PostToFacebook" });
    const outcome = await systemSheet().share(PAYLOAD);

    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        message: PAYLOAD.message,
        url: PAYLOAD.imageUri,
        type: "image/png",
        filename: PAYLOAD.fileName,
        failOnCancel: false,
      }),
    );
    expect(outcome).toEqual({
      completed: true,
      channel: "system-sheet",
      targetApp: "com.apple.UIKit.activity.PostToFacebook",
    });
  });

  it("reports not-completed when the user dismisses", async () => {
    mockOpen.mockResolvedValue({ dismissedAction: true });
    const outcome = await systemSheet().share(PAYLOAD);
    expect(outcome).toEqual({ completed: false, channel: "system-sheet" });
  });
});

describe("copyLink", () => {
  it("is available only with a non-empty link", async () => {
    expect(await copyLink().isAvailable(PAYLOAD)).toBe(true);
    expect(await copyLink().isAvailable({})).toBe(false);
  });

  it("copies the link to the clipboard", async () => {
    const outcome = await copyLink().share(PAYLOAD);
    expect(mockSetString).toHaveBeenCalledWith(PAYLOAD.link);
    expect(outcome).toEqual({ completed: true, channel: "link" });
  });
});

describe("whatsapp", () => {
  it("probes for the app in isAvailable", async () => {
    mockCanOpenURL.mockResolvedValue(true);
    expect(await whatsapp().isAvailable(PAYLOAD)).toBe(true);
    expect(mockCanOpenURL).toHaveBeenCalledWith("whatsapp://send");
  });

  it("shares via the system sheet (not a direct deep link)", async () => {
    mockOpen.mockResolvedValue({ app: "net.whatsapp.WhatsApp" });
    const outcome = await whatsapp().share(PAYLOAD);
    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(mockShareSingle).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({ completed: true, channel: "whatsapp" });
  });
});

describe("instagramStories", () => {
  it("is unavailable without an image even if Instagram is installed", async () => {
    mockCanOpenURL.mockResolvedValue(true);
    expect(await instagramStories({ appId: "1" }).isAvailable({ imageUri: undefined })).toBe(false);
  });

  it("shares the image as the story background with the app id", async () => {
    mockShareSingle.mockResolvedValue({});
    const outcome = await instagramStories({ appId: "660498823268206" }).share(PAYLOAD);
    expect(mockShareSingle).toHaveBeenCalledWith(
      expect.objectContaining({
        social: "instagramstories",
        backgroundImage: PAYLOAD.imageUri,
        appId: "660498823268206",
      }),
    );
    expect(outcome).toEqual({ completed: true, channel: "instagram" });
  });
});

describe("sms", () => {
  it("shares the full message + image via the SMS composer", async () => {
    mockShareSingle.mockResolvedValue({});
    const outcome = await sms().share(PAYLOAD);
    expect(mockShareSingle).toHaveBeenCalledWith(
      expect.objectContaining({ social: "sms", message: PAYLOAD.message, url: PAYLOAD.imageUri }),
    );
    expect(outcome).toEqual({ completed: true, channel: "messages" });
  });
});
