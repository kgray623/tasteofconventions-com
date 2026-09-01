/**
 * Helpers for guest-shared video links (YouTube, Vimeo, Drive, Dropbox, …).
 * Used when a video is too long to upload directly to the shared album.
 */

export type VideoLinkInfo = {
  /** Normalized https URL to store and open. */
  url: string;
  /** Human label for where the video lives ("YouTube", "Google Drive", …). */
  provider: string;
  /** Embeddable URL when the provider supports iframe playback. */
  embedUrl: string | null;
  /** Poster image when the provider exposes one. */
  thumbnailUrl: string | null;
};

function hostOf(url: URL) {
  return url.hostname.replace(/^www\./i, "").toLowerCase();
}

function youTubeId(url: URL): string | null {
  const host = hostOf(url);
  if (host === "youtu.be") return url.pathname.slice(1).split("/")[0] || null;
  if (host.endsWith("youtube.com") || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "shorts" || p === "embed" || p === "live" || p === "v");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]!;
  }
  return null;
}

function vimeoId(url: URL): string | null {
  if (hostOf(url) !== "vimeo.com") return null;
  const first = url.pathname.split("/").filter(Boolean)[0];
  return first && /^\d+$/.test(first) ? first : null;
}

function googleDriveId(url: URL): string | null {
  if (hostOf(url) !== "drive.google.com") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const dIdx = parts.indexOf("d");
  if (dIdx >= 0 && parts[dIdx + 1]) return parts[dIdx + 1]!;
  return url.searchParams.get("id");
}

/**
 * Validate and describe a pasted video link. Returns null when the text is not
 * a usable http(s) web address, so callers can show a friendly message.
 */
export function parseVideoLink(raw: string): VideoLinkInfo | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  // A scheme other than http(s) (mailto:, sms:, javascript:) is never a video page.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  // Force https: every provider we accept supports it, and mixed content is blocked.
  url.protocol = "https:";
  const host = hostOf(url);
  if (!host.includes(".")) return null;

  const yt = youTubeId(url);
  if (yt) {
    return {
      url: `https://www.youtube.com/watch?v=${yt}`,
      provider: "YouTube",
      embedUrl: `https://www.youtube.com/embed/${yt}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
    };
  }

  const vim = vimeoId(url);
  if (vim) {
    return {
      url: `https://vimeo.com/${vim}`,
      provider: "Vimeo",
      embedUrl: `https://player.vimeo.com/video/${vim}`,
      thumbnailUrl: null,
    };
  }

  const drive = googleDriveId(url);
  if (drive) {
    return {
      url: url.toString(),
      provider: "Google Drive",
      embedUrl: `https://drive.google.com/file/d/${drive}/preview`,
      thumbnailUrl: null,
    };
  }

  const providers: Array<[string, string]> = [
    ["dropbox.com", "Dropbox"],
    ["onedrive.live.com", "OneDrive"],
    ["1drv.ms", "OneDrive"],
    ["sharepoint.com", "OneDrive"],
    ["icloud.com", "iCloud"],
    ["photos.google.com", "Google Photos"],
    ["facebook.com", "Facebook"],
    ["instagram.com", "Instagram"],
    ["tiktok.com", "TikTok"],
  ];
  const match = providers.find(([h]) => host === h || host.endsWith(`.${h}`));
  return {
    url: url.toString(),
    provider: match ? match[1] : host,
    embedUrl: null,
    thumbnailUrl: null,
  };
}
