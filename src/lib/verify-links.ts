export function buildVerificationUrl(origin: string, batchId: string): string {
  const normalizedOrigin = origin.replace(/\/$/, "");
  return `${normalizedOrigin}/verify/${encodeURIComponent(batchId)}`;
}
