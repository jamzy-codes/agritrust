import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildVerificationUrl,
  isLocalVerificationUrl,
  resolvePublicAppOrigin,
} from "./verify-links";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verification links", () => {
  it("encodes the batch id into the public verification link", () => {
    expect(buildVerificationUrl("https://example.com", "AGT-6816")).toBe(
      "https://example.com/verify/AGT-6816",
    );
  });

  it("supports encoded batch ids and strips a trailing slash", () => {
    expect(buildVerificationUrl("https://agritrust.app/", "AGT-001/REF")).toBe(
      "https://agritrust.app/verify/AGT-001%2FREF",
    );
  });

  it("prefers the configured public application URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://verify.agritrust.example/app/");
    expect(resolvePublicAppOrigin("http://localhost:3000")).toEqual({
      origin: "https://verify.agritrust.example/app",
      source: "configured",
      configurationError: null,
    });
  });

  it("falls back to the browser origin and identifies local-only links", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const resolved = resolvePublicAppOrigin("http://localhost:3000");

    expect(resolved.origin).toBe("http://localhost:3000");
    expect(
      isLocalVerificationUrl(
        buildVerificationUrl(resolved.origin!, "AGT-6816"),
      ),
    ).toBe(true);
    expect(
      isLocalVerificationUrl("https://agritrust.example/verify/AGT-6816"),
    ).toBe(false);
  });
});