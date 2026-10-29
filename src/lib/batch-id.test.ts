import { describe, expect, it } from "vitest";

import {
  batchIdValidationMessage,
  isValidBatchId,
  normalizeBatchId,
} from "./batch-id";

describe("public Batch ID input", () => {
  it("normalizes whitespace and letter case", () => {
    expect(normalizeBatchId("  agt-6816  ")).toBe("AGT-6816");
  });

  it("accepts the generated AgriTrust Batch ID format", () => {
    expect(isValidBatchId("AGT-6816")).toBe(true);
  });

  it("rejects empty and malformed values with useful messages", () => {
    expect(batchIdValidationMessage(" ")).toMatch(/Enter the Batch ID/);
    expect(batchIdValidationMessage("6816")).toBe("Enter a Batch ID in the format AGT-1234.");
    expect(batchIdValidationMessage("AGT-42")).toBe("Enter a Batch ID in the format AGT-1234.");
  });
});
