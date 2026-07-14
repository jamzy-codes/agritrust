-- AgriTrust PostgreSQL schema draft

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  wallet_address VARCHAR(128),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE farms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  region VARCHAR(255) NOT NULL,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  compliance_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_number VARCHAR(100) UNIQUE NOT NULL,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  crop_type VARCHAR(255) NOT NULL,
  quantity_kg NUMERIC(12,2) NOT NULL,
  seed_variety VARCHAR(255),
  gmo_status VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  metadata_uri TEXT,
  metadata_hash VARCHAR(128),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES users(id),
  result VARCHAR(50) NOT NULL,
  notes TEXT,
  passed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES users(id),
  certificate_number VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE batch_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id),
  stage VARCHAR(50) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  storage_url TEXT NOT NULL,
  checksum VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  severity VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  details_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  tx_hash VARCHAR(128) UNIQUE NOT NULL,
  network VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batches_farm_id ON batches(farm_id);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_inspections_batch_id ON inspections(batch_id);
CREATE INDEX idx_certificates_batch_id ON certificates(batch_id);
CREATE INDEX idx_batch_events_batch_id ON batch_events(batch_id);
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
