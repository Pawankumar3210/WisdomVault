let sentryClient = null;

export async function initMonitoring() {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  if (!dsn) return;

  try {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      release: process.env.REACT_APP_VERSION || undefined,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
    sentryClient = Sentry;
  } catch {
  }
}

export function captureError(error, context = {}) {
  if (!sentryClient) return;
  sentryClient.captureException(error, { extra: context });
}
