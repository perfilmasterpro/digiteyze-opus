export type ContactEnrichment = { whatsapp?: string; instagram?: string; phone?: string };

const TIMEOUT_MS = 6000;
const MAX_HTML = 1_000_000;
const MAX_REDIRECTS = 3;

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return null;
    return url;
  } catch {
    return null;
  }
}

function extract(html: string, pattern: RegExp) {
  return html.match(pattern)?.[0];
}

function cleanUrl(value?: string) {
  return value?.replace(/[)&,.;]+$/, "");
}

function cleanInstagram(value?: string) {
  return cleanUrl(value)?.split("?")[0];
}

function cleanPhone(value?: string) {
  if (!value) return undefined;
  const decoded = value.replace(/&(?:amp|quot);/gi, "");
  const digits = decoded.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? decoded.replace(/[\"'<>]/g, "").trim() : undefined;
}

async function fetchHtml(url: URL, signal: AbortSignal, redirectsLeft: number): Promise<string | null> {
  const response = await fetch(url, {
    signal,
    redirect: "manual",
    headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "GrowthOS-ProspectEnrichment/1.0" },
  });

  if (response.status >= 300 && response.status < 400) {
    if (redirectsLeft <= 0) return null;
    const location = response.headers.get("location");
    if (!location) return null;
    const nextUrl = safeUrl(new URL(location, url).toString());
    if (!nextUrl) return null;
    return fetchHtml(nextUrl, signal, redirectsLeft - 1);
  }

  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) return null;
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_HTML) return null;

  return (await response.text()).slice(0, MAX_HTML);
}

export async function enrichWebsiteContacts(website: string): Promise<ContactEnrichment> {
  const url = safeUrl(website);
  if (!url) return {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const html = await fetchHtml(url, controller.signal, MAX_REDIRECTS);
    if (!html) return {};

    const whatsapp = extract(html, /https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[^\"'<>\s]+/i);
    const instagram = extract(html, /https?:\/\/(?:www\.)?instagram\.com\/[^\"'<>\s]+/i);
    const telHref = extract(html, /(?:href\s*=\s*[\"'])tel:\s*[^\"'<>]+/i);
    const phone = telHref?.replace(/^href\s*=\s*[\"']tel:\s*/i, "");

    return {
      whatsapp: cleanUrl(whatsapp),
      instagram: cleanInstagram(instagram),
      phone: cleanPhone(phone),
    };
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}