import { useEffect } from "react";

const FALLBACK_SITE_URL = "https://wisdomvaultnext.vercel.app";
const DEFAULT_TITLE = "Wisdom Vault | CSE 5th Semester Notes & Question Banks";
const DEFAULT_DESCRIPTION =
  "Access CSE 5th Semester notes, question banks, and previous year papers instantly on Wisdom Vault.";
const DEFAULT_IMAGE = "/icon-512.png";

export const SITE_URL = (process.env.REACT_APP_SITE_URL || FALLBACK_SITE_URL).replace(/\/$/, "");

function absoluteUrl(value) {
  if (!value) return `${SITE_URL}${DEFAULT_IMAGE}`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function setMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);

  if (!content) {
    if (element) element.remove();
    return;
  }

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function setCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

export function usePageMeta({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = DEFAULT_IMAGE,
  robots = "index,follow",
  type = "website",
} = {}) {
  useEffect(() => {
    const fullTitle = title.includes("Wisdom Vault") ? title : `${title} | Wisdom Vault`;
    const canonicalPath = path.startsWith("/") ? path : `/${path}`;
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;
    const imageUrl = absoluteUrl(image);

    document.title = "Wisdom Vault";
    setMeta("name", "description", description);
    setMeta("name", "robots", robots);
    setCanonical(canonicalUrl);

    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:type", type);
    setMeta("property", "og:image", imageUrl);
    setMeta("property", "og:site_name", "Wisdom Vault");

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", imageUrl);
  }, [title, description, path, image, robots, type]);
}
