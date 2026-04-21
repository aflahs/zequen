const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const db = req.app.locals.db;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const org = user.org_id ? db.prepare('SELECT * FROM organizations WHERE id = ?').get(user.org_id) : null;
  const student = user.student_id ? db.prepare('SELECT * FROM students WHERE id = ?').get(user.student_id) : null;

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      org_id: user.org_id,
      student_id: user.student_id,
      org_name: org ? org.name : null,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      org_id: user.org_id,
      org_name: org ? org.name : null,
      student_id: user.student_id,
      student_name: student ? student.name : null,
    },
  });
});

router.post('/register', (req, res) => {
  const { username, password, role, org_id } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role required' });
  }

  const db = req.app.locals.db;
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, password_hash, role, org_id) VALUES (?, ?, ?, ?)'
  ).run(username, passwordHash, role, org_id || null);

  res.status(201).json({ id: result.lastInsertRowid, username, role });
});

module.exports = router;
