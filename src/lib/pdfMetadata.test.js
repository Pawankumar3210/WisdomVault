import {
  clearPdfMetadataCache,
  extractPageCount,
  loadPdfMetadata,
} from "./pdfMetadata";

beforeEach(() => {
  window.localStorage.clear();
  clearPdfMetadataCache();
});

afterEach(() => {
  delete global.fetch;
});

test("extracts the highest root page-tree count from PDF objects", () => {
  expect(extractPageCount("16 0 obj\n<< /Type /Pages /Count 1 /Kids [] >>\nendobj")).toBe(1);
  expect(extractPageCount([
    "16 0 obj\n<< /Type /Pages /Count 5 /Kids [] >>\nendobj",
    "17 0 obj\n<< /Count 58 /Type /Pages /Kids [] >>\nendobj",
    "18 0 obj\n<< /Type /Outlines /Count 999 >>\nendobj",
  ].join("\n"))).toBe(58);
  expect(extractPageCount("18 0 obj\n<< /Type /Outlines /Count 110 >>\nendobj")).toBeNull();
  expect(extractPageCount("16 0 obj\n<< /Type /Pages /Count 0 >>\nendobj")).toBeNull();
  expect(extractPageCount("no page count")).toBeNull();
  expect(extractPageCount(null)).toBeNull();
});

test("loads metadata through HEAD and a range request, then caches it", async () => {
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      headers: {
        get: name => ({
          "content-length": "1113046",
          "accept-ranges": "bytes",
        }[name] || null),
      },
    })
    .mockResolvedValueOnce({
      status: 206,
      headers: { get: () => null },
      text: async () => "16 0 obj\n<< /Type /Pages /Count 58 /Kids [] >>\nendobj",
    });
  global.fetch = fetchMock;

  await expect(loadPdfMetadata("https://example.com/manual.pdf")).resolves.toEqual({
    fileSize: 1113046,
    pageCount: 58,
  });

  await expect(loadPdfMetadata("https://example.com/manual.pdf")).resolves.toEqual({
    fileSize: 1113046,
    pageCount: 58,
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("falls back to a larger tail range when the page tree is farther back", async () => {
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      headers: {
        get: name => (name === "content-length" ? "2453042" : null),
      },
    })
    .mockResolvedValueOnce({
      status: 206,
      headers: { get: () => null },
      text: async () => "20 0 obj\n<< /Type /Pages /Count 0 >>\nendobj",
    })
    .mockResolvedValueOnce({
      status: 206,
      headers: { get: () => null },
      text: async () => "12 0 obj\n<< /Type /Outlines /Count 110 >>\nendobj",
    })
    .mockResolvedValueOnce({
      status: 206,
      headers: { get: () => null },
      text: async () => "1826 0 obj\n<< /Type /Pages /Count 84 /Kids [] >>\nendobj",
    });
  global.fetch = fetchMock;

  await expect(loadPdfMetadata("https://example.com/deck.pdf")).resolves.toEqual({
    fileSize: 2453042,
    pageCount: 84,
  });
  expect(fetchMock).toHaveBeenCalledTimes(4);
});
