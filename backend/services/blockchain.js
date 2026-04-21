const { Web3 } = require('web3');
const solc = require('solc');
const fs = require('fs');
const path = require('path');

const GANACHE_URL = process.env.GANACHE_URL || 'http://127.0.0.1:8545';

let web3;
let contract;
let contractAddress;
let accounts;

/**
 * Compile the CertificateRegistry Solidity contract
 */
function compileContract() {
  const contractPath = path.join(__dirname, '..', 'contracts', 'CertificateRegistry.sol');
  const source = fs.readFileSync(contractPath, 'utf-8');

  const input = {
    language: 'Solidity',
    sources: {
      'CertificateRegistry.sol': { content: source },
    },
    settings: {
      evmVersion: 'paris',
      outputSelection: {
        '*': { '*': ['*'] },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      throw new Error('Solidity compilation errors: ' + errors.map(e => e.formattedMessage).join('\n'));
    }
  }

  const compiled = output.contracts['CertificateRegistry.sol']['CertificateRegistry'];
  return {
    abi: compiled.abi,
    bytecode: compiled.evm.bytecode.object,
  };
}

/**
 * Initialize Web3 and deploy the smart contract
 */
async function initBlockchain() {
  web3 = new Web3(GANACHE_URL);

  try {
    accounts = await web3.eth.getAccounts();
    console.log(`Connected to Ganache. ${accounts.length} accounts available.`);
  } catch (err) {
    console.error('Failed to connect to Ganache. Make sure Ganache is running on', GANACHE_URL);
    console.error('You can start it with: npx ganache --deterministic');
    throw err;
  }

  // Compile and deploy contract
  const { abi, bytecode } = compileContract();
  console.log('Smart contract compiled successfully.');

  const Contract = new web3.eth.Contract(abi);
  const deployTx = Contract.deploy({ data: '0x' + bytecode });
  const gas = await deployTx.estimateGas({ from: accounts[0] });

  contract = await deployTx.send({
    from: accounts[0],
    gas: gas.toString()
  });

  contractAddress = contract.options.address;
  console.log('CertificateRegistry deployed at:', contractAddress);

  return { contractAddress, accounts };
}

/**
 * Get available Ganache accounts (for wallet assignment)
 */
function getAccounts() {
  return accounts;
}

/**
 * Register a certificate hash on the blockchain
 */
async function registerCertificate(certHash, issuerWallet, metadata = '') {
  if (!contract) throw new Error('Blockchain not initialized');

  const hashBytes32 = certHash.startsWith('0x') ? certHash : '0x' + certHash;

  const method = contract.methods.registerCertificate(hashBytes32, metadata);
  const gas = await method.estimateGas({ from: issuerWallet });

  const tx = await method.send({
    from: issuerWallet,
    gas: gas.toString()
  });

  return {
    txHash: tx.transactionHash,
    blockNumber: Number(tx.blockNumber),
    issuerWallet,
  };
}

/**
 * Verify if a certificate hash exists on the blockchain
 */
async function verifyCertificate(certHash) {
  if (!contract) throw new Error('Blockchain not initialized');

  const hashBytes32 = certHash.startsWith('0x') ? certHash : '0x' + certHash;

  try {
    const result = await contract.methods.verifyCertificate(hashBytes32).call();
    return {
      exists: result.exists,
      issuer: result.issuer,
      timestamp: Number(result.timestamp),
      metadata: result.metadata,
    };
  } catch (err) {
    return { exists: false, issuer: null, timestamp: null, metadata: null };
  }
}

/**
 * Get all certificates registered by an issuer
 */
async function getCertificatesByIssuer(issuerWallet) {
  if (!contract) throw new Error('Blockchain not initialized');

  try {
    const hashes = await contract.methods.getCertificatesByIssuer(issuerWallet).call();
    return hashes;
  } catch (err) {
    return [];
  }
}

/**
 * Assign a wallet address to an organization
 * Uses Ganache accounts starting from index 1 (0 is deployer)
 */
function assignWallet(orgIndex) {
  if (!accounts || orgIndex >= accounts.length) {
    throw new Error('No available wallet accounts');
  }
  // Offset by 1 since account[0] is the deployer
  return accounts[orgIndex + 1] || accounts[orgIndex];
}

module.exports = {
  initBlockchain,
  registerCertificate,
  verifyCertificate,
  getCertificatesByIssuer,
  getAccounts,
  assignWallet,
};
