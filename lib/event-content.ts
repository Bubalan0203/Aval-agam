import sanitizeHtml from "sanitize-html";

export type DescriptionFormat = "text" | "html";
export type YouTubeUrls = [string | null, string | null];

export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export function youtubeVideoId(value: unknown): string | null {
  const safe = safeExternalUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.split("/")[1];
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else if (/^\/(embed|shorts|live)\//.test(url.pathname)) id = url.pathname.split("/")[2];
  }
  return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
}

export function normalizeYouTubeUrls(value: unknown): YouTubeUrls {
  const slots = Array.isArray(value) ? value : [];
  return [0, 1].map((i) => {
    const id = youtubeVideoId(slots[i]);
    return id ? `https://www.youtube.com/watch?v=${id}` : null;
  }) as YouTubeUrls;
}

export function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "blockquote", "pre", "code", "hr", "span", "a"],
    allowedAttributes: { a: ["href", "target", "rel"], span: ["style"], p: ["style"], h2: ["style"], h3: ["style"], h4: ["style"], ol: ["start"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    allowedStyles: {
      "*": {
        "text-align": [/^(left|center|right|justify)$/],
        "font-size": [/^(12|14|16|18|20|24|28|32|36|48)px$/],
        color: [/^#[a-fA-F0-9]{6}$/, /^rgb\(\s*\d{1,3},\s*\d{1,3},\s*\d{1,3}\s*\)$/],
        "background-color": [/^#[a-fA-F0-9]{6}$/, /^rgb\(\s*\d{1,3},\s*\d{1,3},\s*\d{1,3}\s*\)$/],
        "font-family": [/^(Poppins|Arial|Georgia|monospace)(,\s*(sans-serif|serif))?$/],
      },
    },
    transformTags: {
      a: (_tagName, attributes) => ({ tagName: "a", attribs: { ...attributes, target: "_blank", rel: "noopener noreferrer" } }),
    },
  });
}

export function descriptionHtml(value: string, format: DescriptionFormat = "text"): string {
  if (format === "html") return sanitizeDescription(value);
  const escaped = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return escaped.split(/\r?\n/).map((line) => `<p>${line || "<br>"}</p>`).join("");
}

export function descriptionText(value: string, format: DescriptionFormat = "text"): string {
  if (format === "text") return value;
  return sanitizeHtml(sanitizeDescription(value).replace(/<\/(p|h[2-4]|li|blockquote|pre)>|<br\s*\/?\s*>/gi, " "), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
}

export function eventMediaDefaults(data: Record<string, unknown>) {
  return {
    description: typeof data.description === "string" ? data.description : "",
    descriptionFormat: data.descriptionFormat === "html" ? "html" as const : "text" as const,
    youtubeUrls: normalizeYouTubeUrls(data.youtubeUrls),
    gallery: Array.isArray(data.gallery) ? data.gallery.filter((url): url is string => typeof url === "string" && Boolean(safeExternalUrl(url))).slice(0, 4) : [],
    locationUrl: safeExternalUrl(data.locationUrl) ?? "",
  };
}

// Only add missing fields; preserve all existing content and media.
export function legacyEventMediaPatch(data: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (data.youtubeUrls === undefined || data.youtubeUrls === null) patch.youtubeUrls = [null, null];
  if (data.descriptionFormat === undefined || data.descriptionFormat === null) patch.descriptionFormat = "text";
  if (data.gallery === undefined || data.gallery === null) patch.gallery = [];
  return patch;
}
