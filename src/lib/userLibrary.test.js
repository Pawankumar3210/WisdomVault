import {
  clearRecent,
  getLastViewedAt,
  isBookmarked,
  readLibrary,
  recordPdfView,
  removeBookmark,
  subscribeLibrary,
  toggleBookmark,
} from "./userLibrary";

beforeEach(() => {
  window.localStorage.clear();
});

test("records the previous view time and keeps recent documents ordered", () => {
  expect(recordPdfView("doc-a", 1000)).toBeNull();
  expect(recordPdfView("doc-b", 2000)).toBeNull();
  expect(recordPdfView("doc-a", 3000)).toBe(1000);

  expect(readLibrary().recent).toEqual([
    { id: "doc-a", viewedAt: 3000 },
    { id: "doc-b", viewedAt: 2000 },
  ]);
  expect(getLastViewedAt("doc-a")).toBe(3000);
});

test("caps recent history at eight documents", () => {
  for (let index = 0; index < 10; index += 1) {
    recordPdfView(`doc-${index}`, 1000 + index);
  }

  const recent = readLibrary().recent;
  expect(recent).toHaveLength(8);
  expect(recent[0].id).toBe("doc-9");
  expect(recent[7].id).toBe("doc-2");
});

test("toggles bookmarks and removes them", () => {
  expect(toggleBookmark("doc-a", 1000)).toBe(true);
  expect(isBookmarked("doc-a")).toBe(true);
  expect(readLibrary().bookmarks).toEqual([{ id: "doc-a", savedAt: 1000 }]);

  expect(toggleBookmark("doc-a", 2000)).toBe(false);
  expect(isBookmarked("doc-a")).toBe(false);

  toggleBookmark("doc-b", 3000);
  removeBookmark("doc-b");
  expect(readLibrary().bookmarks).toEqual([]);
});

test("clears recent history without affecting bookmarks", () => {
  recordPdfView("doc-a", 1000);
  toggleBookmark("doc-a", 1000);
  clearRecent();

  expect(readLibrary().recent).toEqual([]);
  expect(readLibrary().bookmarks).toHaveLength(1);
});

test("notifies subscribers until they unsubscribe", () => {
  const listener = jest.fn();
  const unsubscribe = subscribeLibrary(listener);

  recordPdfView("doc-a", 1000);
  expect(listener).toHaveBeenCalledTimes(1);

  unsubscribe();
  recordPdfView("doc-b", 2000);
  expect(listener).toHaveBeenCalledTimes(1);
});
