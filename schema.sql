-- PostgreSQL schema for the metrology system.
-- Run with: psql "$DATABASE_URL" -f schema.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('operator', 'metrologist', 'supervisor', 'admin')),
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  head_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  badge_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT,
  can_borrow BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  barcode TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  inventory_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'in_stock'
    CHECK (status IN ('in_stock', 'issued', 'in_verification', 'in_repair', 'decommissioned')),
  location TEXT NOT NULL,
  last_verification_date DATE,
  next_verification_date DATE NOT NULL,
  specs TEXT,
  notes TEXT,
  current_holder_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ,
  expected_return_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_devices_barcode ON devices (barcode);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices (status);
CREATE INDEX IF NOT EXISTS idx_devices_next_verification ON devices (next_verification_date);
CREATE INDEX IF NOT EXISTS idx_devices_holder ON devices (current_holder_id);

CREATE TABLE IF NOT EXISTS movements (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id),
  device_name TEXT NOT NULL,
  device_barcode TEXT NOT NULL,
  employee_id TEXT REFERENCES employees(id),
  employee_name TEXT,
  action TEXT NOT NULL CHECK (action IN (
    'issued', 'returned', 'relocated', 'sent_verification',
    'returned_verification', 'sent_repair', 'returned_repair', 'decommissioned'
  )),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  operator TEXT NOT NULL,
  expected_return DATE,
  actual_return DATE,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_movements_device_id ON movements (device_id);
CREATE INDEX IF NOT EXISTS idx_movements_timestamp ON movements (timestamp);
CREATE INDEX IF NOT EXISTS idx_movements_action ON movements (action);
CREATE INDEX IF NOT EXISTS idx_movements_employee ON movements (employee_id);

CREATE OR REPLACE FUNCTION prevent_movement_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Журнал движений является неизменяемым (append-only)';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_prevent_movements_update ON movements;
CREATE TRIGGER trg_prevent_movements_update
  BEFORE UPDATE ON movements FOR EACH ROW EXECUTE FUNCTION prevent_movement_mutation();
DROP TRIGGER IF EXISTS trg_prevent_movements_delete ON movements;
CREATE TRIGGER trg_prevent_movements_delete
  BEFORE DELETE ON movements FOR EACH ROW EXECUTE FUNCTION prevent_movement_mutation();

CREATE TABLE IF NOT EXISTS inventory_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  operator TEXT NOT NULL,
  notes TEXT,
  total_expected INTEGER NOT NULL DEFAULT 0,
  total_scanned INTEGER NOT NULL DEFAULT 0,
  total_match INTEGER NOT NULL DEFAULT 0,
  total_missing INTEGER NOT NULL DEFAULT 0,
  total_extra INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  barcode TEXT NOT NULL,
  device_name TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('match', 'missing', 'extra')),
  scanned_at TIMESTAMPTZ,
  operator TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_inventory_items_session ON inventory_items (session_id);

CREATE TABLE IF NOT EXISTS terminals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  port INTEGER NOT NULL DEFAULT 5005,
  mac TEXT NOT NULL DEFAULT '',
  last_heartbeat TIMESTAMPTZ,
  rssi INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  device_prefix TEXT NOT NULL DEFAULT 'DEV:',
  card_prefix TEXT NOT NULL DEFAULT 'CARD:',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scanners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('usb_keyboard', 'rfid_udp', 'com_port', 'network_scanner')),
  identifier TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);
