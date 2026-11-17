const CACHE_PREFIX = "wv:pdf-metadata:v1:";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const RANGE_SIZE = 128 * 1024;
const DEEP_RANGE_SIZE = 512 * 1024;

function hasStorage() {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function readCache(url) {
  if (!hasStorage() || !url) return null;

  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${url}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.cachedAt !== "number" || Date.now() - entry.cachedAt > CACHE_TTL) {
      return null;
    }
    return {
      fileSize: Number(entry.fileSize) || null,
      pageCount: Number(entry.pageCount) || null,
    };
  } catch {
    return null;
  }
}

function writeCache(url, metadata) {
  if (!hasStorage() || !url || (!metadata.fileSize && !metadata.pageCount)) return;

  try {
    window.localStorage.setItem(`${CACHE_PREFIX}${url}`, JSON.stringify({
      ...metadata,
      cachedAt: Date.now(),
    }));
  } catch {
  }
}

function parseContentLength(value) {
  const size = Number(value);
  return Number.isFinite(size) && size > 0 ? size : null;
}

function parseRangeSize(value) {
  if (!value) return null;
  const match = value.match(/\/(\d+)\s*$/);
  return match ? parseContentLength(match[1]) : null;
}

export function extractPageCount(text) {
  if (typeof text !== "string" || !text) return null;

  const counts = [];

  for (const match of text.matchAll(/(\d+)\s+(\d+)\s+obj\b([\s\S]*?)endobj/g)) {
    const objectBody = match[3];
    if (!/\/Type\s*\/Pages\b/.test(objectBody)) continue;

    const countMatch = objectBody.match(/\/Count\s+(\d+)/);
    if (!countMatch) continue;

    const count = Number(countMatch[1]);
    if (Number.isInteger(count) && count > 0 && count < 10000) counts.push(count);
  }

  if (!counts.length) return null;
  return Math.max(...counts);
}

async function fetchRange(url, range, signal) {
  try {
    const response = await fetch(url, {
      headers: { Range: range },
      signal,
    });

    if (response.status !== 206) return null;

    return {
      text: await response.text(),
      size: parseRangeSize(response.headers.get("content-range")),
    };
  } catch (error) {
    if (error.name === "AbortError") throw error;
    return null;
  }
}

export async function loadPdfMetadata(url, { signal } = {}) {
  if (!url) return { fileSize: null, pageCount: null };

  const cached = readCache(url);
  if (cached) return cached;

  let fileSize = null;

  try {
    const response = await fetch(url, { method: "HEAD", signal });
    if (response.ok) {
      fileSize = parseContentLength(response.headers.get("content-length"));
    }
  } catch (error) {
    if (error.name === "AbortError") throw error;
  }

  const head = await fetchRange(url, `bytes=0-${RANGE_SIZE - 1}`, signal);
  if (!fileSize) fileSize = head?.size || null;

  let pageCount = head ? extractPageCount(head.text) : null;

  if (!pageCount) {
    const tail = await fetchRange(url, `bytes=-${RANGE_SIZE}`, signal);
    pageCount = tail ? extractPageCount(tail.text) : null;
  }

  if (!pageCount) {
    const deepTail = await fetchRange(url, `bytes=-${DEEP_RANGE_SIZE}`, signal);
    pageCount = deepTail ? extractPageCount(deepTail.text) : null;
  }

  const metadata = {
    fileSize: fileSize || null,
    pageCount: pageCount || null,
  };

  writeCache(url, metadata);
  return metadata;
}

export function clearPdfMetadataCache() {
  if (!hasStorage()) return;

  try {
    const keys = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(CACHE_PREFIX)) keys.push(key);
    }
    keys.forEach(key => window.localStorage.removeItem(key));
  } catch {
  }
}

export { CACHE_PREFIX, CACHE_TTL };
