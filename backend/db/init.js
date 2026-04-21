const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'zequen.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function initializeDatabase() {
  // Remove existing DB for fresh start
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('Removed existing database.');
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  console.log('Schema created successfully.');

  // Seed organizations
  const insertOrg = db.prepare(`
    INSERT INTO organizations (name, type, wallet_address, private_key, email, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `);

  const uni1 = insertOrg.run(
    'National University of Technology',
    'university',
    null, null,
    'admin@nut.edu'
  );

  const uni2 = insertOrg.run(
    'Global Institute of Science',
    'university',
    null, null,
    'admin@gis.edu'
  );

  const verifier1 = insertOrg.run(
    'TechCorp Industries',
    'verifier',
    null, null,
    'hr@techcorp.com'
  );

  console.log('Organizations seeded.');

  // Seed students
  const insertStudent = db.prepare(`
    INSERT INTO students (student_uid, name, degree, institution, graduation_year, org_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const students = [
    { uid: 'NUT-2024-001', name: 'Alice Johnson', degree: 'Bachelor of Computer Science', institution: 'National University of Technology', year: 2024, orgId: uni1.lastInsertRowid },
    { uid: 'NUT-2024-002', name: 'Bob Smith', degree: 'Master of Data Science', institution: 'National University of Technology', year: 2024, orgId: uni1.lastInsertRowid },
    { uid: 'NUT-2023-003', name: 'Carol Williams', degree: 'Bachelor of Engineering', institution: 'National University of Technology', year: 2023, orgId: uni1.lastInsertRowid },
    { uid: 'GIS-2024-001', name: 'David Brown', degree: 'Bachelor of Physics', institution: 'Global Institute of Science', year: 2024, orgId: uni2.lastInsertRowid },
    { uid: 'GIS-2024-002', name: 'Eva Martinez', degree: 'Master of Chemistry', institution: 'Global Institute of Science', year: 2024, orgId: uni2.lastInsertRowid },
  ];

  for (const s of students) {
    insertStudent.run(s.uid, s.name, s.degree, s.institution, s.year, s.orgId);
  }
  console.log('Students seeded.');

  // Seed users
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, role, org_id, student_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  const passwordHash = bcrypt.hashSync('password123', 10);

  // Admin users
  insertUser.run('admin@nut', passwordHash, 'admin', uni1.lastInsertRowid, null);
  insertUser.run('admin@gis', passwordHash, 'admin', uni2.lastInsertRowid, null);

  // Student users
  const allStudents = db.prepare('SELECT * FROM students').all();
  for (const s of allStudents) {
    insertUser.run(s.student_uid, passwordHash, 'student', s.org_id, s.id);
  }

  // Issuer user
  insertUser.run('issuer@zequen', passwordHash, 'issuer', null, null);

  // Verifier user
  insertUser.run('verifier@techcorp', passwordHash, 'verifier', verifier1.lastInsertRowid, null);

  // Operator user
  insertUser.run('operator@zequen', passwordHash, 'operator', null, null);

  console.log('Users seeded.');
  console.log('\n=== Default Credentials ===');
  console.log('All passwords: password123');
  console.log('Admin: admin@nut, admin@gis');
  console.log('Students: NUT-2024-001, NUT-2024-002, NUT-2023-003, GIS-2024-001, GIS-2024-002');
  console.log('Issuer: issuer@zequen');
  console.log('Verifier: verifier@techcorp');
  console.log('Operator: operator@zequen');

  db.close();
  console.log('\nDatabase initialized successfully at', DB_PATH);
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase, DB_PATH };
