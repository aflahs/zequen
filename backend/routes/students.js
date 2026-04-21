const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// PUBLIC: Lookup student by UID and return their registered certificates (no auth required)
router.get('/lookup', (req, res) => {
  const db = req.app.locals.db;
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: 'uid query parameter required' });

  const student = db.prepare('SELECT * FROM students WHERE student_uid = ?').get(uid);
  if (!student) return res.status(404).json({ error: 'No student found with that ID' });

  const certs = db.prepare(`
    SELECT c.id, c.certificate_uid, c.status, c.hash, c.file_path, c.created_at,
           s.degree, s.institution, s.graduation_year
    FROM certificates c
    JOIN students s ON c.student_id = s.id
    WHERE c.student_id = ? AND c.status = 'registered'
    ORDER BY c.created_at DESC
  `).all(student.id);

  res.json({ student, certificates: certs });
});


// Get all students (optionally filter by org)
router.get('/', authMiddleware(['admin', 'issuer', 'operator']), (req, res) => {
  const db = req.app.locals.db;
  let query = 'SELECT * FROM students';
  const params = [];

  if (req.user.role === 'admin' && req.user.org_id) {
    query += ' WHERE org_id = ?';
    params.push(req.user.org_id);
  } else if (req.query.org_id) {
    query += ' WHERE org_id = ?';
    params.push(req.query.org_id);
  }

  query += ' ORDER BY created_at DESC';
  const students = db.prepare(query).all(...params);
  res.json(students);
});

// Get single student
router.get('/:id', authMiddleware(['admin', 'student', 'issuer', 'operator']), (req, res) => {
  const db = req.app.locals.db;
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

// Add student
router.post('/', authMiddleware(['admin', 'operator']), (req, res) => {
  const { student_uid, name, degree, institution, graduation_year, org_id } = req.body;

  if (!student_uid || !name || !degree || !institution || !graduation_year) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const db = req.app.locals.db;
  const effectiveOrgId = org_id || req.user.org_id;

  try {
    const result = db.prepare(
      'INSERT INTO students (student_uid, name, degree, institution, graduation_year, org_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(student_uid, name, degree, institution, graduation_year, effectiveOrgId);

    // Also create a user account for this student
    const bcrypt = require('bcryptjs');
    const passwordHash = bcrypt.hashSync('password123', 10);
    db.prepare(
      'INSERT INTO users (username, password_hash, role, org_id, student_id) VALUES (?, ?, ?, ?, ?)'
    ).run(student_uid, passwordHash, 'student', effectiveOrgId, result.lastInsertRowid);

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(student);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Student UID already exists' });
    }
    throw err;
  }
});

module.exports = router;
