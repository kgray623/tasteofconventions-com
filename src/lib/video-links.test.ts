import { describe, expect, it } from "vitest";
import { parseVideoLink } from "./video-links";

describe("parseVideoLink", () => {
  it("recognizes youtu.be short links", () => {
    const info = parseVideoLink("https://youtu.be/dQw4w9WgXcQ");
    expect(info).toMatchObject({
      provider: "YouTube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
    expect(info?.thumbnailUrl).toContain("dQw4w9WgXcQ");
  });

  it("recognizes watch URLs, shorts and extra query params", () => {
    expect(parseVideoLink("youtube.com/watch?v=abc123XYZ_-&t=30s")?.embedUrl).toBe(
      "https://www.youtube.com/embed/abc123XYZ_-",
    );
    expect(parseVideoLink("https://www.youtube.com/shorts/abc123XYZ_-")?.provider).toBe("YouTube");
  });

  it("recognizes Vimeo and Google Drive with embeddable players", () => {
    expect(parseVideoLink("https://vimeo.com/123456789")?.embedUrl).toBe(
      "https://player.vimeo.com/video/123456789",
    );
    expect(
      parseVideoLink("https://drive.google.com/file/d/FILEID123/view?usp=sharing")?.embedUrl,
    ).toBe("https://drive.google.com/file/d/FILEID123/preview");
  });

  it("accepts other sharing hosts as plain links", () => {
    expect(parseVideoLink("https://www.dropbox.com/s/xyz/video.mp4?dl=0")).toMatchObject({
      provider: "Dropbox",
      embedUrl: null,
    });
    expect(parseVideoLink("https://www.icloud.com/sharedalbum/#Bxyz")?.provider).toBe("iCloud");
  });

  it("upgrades http to https", () => {
    expect(parseVideoLink("http://vimeo.com/99")?.url).toBe("https://vimeo.com/99");
  });

  it("rejects empty or non-web text", () => {
    expect(parseVideoLink("")).toBeNull();
    expect(parseVideoLink("   ")).toBeNull();
    expect(parseVideoLink("just some words")).toBeNull();
    expect(parseVideoLink("mailto:someone@example.com")).toBeNull();
  });
});
