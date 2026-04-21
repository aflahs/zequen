<script>
  import { api, login, getUser, clearAuth } from '../../shared/api.js';

  // ── ALL LOGIC UNCHANGED ──────────────────────────────────────────
  let user = $state(getUser());
  let page = $state('verify');
  let username = $state('');
  let password = $state('');
  let loginError = $state('');
  let verificationResult = $state(null);
  let history = $state([]);
  let loading = $state(false);
  let message = $state('');
  let manualData = $state({ student_name: '', degree: '', institution: '', graduation_year: '', certificate_id: '' });
  let verifyMode = $state('upload');

  async function handleLogin() {
    try { loginError = ''; const data = await login(username, password); user = data.user; await loadHistory(); } catch (e) { loginError = e.message; }
  }

  function logout() { clearAuth(); user = null; }

  async function loadHistory() {
    try { history = await api('/verify/history'); } catch (e) { console.error(e); }
  }

  async function uploadAndVerify() {
    const input = document.getElementById('file-upload');
    if (!input?.files?.length) { message = 'Please select a file'; return; }
    const formData = new FormData();
    formData.append('document', input.files[0]);
    try {
      loading = true;
      verificationResult = null;
      const token = localStorage.getItem('zequen_token');
      const res = await fetch('http://localhost:4000/api/verify', {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Verification failed');
      verificationResult = await res.json();
      await loadHistory();
    } catch (e) { message = 'Error: ' + e.message; } finally { loading = false; }
  }

  async function manualVerify() {
    try {
      loading = true;
      verificationResult = null;
      verificationResult = await api('/verify/manual', { method: 'POST', body: JSON.stringify(manualData) });
      await loadHistory();
    } catch (e) { message = 'Error: ' + e.message; } finally { loading = false; }
  }

  if (user) loadHistory();
</script>

<!-- ── LOGIN ───────────────────────────────────────────────── -->
{#if !user}
<div class="login-shell">
  <div class="login-left">
    <div class="login-left-inner">
      <div class="brand-mark"><i class="fa-solid fa-shield-halved"></i></div>
      <h1>Credential<br>Verification</h1>
      <p class="login-tagline">Powered by Zequen Blockchain</p>
      <div class="login-decoration">
        <div class="deco-line"></div>
        <span>Tamper-Proof Records</span>
        <div class="deco-line"></div>
      </div>
    </div>
  </div>
  <div class="login-right">
    <div class="login-form-container">
      <div class="zequen-badge"><i class="fa-solid fa-link"></i> Zequen VFR</div>
      <h2>Verifier Sign In</h2>
      <p class="login-form-sub">Sign in to verify and audit academic credentials on the blockchain.</p>
      {#if loginError}
      <div class="login-error"><i class="fa-solid fa-circle-exclamation"></i> {loginError}</div>
      {/if}
      <div class="form-field">
        <label for="uname">Username</label>
        <input id="uname" type="text" placeholder="verifier@techcorp" bind:value={username} onkeydown={e => e.key === 'Enter' && handleLogin()}>
      </div>
      <div class="form-field">
        <label for="pass">Password</label>
        <input id="pass" type="password" placeholder="••••••••" bind:value={password} onkeydown={e => e.key === 'Enter' && handleLogin()}>
      </div>
      <button class="btn-signin" onclick={handleLogin}>
        <i class="fa-solid fa-right-to-bracket"></i> Sign In
      </button>
      <p class="login-hint">Default: <code>verifier@techcorp</code> / <code>password123</code></p>
    </div>
  </div>
</div>

<!-- ── PORTAL ───────────────────────────────────────────────── -->
{:else}
<div class="portal-shell">

  <!-- HEADER -->
  <header class="top-header">
    <div class="header-left">
      <div class="header-icon"><i class="fa-solid fa-shield-halved"></i></div>
      <div>
        <div class="header-title">Zequen VFR</div>
        <div class="header-sub">Certificate Verification Portal</div>
      </div>
    </div>
    <div class="header-right">
      <div class="header-user">
        <div class="user-avatar">{user.username[0].toUpperCase()}</div>
        <div>
          <div class="user-name">{user.username}</div>
          <div class="user-org">{user.org_name || 'Verifier'}</div>
        </div>
      </div>
      <button class="btn-logout" onclick={logout}><i class="fa-solid fa-right-from-bracket"></i> Sign Out</button>
    </div>
  </header>

  <div class="portal-body">

    <!-- SIDEBAR -->
    <aside class="sidebar">
      <nav class="sidebar-nav">
        <div class="nav-label">Verification</div>
        <ul>
          <li class:active={page === 'verify'}>
            <button onclick={() => page = 'verify'}>
              <i class="fa-solid fa-magnifying-glass"></i> Verify Certificate
            </button>
          </li>
          <li class:active={page === 'history'}>
            <button onclick={() => page = 'history'}>
              <i class="fa-solid fa-clipboard-list"></i> Audit Trail
            </button>
          </li>
        </ul>
      </nav>
    </aside>

    <!-- MAIN -->
    <main class="main-content">

      {#if message}
      <div class="alert-banner">
        <i class="fa-solid fa-circle-exclamation"></i>
        <span>{message}</span>
        <button onclick={() => message = ''}><i class="fa-solid fa-xmark"></i></button>
      </div>
      {/if}

      <!-- VERIFY PAGE ──────────────────────────────── -->
      {#if page === 'verify'}
      <div class="page-header">
        <div>
          <h1>Verify Certificate</h1>
          <p class="page-sub">Check credential authenticity against the Zequen blockchain ledger</p>
        </div>
      </div>

      <!-- Mode tabs -->
      <div class="mode-tabs">
        <button class:active={verifyMode === 'upload'} onclick={() => { verifyMode = 'upload'; verificationResult = null; }}>
          <i class="fa-solid fa-upload"></i> Upload Document
        </button>
        <button class:active={verifyMode === 'manual'} onclick={() => { verifyMode = 'manual'; verificationResult = null; }}>
          <i class="fa-solid fa-keyboard"></i> Manual Entry
        </button>
      </div>

      <!-- Upload mode -->
      {#if verifyMode === 'upload'}
      <div class="upload-card">
        <div class="upload-icon-wrap">
          <i class="fa-solid fa-file-pdf"></i>
        </div>
        <h3>Upload Certificate Document</h3>
        <p>Supported formats: PDF, PNG, JPG, JPEG &nbsp;·&nbsp; Max 10 MB</p>
        <label class="file-label" for="file-upload">
          <i class="fa-solid fa-folder-open"></i> Choose File
        </label>
        <input type="file" id="file-upload" accept=".pdf,.png,.jpg,.jpeg">
        <button class="btn-verify" onclick={uploadAndVerify} disabled={loading}>
          {#if loading}
            <i class="fa-solid fa-circle-notch fa-spin"></i> Analysing...
          {:else}
            <i class="fa-solid fa-magnifying-glass"></i> Verify Document
          {/if}
        </button>
      </div>

      <!-- Manual mode -->
      {:else}
      <div class="manual-card">
        <div class="manual-grid">
          <div class="form-field">
            <label for="m-name">Student Name</label>
            <input id="m-name" bind:value={manualData.student_name} placeholder="e.g. Alice Johnson">
          </div>
          <div class="form-field">
            <label for="m-deg">Degree</label>
            <input id="m-deg" bind:value={manualData.degree} placeholder="e.g. B.Sc. Computer Science">
          </div>
          <div class="form-field">
            <label for="m-inst">Institution</label>
            <input id="m-inst" bind:value={manualData.institution} placeholder="e.g. National University of Technology">
          </div>
          <div class="form-field">
            <label for="m-year">Graduation Year</label>
            <input id="m-year" bind:value={manualData.graduation_year} placeholder="2024">
          </div>
          <div class="form-field" style="grid-column: 1 / -1">
            <label for="m-cid">Certificate ID</label>
            <input id="m-cid" bind:value={manualData.certificate_id} placeholder="e.g. CERT-16EB9112">
          </div>
        </div>
        <button class="btn-verify" onclick={manualVerify} disabled={loading}>
          {#if loading}
            <i class="fa-solid fa-circle-notch fa-spin"></i> Verifying...
          {:else}
            <i class="fa-solid fa-magnifying-glass"></i> Verify Certificate
          {/if}
        </button>
      </div>
      {/if}

      <!-- Result card -->
      {#if verificationResult}
      <div class="result-card result-{verificationResult.result}">
        {#if verificationResult.result === 'authentic'}
        <div class="result-banner authentic">
          <div class="result-icon-wrap"><i class="fa-solid fa-circle-check"></i></div>
          <div>
            <div class="result-verdict">AUTHENTIC</div>
            <div class="result-verdict-sub">This certificate is verified on the blockchain ledger.</div>
          </div>
        </div>
        {:else if verificationResult.result === 'fraudulent'}
        <div class="result-banner fraudulent">
          <div class="result-icon-wrap"><i class="fa-solid fa-circle-xmark"></i></div>
          <div>
            <div class="result-verdict">FRAUDULENT</div>
            <div class="result-verdict-sub">Hash NOT found on the blockchain ledger. This certificate cannot be verified.</div>
          </div>
        </div>
        {:else}
        <div class="result-banner warning">
          <div class="result-icon-wrap"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <div>
            <div class="result-verdict">{verificationResult.result?.toUpperCase()}</div>
            <div class="result-verdict-sub">{verificationResult.error || 'An unknown error occurred.'}</div>
          </div>
        </div>
        {/if}

        {#if verificationResult.computed_hash || verificationResult.issuer_name}
        <div class="result-details">
          {#if verificationResult.computed_hash}
          <div class="detail-row">
            <span class="detail-label">SHA-256 Hash</span>
            <code>{verificationResult.computed_hash}</code>
          </div>
          {/if}
          {#if verificationResult.issuer_name}
          <div class="detail-row">
            <span class="detail-label">Issuing Institution</span>
            <span>{verificationResult.issuer_name}</span>
          </div>
          {/if}
        </div>
        {/if}
      </div>
      {/if}

      <!-- AUDIT TRAIL PAGE ─────────────────────────── -->
      {:else if page === 'history'}
      <div class="page-header">
        <div>
          <h1>Audit Trail</h1>
          <p class="page-sub">{history.length} verification record{history.length !== 1 ? 's' : ''}</p>
        </div>
        <button class="btn-refresh" onclick={loadHistory}><i class="fa-solid fa-arrows-rotate"></i> Refresh</button>
      </div>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>File / Method</th>
              <th>Result</th>
              <th>Hash (truncated)</th>
              <th>Issuer</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {#each history as h}
            <tr>
              <td class="muted">#{h.id}</td>
              <td>
                {#if h.original_filename}
                  <div class="file-cell"><i class="fa-solid fa-file-pdf"></i> {h.original_filename}</div>
                {:else}
                  <div class="file-cell"><i class="fa-solid fa-keyboard"></i> Manual Entry</div>
                {/if}
              </td>
              <td>
                <span class="result-pill result-pill-{h.result || 'pending'}">{h.result || 'pending'}</span>
              </td>
              <td><code>{h.computed_hash ? h.computed_hash.slice(0, 16) + '...' : '—'}</code></td>
              <td>{h.issuer_name || '—'}</td>
              <td class="muted">{new Date(h.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
            </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {/if}

    </main>
  </div>
</div>
{/if}

<style>
  /* ── Reset ───────────────────────────────────────── */
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }
  :global(body) {
    font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
    background: #f4f6f9;
    color: #1a1f2e;
    font-size: 14px;
  }
  :global(a) { text-decoration: none; }

  /* ── Login ───────────────────────────────────────── */
  .login-shell { display: flex; min-height: 100vh; }
  .login-left {
    width: 380px;
    background: #0d1b2a;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .login-left-inner {
    text-align: center;
    color: white;
    padding: 40px 48px;
  }
  .brand-mark { font-size: 56px; color: #22c55e; margin-bottom: 20px; }
  .login-left-inner h1 { font-size: 26px; font-weight: 700; line-height: 1.3; margin-bottom: 8px; }
  .login-tagline { font-size: 12px; color: #8fa3b8; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 28px; }
  .login-decoration { display: flex; align-items: center; gap: 12px; color: #4a6278; font-size: 11px; }
  .deco-line { flex: 1; height: 1px; background: #2a3f52; }
  .login-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f4f6f9;
  }
  .login-form-container {
    width: 400px;
    background: white;
    border: 1px solid #dde3ec;
    padding: 44px 48px;
  }
  .zequen-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    color: #16a34a;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    padding: 4px 10px;
    margin-bottom: 20px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .login-form-container h2 { font-size: 21px; font-weight: 700; color: #0d1b2a; margin-bottom: 6px; }
  .login-form-sub { font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 28px; }
  .login-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
    padding: 10px 14px;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }
  .form-field { margin-bottom: 16px; }
  .form-field label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
  .form-field input {
    width: 100%;
    padding: 10px 13px;
    border: 1px solid #d1d5db;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s;
    font-family: inherit;
    background: #fafafa;
  }
  .form-field input:focus { border-color: #16a34a; background: white; }
  .btn-signin {
    width: 100%;
    margin-top: 8px;
    padding: 12px;
    background: #0d1b2a;
    color: white;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: background 0.15s;
    font-family: inherit;
  }
  .btn-signin:hover { background: #1a2d3f; }
  .login-hint { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 14px; }
  .login-hint code { background: #f1f5f9; padding: 2px 6px; border: 1px solid #e2e8f0; font-size: 11px; }

  /* ── Portal shell ────────────────────────────────── */
  .portal-shell { display: flex; flex-direction: column; min-height: 100vh; }

  /* ── Header ──────────────────────────────────────── */
  .top-header {
    background: #0d1b2a;
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 28px;
    height: 58px;
    border-bottom: 3px solid #22c55e;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .header-icon { font-size: 26px; color: #22c55e; }
  .header-title { font-size: 15px; font-weight: 700; }
  .header-sub { font-size: 11px; color: #7a9bba; }
  .header-right { display: flex; align-items: center; gap: 20px; }
  .header-user { display: flex; align-items: center; gap: 10px; }
  .user-avatar {
    width: 32px; height: 32px;
    background: #1e3a52;
    border: 1px solid #2d4f6e;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 13px; color: #22c55e;
  }
  .user-name { font-size: 13px; font-weight: 600; }
  .user-org { font-size: 11px; color: #7a9bba; }
  .btn-logout {
    padding: 6px 13px;
    background: transparent;
    border: 1px solid #2d4f6e;
    color: #94a3b8;
    font-size: 12px;
    cursor: pointer;
    display: flex; align-items: center; gap: 6px;
    transition: all 0.15s;
    font-family: inherit;
  }
  .btn-logout:hover { background: #1e3a52; color: white; }

  /* ── Portal body ─────────────────────────────────── */
  .portal-body { display: flex; flex: 1; overflow: hidden; }

  /* ── Sidebar ─────────────────────────────────────── */
  .sidebar {
    width: 220px;
    background: white;
    border-right: 1px solid #dde3ec;
    flex-shrink: 0;
    padding: 20px 0;
  }
  .sidebar-nav { padding: 0 10px; }
  .nav-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; padding: 12px 10px 6px; }
  .sidebar-nav ul { list-style: none; }
  .sidebar-nav ul li button {
    width: 100%;
    text-align: left;
    padding: 9px 12px;
    background: none;
    border: none;
    border-left: 2px solid transparent;
    color: #475569;
    font-size: 13.5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.12s;
    font-family: inherit;
  }
  .sidebar-nav ul li button:hover { background: #f8fafc; color: #0d1b2a; }
  .sidebar-nav ul li.active button {
    background: #f0fdf4;
    color: #15803d;
    border-left-color: #22c55e;
    font-weight: 600;
  }

  /* ── Main content ────────────────────────────────── */
  .main-content { flex: 1; overflow-y: auto; padding: 32px 36px; }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e2e8f0;
  }
  .page-header h1 { font-size: 22px; font-weight: 700; color: #0d1b2a; }
  .page-sub { font-size: 13px; color: #64748b; margin-top: 2px; }

  /* ── Alert banner ────────────────────────────────── */
  .alert-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-left: 4px solid #dc2626;
    padding: 12px 16px;
    margin-bottom: 20px;
    font-size: 13px;
    color: #b91c1c;
  }
  .alert-banner span { flex: 1; }
  .alert-banner button { background: none; border: none; color: inherit; cursor: pointer; font-size: 14px; }

  /* ── Mode tabs ───────────────────────────────────── */
  .mode-tabs {
    display: flex;
    gap: 0;
    margin-bottom: 24px;
    border: 1px solid #e2e8f0;
    background: white;
    width: fit-content;
  }
  .mode-tabs button {
    padding: 10px 22px;
    background: white;
    border: none;
    border-right: 1px solid #e2e8f0;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #64748b;
    font-family: inherit;
    font-weight: 500;
    transition: all 0.12s;
  }
  .mode-tabs button:last-child { border-right: none; }
  .mode-tabs button:hover { background: #f8fafc; color: #0d1b2a; }
  .mode-tabs button.active {
    background: #f0fdf4;
    color: #15803d;
    font-weight: 600;
    border-bottom: 2px solid #22c55e;
  }

  /* ── Upload card ─────────────────────────────────── */
  .upload-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-top: 3px solid #0d1b2a;
    padding: 48px;
    text-align: center;
    max-width: 560px;
  }
  .upload-icon-wrap { font-size: 48px; color: #94a3b8; margin-bottom: 16px; }
  .upload-card h3 { font-size: 17px; font-weight: 700; color: #0d1b2a; margin-bottom: 6px; }
  .upload-card p { font-size: 13px; color: #64748b; margin-bottom: 24px; }
  .file-label {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    background: #f8fafc;
    border: 1px solid #d1d5db;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    transition: all 0.15s;
    margin-bottom: 8px;
  }
  .file-label:hover { background: #f1f5f9; }
  #file-upload { display: none; }
  .btn-verify {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    background: #0d1b2a;
    color: white;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    font-family: inherit;
    margin-top: 16px;
  }
  .btn-verify:hover { background: #1a2d3f; }
  .btn-verify:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Manual card ─────────────────────────────────── */
  .manual-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-top: 3px solid #0d1b2a;
    padding: 32px;
    max-width: 560px;
  }
  .manual-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }

  /* ── Result card ─────────────────────────────────── */
  .result-card {
    margin-top: 24px;
    background: white;
    border: 1px solid #e2e8f0;
    max-width: 560px;
    overflow: hidden;
  }
  .result-banner {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 24px 28px;
  }
  .result-banner.authentic { background: #f0fdf4; border-bottom: 1px solid #bbf7d0; }
  .result-banner.fraudulent { background: #fef2f2; border-bottom: 1px solid #fecaca; }
  .result-banner.warning { background: #fffbeb; border-bottom: 1px solid #fde68a; }
  .result-icon-wrap { font-size: 40px; flex-shrink: 0; }
  .result-banner.authentic .result-icon-wrap { color: #16a34a; }
  .result-banner.fraudulent .result-icon-wrap { color: #dc2626; }
  .result-banner.warning .result-icon-wrap { color: #d97706; }
  .result-verdict { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #0d1b2a; }
  .result-banner.authentic .result-verdict { color: #15803d; }
  .result-banner.fraudulent .result-verdict { color: #b91c1c; }
  .result-banner.warning .result-verdict { color: #92400e; }
  .result-verdict-sub { font-size: 13px; color: #64748b; margin-top: 4px; }
  .result-details { padding: 20px 28px; display: flex; flex-direction: column; gap: 12px; }
  .detail-row { display: flex; gap: 16px; align-items: flex-start; font-size: 13px; }
  .detail-label { font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; min-width: 120px; margin-top: 2px; }
  code { background: #f1f5f9; padding: 3px 8px; font-size: 12px; border: 1px solid #e2e8f0; font-family: monospace; word-break: break-all; color: #1a1f2e; }

  /* ── Table ───────────────────────────────────────── */
  .data-table-wrap { background: white; border: 1px solid #e2e8f0; overflow: auto; }
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th {
    background: #f8fafc;
    padding: 11px 16px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    border-bottom: 1px solid #e2e8f0;
  }
  .data-table td {
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 13px;
    vertical-align: middle;
  }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: #fafafa; }
  .muted { color: #94a3b8; }
  .file-cell { display: flex; align-items: center; gap: 7px; color: #475569; }
  .file-cell i { color: #94a3b8; }
  .result-pill {
    display: inline-block;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border: 1px solid transparent;
  }
  .result-pill-authentic { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
  .result-pill-fraudulent { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
  .result-pill-pending { background: #fffbeb; color: #b45309; border-color: #fde68a; }

  /* ── Buttons ─────────────────────────────────────── */
  .btn-refresh {
    padding: 8px 14px;
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
    transition: all 0.15s;
  }
  .btn-refresh:hover { background: #f8fafc; }
</style>
