const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const blockchainService = require('../services/blockchain');
const { hashCertificateData } = require('../services/hasher');

const router = express.Router();

// Register a certificate hash on blockchain
router.post('/register', authMiddleware(['issuer', 'admin', 'operator']), async (req, res) => {
  const { certificate_id } = req.body;
  if (!certificate_id) return res.status(400).json({ error: 'certificate_id required' });

  const db = req.app.locals.db;
  const cert = db.prepare(`
    SELECT c.*, s.name as student_name, s.degree, s.institution, s.graduation_year, s.student_uid,
           o.wallet_address, o.name as org_name
    FROM certificates c
    JOIN students s ON c.student_id = s.id
    JOIN organizations o ON c.org_id = o.id
    WHERE c.id = ?
  `).get(certificate_id);

  if (!cert) return res.status(404).json({ error: 'Certificate not found' });
  if (cert.status !== 'approved') return res.status(400).json({ error: 'Certificate must be approved first' });
  if (!cert.wallet_address) return res.status(400).json({ error: 'Organization has no wallet assigned' });

  try {
    const certHash = cert.hash;
    const metadata = JSON.stringify({
      certificate_uid: cert.certificate_uid,
      student_name: cert.student_name,
      institution: cert.institution,
    });

    const result = await blockchainService.registerCertificate(
      certHash, cert.wallet_address, metadata
    );

    // Record in DB
    db.prepare(`
      INSERT INTO blockchain_records (certificate_id, certificate_hash, tx_hash, issuer_wallet, block_number, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(cert.id, certHash, result.txHash, cert.wallet_address, result.blockNumber, metadata);

    // Update certificate status
    db.prepare("UPDATE certificates SET status = 'registered', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(cert.id);

    // Audit log
    db.prepare("INSERT INTO audit_log (action, entity_type, entity_id, user_id, details) VALUES (?, ?, ?, ?, ?)")
      .run('blockchain_register', 'certificate', cert.id, req.user.id, `TX: ${result.txHash}`);

    res.json({
      message: 'Certificate registered on blockchain',
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      certHash,
    });
  } catch (err) {
    console.error('Blockchain registration error:', err);
    res.status(500).json({ error: 'Failed to register on blockchain: ' + err.message });
  }
});

// Get transactions for an organization
router.get('/transactions', authMiddleware(['issuer', 'admin', 'operator']), (req, res) => {
  const db = req.app.locals.db;
  let query = `
    SELECT br.*, c.certificate_uid, s.name as student_name, o.name as org_name
    FROM blockchain_records br
    JOIN certificates c ON br.certificate_id = c.id
    JOIN students s ON c.student_id = s.id
    JOIN organizations o ON c.org_id = o.id
  `;
  const params = [];

  if (req.query.org_id) {
    query += ' WHERE c.org_id = ?';
    params.push(req.query.org_id);
  }

  query += ' ORDER BY br.created_at DESC';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

// Verify a hash against blockchain
router.get('/verify/:hash', async (req, res) => {
  try {
    const result = await blockchainService.verifyCertificate(req.params.hash);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Verification failed: ' + err.message });
  }
});

module.exports = router;
