/**
 * captureCardImage must ask view-shot for the same output pixels on both platforms:
 * view-shot reads width/height as points on iOS and as pixels on Android.
 */

const mockCaptureRef = jest.fn();
const mockPlatform = { OS: "ios" };
const mockPixelRatio = { get: () => 3 };

jest.mock(
  "react-native",
  () => ({ Platform: mockPlatform, PixelRatio: mockPixelRatio }),
  { virtual: true }
);
jest.mock(
  "react-native-view-shot",
  () => ({ captureRef: (...a: unknown[]) => mockCaptureRef(...a) }),
  { virtual: true }
);
jest.mock(
  "expo-file-system/legacy",
  () => ({
    cacheDirectory: "file:///cache/",
    copyAsync: jest.fn(),
    deleteAsync: jest.fn(),
  }),
  { virtual: true }
);

import { captureCardImage } from "../src/capture";

beforeEach(() =>
  mockCaptureRef.mockReset().mockResolvedValue("file:///tmp/x.png")
);

test("iOS: divides the pixel size by the device scale (view-shot takes points)", async () => {
  mockPlatform.OS = "ios";
  await captureCardImage({ current: null }, { fileName: "card.png" });
  expect(mockCaptureRef.mock.calls[0][1]).toMatchObject({
    width: 360,
    height: 640,
  });
});

test("Android: passes the pixel size through", async () => {
  mockPlatform.OS = "android";
  const uri = await captureCardImage(
    { current: null },
    { fileName: "card.png" }
  );
  expect(mockCaptureRef.mock.calls[0][1]).toMatchObject({
    width: 1080,
    height: 1920,
  });
  expect(uri).toBe("file:///cache/card.png");
});
