export interface BatchBlockchainRecord {
  batchId: string;
  owner: string;
  status: number;
  metadataHash: string;
  certificateHash: string;
  hasCertificate: boolean;
}

export const BATCH_STATUS_LABELS: Record<number, string> = {
  0: "REGISTERED",
  1: "INSPECTED",
  2: "IN_TRANSIT",
  3: "DELIVERED",
  4: "FLAGGED",
};

export function buildBatchPayload(batchId: string, metadataHash: string, owner: string) {
  return {
    batchId,
    metadataHash,
    owner,
  };
}
