export type ContactEnrichment = { whatsapp?: string; instagram?: string };

const TIMEOUT_MS = 6000;
const MAX_HTML = 1_000_000;

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return null;
    return url;
  } catch { return null; }
}

function extract(html: string, pattern: RegExp) {
  return html.match(pattern)?.[0];
}

export async function enrichWebsiteContacts(website: string): Promise<ContactEnrichment> {
  const url = safeUrl(website);
  if (!url) return {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "GrowthOS-ProspectEnrichment/1.0" },
    });
    if (!response.ok) return {};
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) return {};
    const html = (await response.text()).slice(0, MAX_HTML);
    const whatsapp = extract(html, /https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[^\"'<>\s]+/i);
    const instagram = extract(html, /https?:\/\/(?:www\.)?instagram\.com\/[^\"'<>\s]+/i);
    return {
      whatsapp: whatsapp?.replace(/[)&,.;]+$/, ""),
      instagram: instagram?.replace(/[)&,.;]+$/, "").split("?")[0],
    };
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}
