import { createSharer } from "../src/createSharer";
import type { ShareChannel, ShareEvent, SharePayload } from "../src/types";

const PAYLOAD: SharePayload = { message: "hi", link: "https://x.co/a", imageUri: "file://a.png" };

/** A test-only channel with configurable availability/outcome/throwing. */
function fakeChannel(
  id: string,
  opts: {
    available?: boolean;
    throwOnShare?: boolean;
    throwOnAvailable?: boolean;
    completed?: boolean;
  } = {},
): ShareChannel & { shareCalls: number } {
  const channel = {
    id,
    shareCalls: 0,
    isAvailable: async () => {
      if (opts.throwOnAvailable) throw new Error("boom");
      return opts.available ?? true;
    },
    share: async () => {
      channel.shareCalls += 1;
      if (opts.throwOnShare) throw new Error("share failed");
      return { completed: opts.completed ?? true, channel: id };
    },
  };
  return channel;
}

describe("createSharer", () => {
  it("routes to the requested channel and returns its outcome", async () => {
    const ig = fakeChannel("instagram");
    const sheet = fakeChannel("system-sheet");
    const sharer = createSharer({ channels: [ig, sheet] });

    const outcome = await sharer.share("instagram", PAYLOAD);

    expect(outcome).toEqual({ completed: true, channel: "instagram" });
    expect(ig.shareCalls).toBe(1);
    expect(sheet.shareCalls).toBe(0);
  });

  it("falls back to system-sheet when the requested channel is unavailable", async () => {
    const ig = fakeChannel("instagram", { available: false });
    const sheet = fakeChannel("system-sheet");
    const sharer = createSharer({ channels: [ig, sheet] });

    const outcome = await sharer.share("instagram", PAYLOAD);

    expect(ig.shareCalls).toBe(0);
    expect(sheet.shareCalls).toBe(1);
    expect(outcome).toMatchObject({ completed: true, channel: "system-sheet", fellBack: true });
  });

  it("falls back when the channel's share() throws", async () => {
    const ig = fakeChannel("instagram", { throwOnShare: true });
    const sheet = fakeChannel("system-sheet");
    const sharer = createSharer({ channels: [ig, sheet] });

    const outcome = await sharer.share("instagram", PAYLOAD);

    expect(outcome).toMatchObject({ channel: "system-sheet", fellBack: true });
  });

  it("treats a throwing isAvailable() as unavailable", async () => {
    const ig = fakeChannel("instagram", { throwOnAvailable: true });
    const sheet = fakeChannel("system-sheet");
    const sharer = createSharer({ channels: [ig, sheet] });

    await sharer.share("instagram", PAYLOAD);
    expect(sheet.shareCalls).toBe(1);
  });

  it("falls back for an unknown channel id", async () => {
    const sheet = fakeChannel("system-sheet");
    const sharer = createSharer({ channels: [sheet] });

    const outcome = await sharer.share("does-not-exist", PAYLOAD);
    expect(outcome).toMatchObject({ channel: "system-sheet", fellBack: true });
  });

  it("does not loop when the fallback itself is the failing channel", async () => {
    const sheet = fakeChannel("system-sheet", { throwOnShare: true });
    const sharer = createSharer({ channels: [sheet] });

    const outcome = await sharer.share("system-sheet", PAYLOAD);
    // Only the direct attempt runs; no recursion into fallback (same id).
    expect(sheet.shareCalls).toBe(1);
    expect(outcome).toEqual({ completed: false, channel: "system-sheet", fellBack: false });
  });

  it("emits the started → completed event pair with the resolved channel", async () => {
    const events: ShareEvent[] = [];
    const ig = fakeChannel("instagram", { available: false });
    const sheet = fakeChannel("system-sheet");
    const sharer = createSharer({ channels: [ig, sheet], onEvent: (e) => events.push(e) });

    await sharer.share("instagram", PAYLOAD);

    expect(events.map((e) => e.type)).toEqual([
      "share_started",
      "share_unavailable",
      "share_completed",
    ]);
    const completed = events.find((e) => e.type === "share_completed");
    expect(completed).toMatchObject({ channel: "system-sheet", fellBack: true });
  });

  it("never lets a throwing onEvent break the share", async () => {
    const sheet = fakeChannel("system-sheet");
    const sharer = createSharer({
      channels: [sheet],
      onEvent: () => {
        throw new Error("analytics down");
      },
    });

    await expect(sharer.share("system-sheet", PAYLOAD)).resolves.toMatchObject({ completed: true });
  });

  it("throws on duplicate channel ids at construction", () => {
    expect(() => createSharer({ channels: [fakeChannel("x"), fakeChannel("x")] })).toThrow(
      /Duplicate channel id/,
    );
  });

  it("exposes channel ids in registration order", () => {
    const sharer = createSharer({
      channels: [fakeChannel("link"), fakeChannel("instagram"), fakeChannel("system-sheet")],
    });
    expect(sharer.channelIds).toEqual(["link", "instagram", "system-sheet"]);
    expect(sharer.has("instagram")).toBe(true);
    expect(sharer.has("nope")).toBe(false);
  });
});
