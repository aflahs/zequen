-- Zequen Database Schema

CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('university', 'verifier')),
  wallet_address TEXT,
  private_key TEXT,
  email TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'student', 'issuer', 'verifier', 'operator')),
  org_id INTEGER REFERENCES organizations(id),
  student_id INTEGER REFERENCES students(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_uid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  degree TEXT NOT NULL,
  institution TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  org_id INTEGER REFERENCES organizations(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_uid TEXT UNIQUE NOT NULL,
  student_id INTEGER NOT NULL REFERENCES students(id),
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'pending', 'approved', 'rejected', 'registered')),
  file_path TEXT,
  file_type TEXT DEFAULT 'pdf',
  hash TEXT,
  approved_by INTEGER REFERENCES users(id),
  approved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blockchain_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_id INTEGER REFERENCES certificates(id),
  certificate_hash TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  issuer_wallet TEXT NOT NULL,
  block_number INTEGER,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verification_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_path TEXT,
  original_filename TEXT,
  extracted_data TEXT,
  computed_hash TEXT,
  result TEXT CHECK(result IN ('authentic', 'fraudulent', 'pending', 'error')),
  matched_certificate_id INTEGER REFERENCES certificates(id),
  matched_tx_hash TEXT,
  issuer_wallet TEXT,
  issuer_name TEXT,
  verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  user_id INTEGER REFERENCES users(id),
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
