const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const blockchainService = require('../services/blockchain');

const router = express.Router();

// List all organizations
router.get('/', authMiddleware(['operator', 'issuer', 'admin']), (req, res) => {
  const db = req.app.locals.db;
  let query = 'SELECT * FROM organizations';
  const params = [];

  if (req.query.type) {
    query += ' WHERE type = ?';
    params.push(req.query.type);
  }

  query += ' ORDER BY created_at DESC';
  const orgs = db.prepare(query).all(...params);
  res.json(orgs);
});

// Get single organization
router.get('/:id', authMiddleware(['operator', 'issuer', 'admin']), (req, res) => {
  const db = req.app.locals.db;
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  if (!org) return res.status(404).json({ error: 'Organization not found' });
  res.json(org);
});

// Create organization (with wallet assignment)
router.post('/', authMiddleware(['operator']), (req, res) => {
  const { name, type, email } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type required' });

  const db = req.app.locals.db;

  try {
    const result = db.prepare(
      'INSERT INTO organizations (name, type, email) VALUES (?, ?, ?)'
    ).run(name, type, email || null);

    // Assign a wallet from Ganache accounts
    const orgCount = db.prepare('SELECT COUNT(*) as count FROM organizations').get().count;
    const accounts = blockchainService.getAccounts();
    if (accounts && orgCount < accounts.length) {
      const walletAddress = accounts[orgCount]; // skip account[0] deployer
      db.prepare('UPDATE organizations SET wallet_address = ? WHERE id = ?')
        .run(walletAddress, result.lastInsertRowid);
    }

    const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(org);
  } catch (err) {
    console.error('Error creating organization:', err);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Update organization
router.put('/:id', authMiddleware(['operator']), (req, res) => {
  const { name, type, email, status } = req.body;
  const db = req.app.locals.db;

  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  if (!org) return res.status(404).json({ error: 'Organization not found' });

  db.prepare(`
    UPDATE organizations SET
      name = COALESCE(?, name),
      type = COALESCE(?, type),
      email = COALESCE(?, email),
      status = COALESCE(?, status),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name || null, type || null, email || null, status || null, req.params.id);

  const updated = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete (deactivate) organization
router.delete('/:id', authMiddleware(['operator']), (req, res) => {
  const db = req.app.locals.db;
  db.prepare("UPDATE organizations SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(req.params.id);
  res.json({ message: 'Organization deactivated' });
});

// Assign wallet to organization
router.post('/:id/assign-wallet', authMiddleware(['operator']), (req, res) => {
  const db = req.app.locals.db;
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  if (!org) return res.status(404).json({ error: 'Organization not found' });

  if (org.wallet_address) {
    return res.json({ message: 'Wallet already assigned', wallet_address: org.wallet_address });
  }

  const accounts = blockchainService.getAccounts();
  // Find next available wallet
  const usedWallets = db.prepare('SELECT wallet_address FROM organizations WHERE wallet_address IS NOT NULL').all()
    .map(o => o.wallet_address.toLowerCase());

  const available = accounts.find(a => !usedWallets.includes(a.toLowerCase()) && a !== accounts[0]);
  if (!available) return res.status(500).json({ error: 'No available wallets' });

  db.prepare('UPDATE organizations SET wallet_address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(available, req.params.id);

  res.json({ message: 'Wallet assigned', wallet_address: available });
});

// Get organization stats
router.get('/:id/stats', authMiddleware(['operator', 'issuer', 'admin']), (req, res) => {
  const db = req.app.locals.db;
  const orgId = req.params.id;

  const certCount = db.prepare('SELECT COUNT(*) as count FROM certificates WHERE org_id = ?').get(orgId).count;
  const registeredCount = db.prepare("SELECT COUNT(*) as count FROM certificates WHERE org_id = ? AND status = 'registered'").get(orgId).count;
  const studentCount = db.prepare('SELECT COUNT(*) as count FROM students WHERE org_id = ?').get(orgId).count;

  res.json({ certCount, registeredCount, studentCount });
});

module.exports = router;
