import { formatFileSize, formatRelativeTime } from "./format";

test("formats file sizes across units", () => {
  expect(formatFileSize(0)).toBe("");
  expect(formatFileSize(-1)).toBe("");
  expect(formatFileSize(1024)).toBe("1 KB");
  expect(formatFileSize(1536)).toBe("1.5 KB");
  expect(formatFileSize(1113046)).toBe("1.1 MB");
  expect(formatFileSize(20 * 1024 * 1024)).toBe("20 MB");
});

test("formats recent timestamps and ignores invalid values", () => {
  const now = new Date("2026-01-15T12:00:00Z").getTime();

  expect(formatRelativeTime(null, now)).toBe("");
  expect(formatRelativeTime(now - 30000, now)).toBe("just now");
  expect(formatRelativeTime(now - 5 * 60000, now)).toBe("5m ago");
  expect(formatRelativeTime(now - 3 * 3600000, now)).toBe("3h ago");
  expect(formatRelativeTime(now - 2 * 86400000, now)).toBe("2d ago");
});
