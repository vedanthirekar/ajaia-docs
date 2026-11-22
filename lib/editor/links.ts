const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/** Turn what a user typed into a safe link href (bare domains get https://). */
export function normalizeLinkUrl(raw: string): { ok: true; href: string } | { ok: false; error: string } {
  const input = raw.trim();
  if (!input) return { ok: false, error: "Enter a link" };
  if (/\s/.test(input)) return { ok: false, error: "That doesn't look like a link" };

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(input);
  const candidate = hasScheme ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, error: "That doesn't look like a link" };
  }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { ok: false, error: "Only http, https and mailto links are allowed" };
  }
  if (url.protocol !== "mailto:" && !url.hostname.includes(".") && url.hostname !== "localhost") {
    return { ok: false, error: "That doesn't look like a link" };
  }
  return { ok: true, href: candidate };
}
