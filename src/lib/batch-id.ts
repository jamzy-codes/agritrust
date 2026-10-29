export const BATCH_ID_PATTERN = /^AGT-\d{4}$/;

export function normalizeBatchId(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidBatchId(value: string): boolean {
  return BATCH_ID_PATTERN.test(value);
}

export function batchIdValidationMessage(value: string): string | null {
  const normalized = normalizeBatchId(value);
  if (!normalized) return "Enter the Batch ID printed on the produce label or QR record.";
  if (!isValidBatchId(normalized)) {
    return "Enter a Batch ID in the format AGT-1234.";
  }
  return null;
}
