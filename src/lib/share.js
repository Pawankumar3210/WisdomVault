function buildShareUrl(path) {
  if (typeof window === "undefined") return "";
  return new URL(path || window.location.pathname, window.location.origin).toString();
}

async function copyWithClipboard(text) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function copyWithTextarea(text) {
  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function copyPdfLink(path) {
  const url = buildShareUrl(path);
  if (!url) return false;

  return (await copyWithClipboard(url)) || copyWithTextarea(url);
}

export async function sharePdf({ title, subjectName, path }) {
  const url = buildShareUrl(path);
  const shareData = {
    title: `${title || "Document"} | Wisdom Vault`,
    text: subjectName
      ? `${title} from ${subjectName} on Wisdom Vault`
      : `${title} on Wisdom Vault`,
    url,
  };

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(shareData);
      return { status: "shared", url };
    } catch (error) {
      if (error.name === "AbortError") return { status: "cancelled", url };
    }
  }

  const copied = await copyPdfLink(path);
  return { status: copied ? "copied" : "failed", url };
}
