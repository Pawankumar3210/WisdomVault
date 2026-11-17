import { track } from "@vercel/analytics";

function cleanProperties(properties = {}) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) =>
      ["string", "number", "boolean", "undefined"].includes(typeof value) ||
      value === null
    )
  );
}

export function trackEvent(name, properties = {}) {
  if (typeof window === "undefined") return;

  try {
    track(name, cleanProperties(properties));
  } catch {
  }
}
