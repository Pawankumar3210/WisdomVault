const RECENT_KEY = "wv:recent-pdfs:v1";
const BOOKMARKS_KEY = "wv:bookmarked-pdfs:v1";
const LIBRARY_EVENT = "wv-library-change";
const MAX_RECENT = 8;
const MAX_BOOKMARKS = 50;

function hasStorage() {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function readEntries(key, timestampKey) {
  if (!hasStorage()) return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(entry => entry && typeof entry.id === "string" && entry.id)
      .map(entry => ({
        id: entry.id,
        [timestampKey]: Number(entry[timestampKey]) || 0,
      }))
      .sort((a, b) => b[timestampKey] - a[timestampKey]);
  } catch {
    return [];
  }
}

function writeEntries(key, entries) {
  if (!hasStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(entries));
    window.dispatchEvent(new Event(LIBRARY_EVENT));
  } catch {
  }
}

export function readLibrary() {
  return {
    recent: readEntries(RECENT_KEY, "viewedAt"),
    bookmarks: readEntries(BOOKMARKS_KEY, "savedAt"),
  };
}

export function subscribeLibrary(callback) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = event => {
    if (!event.key || event.key === RECENT_KEY || event.key === BOOKMARKS_KEY) {
      callback();
    }
  };

  window.addEventListener(LIBRARY_EVENT, callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(LIBRARY_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getLastViewedAt(id) {
  if (!id) return null;
  const entry = readEntries(RECENT_KEY, "viewedAt").find(item => item.id === id);
  return entry?.viewedAt || null;
}

export function recordPdfView(id, now = Date.now()) {
  if (!id || !hasStorage()) return null;

  const previous = getLastViewedAt(id);
  const next = [
    { id, viewedAt: now },
    ...readEntries(RECENT_KEY, "viewedAt").filter(entry => entry.id !== id),
  ].slice(0, MAX_RECENT);

  writeEntries(RECENT_KEY, next);
  return previous;
}

export function toggleBookmark(id, now = Date.now()) {
  if (!id || !hasStorage()) return false;

  const bookmarks = readEntries(BOOKMARKS_KEY, "savedAt");
  const exists = bookmarks.some(entry => entry.id === id);
  const next = exists
    ? bookmarks.filter(entry => entry.id !== id)
    : [{ id, savedAt: now }, ...bookmarks].slice(0, MAX_BOOKMARKS);

  writeEntries(BOOKMARKS_KEY, next);
  return !exists;
}

export function removeBookmark(id) {
  if (!id || !hasStorage()) return;

  const next = readEntries(BOOKMARKS_KEY, "savedAt").filter(entry => entry.id !== id);
  writeEntries(BOOKMARKS_KEY, next);
}

export function isBookmarked(id) {
  if (!id) return false;
  return readEntries(BOOKMARKS_KEY, "savedAt").some(entry => entry.id === id);
}

export function clearRecent() {
  writeEntries(RECENT_KEY, []);
}

export { LIBRARY_EVENT, RECENT_KEY, BOOKMARKS_KEY, MAX_RECENT, MAX_BOOKMARKS };
