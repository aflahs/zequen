const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const { initBlockchain, getAccounts } = require('./services/blockchain');
const { DB_PATH } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve generated certificates as static files
app.use('/files/certificates', express.static(path.join(__dirname, 'generated')));

// Initialize Database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
app.locals.db = db;

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/blockchain', require('./routes/blockchain'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/verify', require('./routes/verification'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard stats (for Ops Dashboard)
app.get('/api/stats', (req, res) => {
  const orgCount = db.prepare('SELECT COUNT(*) as count FROM organizations').get().count;
  const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
  const certCount = db.prepare('SELECT COUNT(*) as count FROM certificates').get().count;
  const registeredCount = db.prepare("SELECT COUNT(*) as count FROM certificates WHERE status = 'registered'").get().count;
  const verificationCount = db.prepare('SELECT COUNT(*) as count FROM verification_requests').get().count;
  const auditCount = db.prepare('SELECT COUNT(*) as count FROM audit_log').get().count;

  res.json({
    organizations: orgCount,
    students: studentCount,
    certificates: certCount,
    registeredOnChain: registeredCount,
    verifications: verificationCount,
    auditEntries: auditCount,
  });
});

// Start server
async function start() {
  try {
    // Initialize blockchain (connect to Ganache, deploy contract)
    console.log('Connecting to Ganache blockchain...');
    const { contractAddress, accounts } = await initBlockchain();

    // Assign fresh wallets to ALL organizations on every boot to auto-heal Ganache resets
    // Note: The user explicitly requested to use Indexes 0, 1, and 2. Thus, we don't skip the deployer account.
    const allOrgs = db.prepare('SELECT * FROM organizations').all();
    for (let i = 0; i < allOrgs.length; i++) {
      const wallet = accounts[i]; 
      if (wallet) {
        db.prepare('UPDATE organizations SET wallet_address = ? WHERE id = ?')
          .run(wallet, allOrgs[i].id);
        console.log(`Assigned wallet ${wallet} to ${allOrgs[i].name} (auto-healed)`);
      }
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 Zequen Backend running on http://localhost:${PORT}`);
      console.log(`📋 Smart Contract: ${contractAddress}`);
      console.log(`📦 Database: ${DB_PATH}`);
      console.log('\nAPI Endpoints:');
      console.log('  POST /api/auth/login');
      console.log('  POST /api/auth/register');
      console.log('  GET  /api/students');
      console.log('  POST /api/certificates/generate');
      console.log('  POST /api/blockchain/register');
      console.log('  POST /api/verify');
      console.log('  GET  /api/organizations');
      console.log('  GET  /api/stats');
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    console.log('\n⚠️  Starting without blockchain (Ganache might not be running)');
    console.log('Run: npx ganache --deterministic');

    app.listen(PORT, () => {
      console.log(`\n🚀 Zequen Backend running on http://localhost:${PORT} (without blockchain)`);
    });
  }
}

start();

