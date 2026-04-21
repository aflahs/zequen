const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const { ocrExtract } = require('../services/ocr');
const { hashCertificateData } = require('../services/hasher');
const blockchainService = require('../services/blockchain');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, PNG, JPG, JPEG files allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = express.Router();

// Upload and verify a document
router.post('/', upload.single('document'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No document uploaded' });

  const db = req.app.locals.db;

  // Create verification request record
  const insertResult = db.prepare(`
    INSERT INTO verification_requests (document_path, original_filename, result)
    VALUES (?, ?, 'pending')
  `).run(req.file.path, req.file.originalname);

  const requestId = insertResult.lastInsertRowid;

  try {
    // OCR extraction
    const { rawText, parsed } = await ocrExtract(req.file.path);

    // Generate hash from extracted data
    const { canonical, hash } = hashCertificateData({
      student_name: parsed.student_name || '',
      degree: parsed.degree || '',
      institution: parsed.institution || '',
      graduation_year: parsed.graduation_year || '',
      certificate_id: parsed.certificate_id || '',
    });

    // Verify against blockchain
    const blockchainResult = await blockchainService.verifyCertificate(hash);

    const result = blockchainResult.exists ? 'authentic' : 'fraudulent';

    // Look up issuer info
    let issuerName = null;
    let matchedCertId = null;
    if (blockchainResult.exists && blockchainResult.issuer) {
      const org = db.prepare('SELECT name FROM organizations WHERE LOWER(wallet_address) = LOWER(?)')
        .get(blockchainResult.issuer);
      issuerName = org ? org.name : null;

      const certRecord = db.prepare('SELECT certificate_id FROM blockchain_records WHERE LOWER(certificate_hash) = LOWER(?)')
        .get(hash);
      matchedCertId = certRecord ? certRecord.certificate_id : null;
    }

    // Update verification request
    db.prepare(`
      UPDATE verification_requests SET
        extracted_data = ?,
        computed_hash = ?,
        result = ?,
        matched_certificate_id = ?,
        matched_tx_hash = ?,
        issuer_wallet = ?,
        issuer_name = ?,
        verified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      JSON.stringify({ raw: rawText, parsed, canonical }),
      hash,
      result,
      matchedCertId,
      blockchainResult.exists ? 'found' : null,
      blockchainResult.issuer || null,
      issuerName,
      requestId
    );

    // Audit log
    db.prepare("INSERT INTO audit_log (action, entity_type, entity_id, details) VALUES (?, ?, ?, ?)")
      .run('verification', 'verification_request', requestId, `Result: ${result}, Hash: ${hash}`);

    res.json({
      id: requestId,
      result,
      extracted_data: parsed,
      computed_hash: hash,
      blockchain: blockchainResult,
      issuer_name: issuerName,
    });
  } catch (err) {
    console.error('Verification error:', err);
    db.prepare("UPDATE verification_requests SET result = 'error', verified_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(requestId);
    res.status(500).json({ error: 'Verification failed: ' + err.message });
  }
});

// Manual verify with structured data (no OCR)
router.post('/manual', async (req, res) => {
  const { student_name, degree, institution, graduation_year, certificate_id } = req.body;

  if (!student_name || !degree || !institution || !graduation_year || !certificate_id) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const { canonical, hash } = hashCertificateData({
    student_name, degree, institution, graduation_year, certificate_id
  });

  try {
    const blockchainResult = await blockchainService.verifyCertificate(hash);
    const result = blockchainResult.exists ? 'authentic' : 'fraudulent';

    const db = req.app.locals.db;
    let issuerName = null;
    if (blockchainResult.exists && blockchainResult.issuer) {
      const org = db.prepare('SELECT name FROM organizations WHERE LOWER(wallet_address) = LOWER(?)')
        .get(blockchainResult.issuer);
      issuerName = org ? org.name : null;
    }

    // Record the verification
    db.prepare(`
      INSERT INTO verification_requests (extracted_data, computed_hash, result, issuer_wallet, issuer_name, verified_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(JSON.stringify({ parsed: { student_name, degree, institution, graduation_year, certificate_id }, canonical }), hash, result, blockchainResult.issuer || null, issuerName);

    res.json({
      result,
      computed_hash: hash,
      canonical,
      blockchain: blockchainResult,
      issuer_name: issuerName,
    });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed: ' + err.message });
  }
});

// Get verification history / audit trail
router.get('/history', (req, res) => {
  const db = req.app.locals.db;
  const records = db.prepare('SELECT * FROM verification_requests ORDER BY created_at DESC').all();
  res.json(records);
});

// Get single verification result
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const record = db.prepare('SELECT * FROM verification_requests WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Verification request not found' });
  res.json(record);
});

module.exports = router;
