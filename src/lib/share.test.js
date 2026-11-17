import { copyPdfLink, sharePdf } from "./share";

function setNavigatorValue(name, value) {
  Object.defineProperty(navigator, name, {
    configurable: true,
    value,
  });
}

afterEach(() => {
  setNavigatorValue("clipboard", undefined);
  setNavigatorValue("share", undefined);
});

test("copies the document URL to the clipboard", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  setNavigatorValue("clipboard", { writeText });

  await expect(copyPdfLink("/pdf/doc-a")).resolves.toBe(true);
  expect(writeText).toHaveBeenCalledWith("http://localhost/pdf/doc-a");
});

test("uses the native share sheet when available", async () => {
  const share = jest.fn().mockResolvedValue(undefined);
  setNavigatorValue("share", share);

  const result = await sharePdf({
    title: "ML Lab Manual",
    subjectName: "Machine Learning",
    path: "/pdf/doc-a",
  });

  expect(result.status).toBe("shared");
  expect(share).toHaveBeenCalledWith({
    title: "ML Lab Manual | Wisdom Vault",
    text: "ML Lab Manual from Machine Learning on Wisdom Vault",
    url: "http://localhost/pdf/doc-a",
  });
});

test("treats an aborted native share as cancelled", async () => {
  setNavigatorValue("share", jest.fn().mockRejectedValue({ name: "AbortError" }));

  await expect(sharePdf({
    title: "ML Lab Manual",
    subjectName: "Machine Learning",
    path: "/pdf/doc-a",
  })).resolves.toMatchObject({ status: "cancelled" });
});
