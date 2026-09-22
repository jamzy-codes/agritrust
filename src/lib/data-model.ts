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

export function normalizeFarmRecord(record: Record<string, any> | null | undefined): NormalizedFarmRecord {
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
    id: record.id ?? null,
    owner_id: record.owner_id ?? record.ownerId ?? null,
    farm_name: record.farm_name ?? record.name ?? null,
    name: record.name ?? record.farm_name ?? null,
    location: record.location ?? record.region ?? null,
    region: record.region ?? record.location ?? null,
    gps_coordinates: record.gps_coordinates ?? record.gpsCoordinates ?? null,
    nasc_registration: record.nasc_registration ?? record.nascRegistration ?? null,
    primary_crops: record.primary_crops ?? record.primaryCrops ?? null,
    farm_photo_url: record.farm_photo_url ?? record.farmPhotoUrl ?? null,
    created_at: record.created_at ?? record.createdAt ?? null,
    updated_at: record.updated_at ?? record.updatedAt ?? null,
  };
}

export function buildFarmPayload(body: Record<string, any>) {
  const farmName = body.farmName ?? body.farm_name ?? body.name ?? null;
  const location = body.location ?? body.region ?? null;
  const ownerId = body.ownerId ?? body.owner_id ?? null;

  return {
    owner_id: ownerId,
    farm_name: farmName,
    name: farmName,
    location,
    region: location,
    gps_coordinates: body.gpsCoordinates ?? body.gps_coordinates ?? null,
    nasc_registration: body.nascRegistration ?? body.nasc_registration ?? null,
    primary_crops: Array.isArray(body.primaryCrops)
      ? body.primaryCrops
      : body.primary_crops ?? null,
    farm_photo_url: body.farmPhotoUrl ?? body.farm_photo_url ?? null,
  };
}

export function normalizeBatchRecord(record: Record<string, any> | null | undefined): NormalizedBatchRecord {
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
    id: record.id ?? null,
    batch_id: record.batch_id ?? record.batchId ?? record.batch_number ?? null,
    farm_id: record.farm_id ?? record.farmId ?? null,
    registered_by: record.registered_by ?? record.registeredBy ?? null,
    crop_type: record.crop_type ?? record.cropType ?? null,
    quantity_kg: record.quantity_kg ?? record.quantityKg ?? null,
    seed_variety: record.seed_variety ?? record.seedVariety ?? null,
    is_gmo_free: record.is_gmo_free ?? record.isGMOFree ?? null,
    gmo_status: record.gmo_status ?? record.gmoStatus ?? null,
    status: record.status ?? null,
    metadata_uri: record.metadata_uri ?? record.metadataUri ?? null,
    metadata_hash: record.metadata_hash ?? record.metadataHash ?? null,
    tx_hash: record.tx_hash ?? record.txHash ?? null,
    registered_at: record.registered_at ?? record.registeredAt ?? null,
    updated_at: record.updated_at ?? record.updatedAt ?? null,
  };
}

export function buildBatchPayload(body: Record<string, any>) {
  const batchId = body.batchId ?? body.batch_id ?? body.batch_number ?? null;
  const farmId = body.farmId ?? body.farm_id ?? null;
  const registeredBy = body.registeredBy ?? body.registered_by ?? null;

  return {
    batch_id: batchId,
    id: batchId,
    farm_id: farmId,
    registered_by: registeredBy,
    crop_type: body.cropType ?? body.crop_type ?? null,
    quantity_kg: Number(body.quantityKg ?? body.quantity_kg ?? 0),
    seed_variety: body.seedVariety ?? body.seed_variety ?? null,
    is_gmo_free: Boolean(body.isGMOFree ?? body.is_gmo_free ?? false),
    gmo_status: body.gmoStatus ?? body.gmo_status ?? "farmer_declared",
    status: body.status ?? "REGISTERED",
    tx_hash: body.txHash ?? body.tx_hash ?? null,
    metadata_uri: body.metadataUri ?? body.metadata_uri ?? null,
    metadata_hash: body.metadataHash ?? body.metadata_hash ?? null,
  };
}
