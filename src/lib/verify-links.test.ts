import { describe, expect, it } from "vitest";

import { buildVerificationUrl } from "./verify-links";

describe("buildVerificationUrl", () => {
  it("encodes the batch id into the public verification link", () => {
    expect(buildVerificationUrl("https://example.com", "AGT-0042")).toBe(
      "https://example.com/verify/AGT-0042",
    );
  });

  it("supports encoded batch ids and preserves host origin", () => {
    expect(buildVerificationUrl("https://agritrust.app", "AGT-001/REF")).toBe(
      "https://agritrust.app/verify/AGT-001%2FREF",
    );
  });
});
