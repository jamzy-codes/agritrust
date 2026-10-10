export type DataRecord = Record<string, unknown>;

function readValue(record: DataRecord | null | undefined, keys: string[]): unknown {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return null;
}

function asString(record: DataRecord | null | undefined, keys: string[]): string | null {
  const value = readValue(record, keys);

  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function asBoolean(record: DataRecord | null | undefined, keys: string[]): boolean | null {
  const value = readValue(record, keys);

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return null;
}

function asNumber(record: DataRecord | null | undefined, keys: string[]): number | null {
  const value = readValue(record, keys);

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asRecord(record: DataRecord | null | undefined, keys: string[]): Record<string, unknown> | null {
  const value = readValue(record, keys);

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

export interface NormalizedFarmRecord {
  id: string | null;
  owner_id: string | null;
  farm_name: string | null;
  name: string | null;
  location: string | null;
  region: string | null;
  gps_coordinates: string | null;
  nasc_registration: string | null;
  primary_crops: unknown;
  farm_photo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface NormalizedBatchRecord {
  id: string | null;
  batch_id: string | null;
  farm_id: string | null;
  registered_by: string | null;
  crop_type: string | null;
  quantity_kg: number | null;
  seed_variety: string | null;
  is_gmo_free: boolean | null;
  gmo_status: string | null;
  status: string | null;
  metadata_uri: string | null;
  metadata_hash: string | null;
  tx_hash: string | null;
  registered_at: string | null;
  updated_at: string | null;
}

export function normalizeFarmRecord(record: DataRecord | null | undefined): NormalizedFarmRecord {
  if (!record) {
    return {
      id: null,
      owner_id: null,
      farm_name: null,
      name: null,
      location: null,
      region: null,
      gps_coordinates: null,
      nasc_registration: null,
      primary_crops: null,
      farm_photo_url: null,
      created_at: null,
      updated_at: null,
    };
  }

  return {
    id: asString(record, ["id"]),
    owner_id: asString(record, ["owner_id", "ownerId"]),
    farm_name: asString(record, ["farm_name", "name"]),
    name: asString(record, ["name", "farm_name"]),
    location: asString(record, ["location", "region"]),
    region: asString(record, ["region", "location"]),
    gps_coordinates: asString(record, ["gps_coordinates", "gpsCoordinates"]),
    nasc_registration: asString(record, ["nasc_registration", "nascRegistration"]),
    primary_crops: readValue(record, ["primary_crops", "primaryCrops"]),
    farm_photo_url: asString(record, ["farm_photo_url", "farmPhotoUrl"]),
    created_at: asString(record, ["created_at", "createdAt"]),
    updated_at: asString(record, ["updated_at", "updatedAt"]),
  };
}

export function buildFarmPayload(body: DataRecord) {
  const farmName = asString(body, ["farmName", "farm_name", "name"]);
  const location = asString(body, ["location", "region"]);
  const ownerId = asString(body, ["ownerId", "owner_id"]);

  return {
    owner_id: ownerId,
    farm_name: farmName,
    name: farmName,
    location,
    region: location,
    gps_coordinates: asString(body, ["gpsCoordinates", "gps_coordinates"]),
    nasc_registration: asString(body, ["nascRegistration", "nasc_registration"]),
    primary_crops: readValue(body, ["primaryCrops", "primary_crops"]),
    farm_photo_url: asString(body, ["farmPhotoUrl", "farm_photo_url"]),
  };
}

export function normalizeBatchRecord(record: DataRecord | null | undefined): NormalizedBatchRecord {
  if (!record) {
    return {
      id: null,
      batch_id: null,
      farm_id: null,
      registered_by: null,
      crop_type: null,
      quantity_kg: null,
      seed_variety: null,
      is_gmo_free: null,
      gmo_status: null,
      status: null,
      metadata_uri: null,
      metadata_hash: null,
      tx_hash: null,
      registered_at: null,
      updated_at: null,
    };
  }

  return {
    id: asString(record, ["id"]),
    batch_id: asString(record, ["batch_id", "batchId", "batch_number"]),
    farm_id: asString(record, ["farm_id", "farmId"]),
    registered_by: asString(record, ["registered_by", "registeredBy"]),
    crop_type: asString(record, ["crop_type", "cropType"]),
    quantity_kg: asNumber(record, ["quantity_kg", "quantityKg"]),
    seed_variety: asString(record, ["seed_variety", "seedVariety"]),
    is_gmo_free: asBoolean(record, ["is_gmo_free", "isGMOFree"]),
    gmo_status: asString(record, ["gmo_status", "gmoStatus"]),
    status: asString(record, ["status"]),
    metadata_uri: asString(record, ["metadata_uri", "metadataUri"]),
    metadata_hash: asString(record, ["metadata_hash", "metadataHash"]),
    tx_hash: asString(record, ["tx_hash", "txHash"]),
    registered_at: asString(record, ["registered_at", "registeredAt"]),
    updated_at: asString(record, ["updated_at", "updatedAt"]),
  };
}

export function buildBatchPayload(body: DataRecord) {
  const batchId = asString(body, ["batchId", "batch_id", "batch_number"]);
  const farmId = asString(body, ["farmId", "farm_id"]);
  const registeredBy = asString(body, ["registeredBy", "registered_by"]);

  return {
    batch_id: batchId,
    id: batchId,
    farm_id: farmId,
    registered_by: registeredBy,
    crop_type: asString(body, ["cropType", "crop_type"]),
    quantity_kg: asNumber(body, ["quantityKg", "quantity_kg"]) ?? 0,
    seed_variety: asString(body, ["seedVariety", "seed_variety"]),
    is_gmo_free: asBoolean(body, ["isGMOFree", "is_gmo_free"]) ?? false,
    gmo_status: asString(body, ["gmoStatus", "gmo_status"]) ?? "farmer_declared",
    status: asString(body, ["status"]) ?? "REGISTERED",
    tx_hash: asString(body, ["txHash", "tx_hash"]),
    metadata_uri: asString(body, ["metadataUri", "metadata_uri"]),
    metadata_hash: asString(body, ["metadataHash", "metadata_hash"]),
  };
}

export interface NormalizedInspectionRecord {
  id: string | null;
  batch_id: string | null;
  inspector_id: string | null;
  result: string | null;
  notes: string | null;
  passed: boolean | null;
  quality_grade: string | null;
  gmo_test_result: string | null;
  certificate_issued: boolean | null;
  tx_hash: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function normalizeInspectionRecord(record: DataRecord | null | undefined): NormalizedInspectionRecord {
  if (!record) {
    return {
      id: null,
      batch_id: null,
      inspector_id: null,
      result: null,
      notes: null,
      passed: null,
      quality_grade: null,
      gmo_test_result: null,
      certificate_issued: null,
      tx_hash: null,
      created_at: null,
      updated_at: null,
    };
  }

  return {
    id: asString(record, ["id"]),
    batch_id: asString(record, ["batch_id", "batchId"]),
    inspector_id: asString(record, ["inspector_id", "inspectorId"]),
    result: asString(record, ["result", "inspection_result"]),
    notes: asString(record, ["notes"]),
    passed: asBoolean(record, ["passed"]),
    quality_grade: asString(record, ["quality_grade", "qualityGrade"]),
    gmo_test_result: asString(record, ["gmo_test_result", "gmoTestResult"]),
    certificate_issued: asBoolean(record, ["certificate_issued", "certificateIssued"]),
    tx_hash: asString(record, ["tx_hash", "txHash"]),
    created_at: asString(record, ["created_at", "createdAt"]),
    updated_at: asString(record, ["updated_at", "updatedAt"]),
  };
}

export function buildInspectionPayload(body: DataRecord) {
  return {
    batch_id: asString(body, ["batchId", "batch_id"]),
    inspector_id: asString(body, ["inspectorId", "inspector_id"]),
    result: asString(body, ["result", "inspection_result"]) ?? "PENDING",
    notes: asString(body, ["notes"]),
    passed: asBoolean(body, ["passed"]) ?? false,
    quality_grade: asString(body, ["qualityGrade", "quality_grade"]),
    gmo_test_result: asString(body, ["gmoTestResult", "gmo_test_result"]),
    certificate_issued: asBoolean(body, ["certificateIssued", "certificate_issued"]) ?? false,
    tx_hash: asString(body, ["txHash", "tx_hash"]),
  };
}

export interface NormalizedCertificateRecord {
  id: string | null;
  batch_id: string | null;
  inspector_id: string | null;
  certificate_number: string | null;
  status: string | null;
  issued_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function normalizeCertificateRecord(record: DataRecord | null | undefined): NormalizedCertificateRecord {
  if (!record) {
    return {
      id: null,
      batch_id: null,
      inspector_id: null,
      certificate_number: null,
      status: null,
      issued_at: null,
      expires_at: null,
      revoked_at: null,
      created_at: null,
      updated_at: null,
    };
  }

  return {
    id: asString(record, ["id"]),
    batch_id: asString(record, ["batch_id", "batchId"]),
    inspector_id: asString(record, ["inspector_id", "inspectorId"]),
    certificate_number: asString(record, ["certificate_number", "certificateNumber"]),
    status: asString(record, ["status"]),
    issued_at: asString(record, ["issued_at", "issuedAt"]),
    expires_at: asString(record, ["expires_at", "expiresAt"]),
    revoked_at: asString(record, ["revoked_at", "revokedAt"]),
    created_at: asString(record, ["created_at", "createdAt"]),
    updated_at: asString(record, ["updated_at", "updatedAt"]),
  };
}

export function buildCertificatePayload(body: DataRecord) {
  return {
    batch_id: asString(body, ["batchId", "batch_id"]),
    inspector_id: asString(body, ["inspectorId", "inspector_id"]),
    certificate_number: asString(body, ["certificateNumber", "certificate_number"]),
    status: asString(body, ["status"]) ?? "ACTIVE",
    issued_at: asString(body, ["issuedAt", "issued_at"]) ?? new Date().toISOString(),
    expires_at: asString(body, ["expiresAt", "expires_at"]),
    revoked_at: asString(body, ["revokedAt", "revoked_at"]),
  };
}

export interface NormalizedAuditLogRecord {
  id: string | null;
  actor_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  action: string | null;
  details_json: Record<string, unknown> | null;
  created_at: string | null;
}

export function normalizeAuditLogRecord(record: DataRecord | null | undefined): NormalizedAuditLogRecord {
  if (!record) {
    return {
      id: null,
      actor_id: null,
      entity_type: null,
      entity_id: null,
      action: null,
      details_json: null,
      created_at: null,
    };
  }

  return {
    id: asString(record, ["id"]),
    actor_id: asString(record, ["actor_id", "actorId"]),
    entity_type: asString(record, ["entity_type", "entityType"]),
    entity_id: asString(record, ["entity_id", "entityId"]),
    action: asString(record, ["action"]),
    details_json: asRecord(record, ["details_json", "details"]) ?? {},
    created_at: asString(record, ["created_at", "createdAt"]),
  };
}

export function buildAuditLogPayload(body: DataRecord) {
  return {
    actor_id: asString(body, ["actorId", "actor_id"]),
    entity_type: asString(body, ["entityType", "entity_type"]),
    entity_id: asString(body, ["entityId", "entity_id"]),
    action: asString(body, ["action"]),
    details_json: asRecord(body, ["details", "details_json"]) ?? {},
  };
}
