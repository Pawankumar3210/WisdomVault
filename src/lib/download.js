import { trackEvent } from "./analytics";

export async function downloadPdf(url, title, metadata = {}) {
  if (!url) throw new Error("This document has no PDF file attached.");

  let response;
  try {
    response = await fetch(url);
  } catch {
    trackEvent("pdf_download", { ...metadata, success: false, reason: "network" });
    throw new Error("Could not reach the file. Check your connection and try again.");
  }

  if (!response.ok) {
    trackEvent("pdf_download", { ...metadata, success: false, reason: `http_${response.status}` });
    throw new Error(`The file is unavailable right now (${response.status}).`);
  }

  const blob = await response.blob();
  if (!blob.size) {
    trackEvent("pdf_download", { ...metadata, success: false, reason: "empty_file" });
    throw new Error("The downloaded file is empty. Please try again later.");
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `${String(title || "wisdom-vault-document").replace(/[\\/:*?"<>|]+/g, "_")}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);

  trackEvent("pdf_download", { ...metadata, success: true });
  return true;
}
