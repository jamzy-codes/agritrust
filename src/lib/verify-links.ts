export function buildVerificationUrl(origin: string, batchId: string): string {
  const normalizedOrigin = origin.replace(/\/$/, "");
  return `${normalizedOrigin}/verify/${encodeURIComponent(batchId)}`;
}

export interface PublicAppOrigin {
  origin: string | null;
  source: "configured" | "browser" | "unavailable";
  configurationError: string | null;
}

function normalizeHttpOrigin(value?: string | null): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return null;
  }
}

export function resolvePublicAppOrigin(runtimeOrigin?: string): PublicAppOrigin {
  const configuredValue = process.env.NEXT_PUBLIC_APP_URL;
  const configuredOrigin = normalizeHttpOrigin(configuredValue);

  if (configuredOrigin) {
    return {
      origin: configuredOrigin,
      source: "configured",
      configurationError: null,
    };
  }

  const browserOrigin = normalizeHttpOrigin(runtimeOrigin);
  return {
    origin: browserOrigin,
    source: browserOrigin ? "browser" : "unavailable",
    configurationError: configuredValue?.trim()
      ? "NEXT_PUBLIC_APP_URL must be an absolute HTTP or HTTPS URL."
      : null,
  };
}

export function isLocalVerificationUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}