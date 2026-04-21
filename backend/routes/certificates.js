const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { generateCertificate } = require('../services/certificate-gen');
const { hashCertificateData } = require('../services/hasher');
const blockchainService = require('../services/blockchain');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const router = express.Router();

// List certificates (filterable by status, org, student)
router.get('/', authMiddleware(['admin', 'student', 'issuer', 'operator']), (req, res) => {
  const db = req.app.locals.db;
  let query = `SELECT c.*, s.name as student_name, s.degree, s.institution, s.graduation_year, s.student_uid
               FROM certificates c
               JOIN students s ON c.student_id = s.id`;
  const conditions = [];
  const params = [];

  if (req.user.role === 'admin' && req.user.org_id) {
    conditions.push('c.org_id = ?');
    params.push(req.user.org_id);
  }

  if (req.user.role === 'student' && req.user.student_id) {
    conditions.push('c.student_id = ?');
    params.push(req.user.student_id);
  }

  if (req.query.status) {
    conditions.push('c.status = ?');
    params.push(req.query.status);
  }

  if (req.query.org_id) {
    conditions.push('c.org_id = ?');
    params.push(req.query.org_id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY c.created_at DESC';
  const certs = db.prepare(query).all(...params);
  res.json(certs);
});

// Get single certificate
router.get('/:id', authMiddleware(['admin', 'student', 'issuer', 'operator']), (req, res) => {
  const db = req.app.locals.db;
  const cert = db.prepare(`
    SELECT c.*, s.name as student_name, s.degree, s.institution, s.graduation_year, s.student_uid
    FROM certificates c
    JOIN students s ON c.student_id = s.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!cert) return res.status(404).json({ error: 'Certificate not found' });
  res.json(cert);
});

// Generate certificate for a student
router.post('/generate', authMiddleware(['admin']), async (req, res) => {
  const { student_id } = req.body;
  if (!student_id) return res.status(400).json({ error: 'student_id required' });

  const db = req.app.locals.db;
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const certificateUid = 'CERT-' + uuidv4().slice(0, 8).toUpperCase();

  try {
    const { filepath, filename } = await generateCertificate(student, certificateUid);

    // Generate hash from student data
    const { hash } = hashCertificateData({
      student_name: student.name,
      degree: student.degree,
      institution: student.institution,
      graduation_year: student.graduation_year,
      certificate_id: certificateUid,
    });

    const result = db.prepare(`
      INSERT INTO certificates (certificate_uid, student_id, org_id, status, file_path, file_type, hash)
      VALUES (?, ?, ?, 'pending', ?, 'pdf', ?)
    `).run(certificateUid, student.id, student.org_id, filepath, hash);

    const cert = db.prepare(`
      SELECT c.*, s.name as student_name, s.degree, s.institution, s.graduation_year
      FROM certificates c
      JOIN students s ON c.student_id = s.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(cert);
  } catch (err) {
    console.error('Certificate generation error:', err);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

// Approve certificate — automatically registers on blockchain
router.put('/:id/approve', authMiddleware(['admin']), async (req, res) => {
  const db = req.app.locals.db;

  // Get the certificate with org wallet info
  const cert = db.prepare(`
    SELECT c.*, s.name as student_name, s.degree, s.institution, s.graduation_year, s.student_uid,
           o.wallet_address, o.name as org_name
    FROM certificates c
    JOIN students s ON c.student_id = s.id
    JOIN organizations o ON c.org_id = o.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!cert) return res.status(404).json({ error: 'Certificate not found' });
  if (cert.status !== 'pending') return res.status(400).json({ error: 'Certificate is not pending' });
  if (!cert.wallet_address) return res.status(400).json({ error: 'Organization has no wallet assigned — restart backend to auto-sync' });

  try {
    // Step 1: Mark as approved first
    db.prepare(`
      UPDATE certificates SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(req.user.id, cert.id);

    // Step 2: Auto-register on blockchain
    const certHash = cert.hash;
    const metadata = JSON.stringify({
      certificate_uid: cert.certificate_uid,
      student_name: cert.student_name,
      institution: cert.institution,
    });

    const result = await blockchainService.registerCertificate(certHash, cert.wallet_address, metadata);

    // Step 3: Record in blockchain_records table
    db.prepare(`
      INSERT INTO blockchain_records (certificate_id, certificate_hash, tx_hash, issuer_wallet, block_number, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(cert.id, certHash, result.txHash, cert.wallet_address, result.blockNumber, metadata);

    // Step 4: Update status to 'registered'
    db.prepare(`
      UPDATE certificates SET status = 'registered', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(cert.id);

    // Step 5: Audit log
    db.prepare(`INSERT INTO audit_log (action, entity_type, entity_id, user_id, details) VALUES (?, ?, ?, ?, ?)`)
      .run('approve_and_register', 'certificate', cert.id, req.user.id, `TX: ${result.txHash}`);

    // Return the updated certificate with TX info
    const updated = db.prepare(`
      SELECT c.*, s.name as student_name, s.degree, s.institution, s.graduation_year
      FROM certificates c JOIN students s ON c.student_id = s.id WHERE c.id = ?
    `).get(cert.id);

    res.json({
      ...updated,
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      certHash,
    });
  } catch (err) {
    console.error('Auto-registration error:', err);
    // Roll back to pending if blockchain failed
    db.prepare(`UPDATE certificates SET status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(cert.id);
    res.status(500).json({ error: 'Blockchain registration failed: ' + err.message });
  }
});

// Reject certificate
router.put('/:id/reject', authMiddleware(['admin']), (req, res) => {
  const db = req.app.locals.db;
  const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(req.params.id);
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });

  db.prepare(`
    UPDATE certificates SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(req.params.id);

  res.json({ message: 'Certificate rejected' });
});

// Download certificate file (public – IDs are opaque UUIDs, safe without auth)
router.get('/:id/download', (req, res) => {
  const db = req.app.locals.db;
  const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(req.params.id);
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });
  if (!cert.file_path) return res.status(404).json({ error: 'Certificate file not found' });

  res.download(cert.file_path, `certificate-${cert.certificate_uid}.pdf`);
});

module.exports = router;
