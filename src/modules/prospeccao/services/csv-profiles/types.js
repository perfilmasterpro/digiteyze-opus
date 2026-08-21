export function isIgnored(r) {
    return !!r && typeof r === "object" && "__ignoredReason" in r;
}
export function normalizeHeaderKey(h) {
    return h
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}
