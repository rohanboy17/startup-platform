import { normalizeExternalUrl } from "@/lib/external-url";

type TutorialVideoEmbed =
  | {
      kind: "iframe";
      src: string;
      openUrl: string;
      provider: "youtube" | "loom";
    }
  | {
      kind: "video";
      src: string;
      openUrl: string;
      provider: "direct";
    };

function getYouTubeVideoId(url: URL) {
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id || null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }

    const [, first, second] = url.pathname.split("/");
    if (first === "embed" || first === "shorts" || first === "live") {
      return second || null;
    }
  }

  return null;
}

function getLoomVideoId(url: URL) {
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  if (host !== "loom.com") return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  if (parts[0] === "share" || parts[0] === "embed") {
    return parts[1] || null;
  }

  return null;
}

function isDirectVideoUrl(url: URL) {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url.pathname + url.search);
}

export function normalizeTutorialVideoUrl(value: string | null | undefined) {
  const normalized = normalizeExternalUrl(value);
  if (!normalized) return null;

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return null;
  }

  if (!/^https?:$/i.test(url.protocol)) {
    return null;
  }

  const youtubeId = getYouTubeVideoId(url);
  if (youtubeId) {
    return `https://www.youtube.com/watch?v=${youtubeId}`;
  }

  const loomId = getLoomVideoId(url);
  if (loomId) {
    return `https://www.loom.com/share/${loomId}`;
  }

  if (isDirectVideoUrl(url)) {
    return url.toString();
  }

  return null;
}

export function getTutorialVideoEmbed(
  value: string | null | undefined
): TutorialVideoEmbed | null {
  const normalized = normalizeTutorialVideoUrl(value);
  if (!normalized) return null;

  const url = new URL(normalized);
  const youtubeId = getYouTubeVideoId(url);
  if (youtubeId) {
    return {
      kind: "iframe",
      src: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`,
      openUrl: normalized,
      provider: "youtube",
    };
  }

  const loomId = getLoomVideoId(url);
  if (loomId) {
    return {
      kind: "iframe",
      src: `https://www.loom.com/embed/${loomId}`,
      openUrl: normalized,
      provider: "loom",
    };
  }

  return {
    kind: "video",
    src: normalized,
    openUrl: normalized,
    provider: "direct",
  };
}
