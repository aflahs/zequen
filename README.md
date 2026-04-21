# Zequen — Federated Document Verification System

> **Tamper-proof academic credential issuance and verification powered by blockchain.**

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green?logo=node.js)](https://nodejs.org)
[![Svelte](https://img.shields.io/badge/Svelte-5-orange?logo=svelte)](https://svelte.dev)
[![Solidity](https://img.shields.io/badge/Solidity-0.8-blue?logo=ethereum)](https://soliditylang.org)
[![SQLite](https://img.shields.io/badge/SQLite-3-lightblue?logo=sqlite)](https://sqlite.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What Is Zequen?

Zequen is a **federated, blockchain-backed document verification platform** designed to eliminate academic credential fraud. Universities issue cryptographically signed certificates, their hashes are anchored on an Ethereum smart contract, and any third-party verifier can independently confirm authenticity — without ever trusting a centralised authority.

The system is built for the **real-world gap** between institutions that issue credentials and employers/institutions that need to verify them reliably, instantly, and at zero marginal cost.

---

## Why Does This Exist? — The Problem

Academic credential fraud is a growing global crisis:

-  **~17%** of job applicants misrepresent their qualifications (HireRight, 2023)
-  Degree mills generate **millions of fake diplomas** every year
-  Manual verification through registrar offices takes **days to weeks**
-  Employers and institutions spend **billions annually** on background checks
-  Centralised credential databases are **single points of failure** — one breach exposes everyone

Traditional solutions rely on email chains, physical seals, or siloed portals that are:
- **Forgeable** — PDFs and printed certificates can be replicated trivially
- **Slow** — Human-in-the-loop verification bottlenecks hiring pipelines
- **Costly** — Third-party background-check services charge per-query fees
- **Inaccessible** — Small institutions can't afford enterprise verification infrastructure

---

## How Zequen Solves It

| Problem | Zequen's Solution |
|---|---|
| Fake certificates | SHA-256 hash anchored on immutable blockchain |
| Slow verification | Instant on-chain lookup — results in seconds |
| Centralised trust | Federated model — no single authority controls the chain |
| High cost | Open-source, self-hostable, zero per-query fees |
| No audit trail | Every issuance & verification logged on-chain + SQLite audit log |
| Manual OCR extraction | Built-in Tesseract OCR + Gemini AI for auto-parsing uploaded docs |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ZEQUEN SYSTEM                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  University  │  │   Issuer     │  │  Student Portal  │   │
│  │  Admin :3001 │  │  Portal:3003 │  │      :3002       │   │ 
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                 │                   │             │
│  ┌──────┴─────────────────┴───────────────────┴─────────┐   │
│  │              Express REST API  :4000                  │  │
│  │    Auth · Students · Certificates · Blockchain        │  │
│  │         Verification · Organizations                  │  │
│  └──────────────┬────────────────┬───────────────────────┘  │
│                 │                │                          │
│         ┌───────▼──────┐  ┌──────▼────────────────────┐     │
│         │  SQLite DB   │  │  Ganache / Ethereum Node   │    │
│         │  (zequen.db) │  │  CertificateRegistry.sol   │    │
│         └──────────────┘  └───────────────────────────┘     │
│                                                             │
│  ┌──────────────┐  ┌────────────────────────────────────┐   │
│  │   Verifier   │  │         Ops Dashboard              │   │
│  │  Portal:3004 │  │              :3005                 │   │
│  └──────────────┘  └────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
zequen/
├── backend/                    # Express.js API server
│   ├── contracts/
│   │   └── CertificateRegistry.sol   # Ethereum smart contract
│   ├── db/
│   │   ├── schema.sql                # SQLite schema
│   │   └── init.js                   # DB seeder (run once)
│   ├── middleware/
│   │   └── auth.js                   # JWT authentication
│   ├── routes/
│   │   ├── auth.js                   # Login / register
│   │   ├── students.js               # Student CRUD
│   │   ├── certificates.js           # Generate & fetch certs
│   │   ├── blockchain.js             # On-chain registration
│   │   ├── organizations.js          # Org management
│   │   └── verification.js           # Public verification endpoint
│   ├── services/
│   │   ├── blockchain.js             # Web3 + Solidity compiler wrapper
│   │   ├── certificate-gen.js        # PDF generation (PDFKit)
│   │   ├── hasher.js                 # SHA-256 hashing utility
│   │   └── ocr.js                    # Tesseract + Gemini OCR pipeline
│   ├── server.js                     # App entry point
│   └── package.json
│
├── dashboards/
│   ├── shared/
│   │   └── api.js                    # Shared API client (fetch wrapper)
│   ├── university-admin/             # Svelte app — :3001
│   ├── student-portal/               # Svelte app — :3002
│   ├── issuer-portal/                # Svelte app — :3003
│   ├── verifier-portal/              # Svelte app — :3004
│   └── ops-dashboard/               # Svelte app — :3005
│
├── package.json                      # Root workspace scripts
├── .gitignore
└── README.md
```

---

## Key Features

### Blockchain Certificate Anchoring
Every issued certificate's SHA-256 hash is registered on an Ethereum smart contract (`CertificateRegistry.sol`). This creates an **immutable, time-stamped proof of issuance** that no one — including the issuing university — can retroactively alter.

### Federated Multi-Org Support
Multiple universities can independently issue credentials under the same system. Each organisation is assigned its own Ethereum wallet for on-chain transactions, maintaining cryptographic independence.

### AI-Powered OCR Ingestion
Uploaded PDFs and images are processed through a **Tesseract OCR → Gemini AI** pipeline that automatically extracts student name, degree, institution, and graduation year — eliminating manual data entry entirely.

### Zero-Knowledge Public Verification
Anyone can verify a certificate by uploading it to the **Verifier Portal**. The system hashes the document and checks it against the blockchain — no login, no fees, no trust required.

### Real-Time Ops Monitoring
The **Ops Dashboard** provides live statistics on registered organisations, total certificates, blockchain registrations, and verification requests — giving administrators full system visibility.

### Digital Certificate Generation
The Issuer Portal generates professionally formatted PDF certificates (via PDFKit) that are immediately hashable and blockchain-registerable.

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | v20+ | Runtime |
| npm | v9+ | Package manager |
| npx | bundled | Ganache launcher |

> **Note:** No Docker, no cloud accounts, no API keys required to get started.

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/zequen.git
cd zequen
```

### 2. Install all dependencies

```bash
# Root workspace dependencies (concurrently)
npm install

# Backend dependencies
cd backend && npm install && cd ..

# Dashboard dependencies
cd dashboards/university-admin && npm install && cd ../..
cd dashboards/student-portal    && npm install && cd ../..
cd dashboards/issuer-portal     && npm install && cd ../..
cd dashboards/verifier-portal   && npm install && cd ../..
cd dashboards/ops-dashboard     && npm install && cd ../..
```

### 3. Initialize the database

```bash
npm run init-db
```

This seeds the database with sample organizations, students, and users.

### 4. Start the local blockchain (in a separate terminal)

```bash
npx ganache --deterministic
```

> Ganache provides a local Ethereum blockchain on `http://127.0.0.1:8545` with 10 pre-funded accounts.

### 5. Start all services

```bash
npm run dev
```

This launches all 6 services concurrently:

| Service | URL |
|---|---|
| Backend API | http://localhost:4000 |
| University Admin | http://localhost:3001 |
| Student Portal | http://localhost:3002 |
| Issuer Portal | http://localhost:3003 |
| Verifier Portal | http://localhost:3004 |
| Ops Dashboard | http://localhost:3005 |

---

## Default Credentials

> All accounts use password: **`password123`**

| Role | Username | Portal |
|---|---|---|
| University Admin (NUT) | `admin@nut` | :3001 |
| University Admin (GIS) | `admin@gis` | :3001 |
| Student | `NUT-2024-001` | :3002 |
| Student | `GIS-2024-001` | :3002 |
| Issuer | `issuer@zequen` | :3003 |
| Verifier | `verifier@techcorp` | :3004 |
| Operator | `operator@zequen` | :3005 |

---

## API Reference

All endpoints are prefixed with `http://localhost:4000/api`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | ❌ | Get JWT token |
| GET | `/students` | ✅ | List students |
| POST | `/certificates/generate` | ✅ | Generate PDF certificate |
| POST | `/blockchain/register` | ✅ | Anchor cert hash on-chain |
| POST | `/verify` | ❌ | Public certificate verification |
| GET | `/organizations` | ✅ | List organisations |
| GET | `/stats` | ✅ | System-wide statistics |
| GET | `/api/health` | ❌ | Health check |

---

## Smart Contract

**`CertificateRegistry.sol`** — deployed on local Ganache (or any EVM-compatible chain)

```solidity
function registerCertificate(bytes32 hash, string metadata) external
function verifyCertificate(bytes32 hash) external view returns (bool exists, address issuer, uint timestamp, string metadata)
function getCertificatesByIssuer(address issuer) external view returns (bytes32[])
```

The contract is **compiled at server startup** using `solc` and **deployed fresh** on each Ganache reset — no manual migration steps required.

---

## Security Model

- **JWT Authentication** — All protected routes require a signed token (HS256, configurable expiry)
- **bcrypt Password Hashing** — All passwords stored with cost factor 10
- **CORS Restriction** — Backend only accepts requests from the 5 registered portal origins
- **Immutable Audit Log** — Every issuance and verification event is logged in SQLite with timestamps
- **On-chain Proof** — Certificate hashes are write-once on the blockchain; deletion is impossible

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Svelte 5 + Vite 6 |
| Backend | Node.js + Express 4 |
| Database | SQLite (better-sqlite3) |
| Blockchain | Ethereum (Web3.js + Ganache) |
| Smart Contract | Solidity 0.8 |
| PDF Generation | PDFKit |
| OCR | Tesseract.js + Google Gemini AI |
| Concurrent Dev | concurrently |

---

## Roadmap

- [ ] IPFS storage for certificate PDFs
- [ ] Mainnet / Polygon deployment support
- [ ] Mobile-friendly verifier QR-code scanner
- [ ] Multi-language certificate support
- [ ] Webhook notifications for verification events
- [ ] OAuth2 / SSO integration for university SSO systems

---

<p align="center">
  <strong>Built to make credential fraud a thing of the past.</strong>
</p>
