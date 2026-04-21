const crypto = require('crypto');

/**
 * Creates a canonical representation of certificate data for deterministic hashing.
 * Fields are lowercased, trimmed, safely coalesced, and ordered explicitly.
 */
function canonicalize(data) {
  const fields = {
    certificate_id: String(data.certificate_id ?? data.certificate_uid ?? '').toLowerCase().trim(),
    degree: String(data.degree ?? '').toLowerCase().trim(),
    graduation_year: String(data.graduation_year ?? '').toLowerCase().trim(),
    institution: String(data.institution ?? '').toLowerCase().trim(),
    student_name: String(data.student_name ?? data.name ?? '').toLowerCase().trim(),
  };

  // Explicitly define the strictly sorted key order to prevent cross-engine sorting bugs
  const REQUIRED_KEYS = ['certificate_id', 'degree', 'graduation_year', 'institution', 'student_name'];
  
  // Join values with pipe
  const canonical = REQUIRED_KEYS.map(k => `${k}=${fields[k]}`).join('|');
  return canonical;
}

/**
 * Generate SHA-256 hash from certificate data
 */
function hashCertificateData(data) {
  const canonical = canonicalize(data);
  const hash = crypto.createHash('sha256').update(canonical).digest('hex');
  return { canonical, hash };
}

/**
 * Convert a hex hash string to bytes32 format for Solidity
 */
function toBytes32(hexString) {
  if (hexString.startsWith('0x')) return hexString;
  return '0x' + hexString;
}

module.exports = { canonicalize, hashCertificateData, toBytes32 };
