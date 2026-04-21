<script>
  import { api, login, getUser, clearAuth } from '../../shared/api.js';

  // ── ALL LOGIC UNCHANGED ──────────────────────────────────────────
  let user = $state(getUser());
  let page = $state('organizations');
  let username = $state('');
  let password = $state('');
  let loginError = $state('');
  let organizations = $state([]);
  let transactions = $state([]);
  let loading = $state(false);
  let message = $state('');
  let newOrg = $state({ name: '', type: 'university', email: '', contact_person: '' });

  async function handleLogin() {
    try { loginError = ''; const data = await login(username, password); user = data.user; await loadAll(); } catch (e) { loginError = e.message; }
  }

  function logout() { clearAuth(); user = null; }

  async function loadAll() { await Promise.all([loadOrgs(), loadTransactions()]); }

  async function loadOrgs() {
    try { organizations = await api('/organizations'); } catch (e) { console.error(e); }
  }

  async function loadTransactions() {
    try { transactions = await api('/blockchain/transactions'); } catch (e) { console.error(e); }
  }

  async function addOrg() {
    if (!newOrg.name || !newOrg.email) { message = 'Fill required fields'; return; }
    try {
      loading = true;
      await api('/organizations', { method: 'POST', body: JSON.stringify(newOrg) });
      message = 'Organization registered!';
      newOrg = { name: '', type: 'university', email: '', contact_person: '' };
      await loadOrgs();
      page = 'organizations';
    } catch (e) { message = e.message; } finally { loading = false; }
  }

  async function updateStatus(id, status) {
    try { await api(`/organizations/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }); await loadOrgs(); } catch (e) { message = e.message; }
  }

  if (user) loadAll();
</script>

<!-- ── LOGIN ─────────────────────────────────────────────────────── -->
{#if !user}
<div class="login-shell">
  <div class="login-panel">
    <div class="login-wordmark">
      <div class="zq-mark"><i class="fa-solid fa-link"></i></div>
      <span>Zequen</span>
    </div>
    <h1>Platform Command Centre</h1>
    <p class="login-sub">Sign in with your operator credentials to manage the Zequen network.</p>

    {#if loginError}
    <div class="login-error"><i class="fa-solid fa-circle-exclamation"></i> {loginError}</div>
    {/if}

    <div class="login-field">
      <label for="uname">Username</label>
      <input id="uname" type="text" placeholder="operator@zequen" bind:value={username} onkeydown={e => e.key === 'Enter' && handleLogin()}>
    </div>
    <div class="login-field">
      <label for="pass">Password</label>
      <input id="pass" type="password" placeholder="••••••••" bind:value={password} onkeydown={e => e.key === 'Enter' && handleLogin()}>
    </div>
    <button class="login-btn" onclick={handleLogin}>
      <i class="fa-solid fa-right-to-bracket"></i> Sign In
    </button>
    <p class="login-hint">Default: <code>operator@zequen</code> / <code>password123</code></p>
  </div>
  <div class="login-graphic">
    <div class="graphic-inner">
      <div class="graphic-node main-node"><i class="fa-solid fa-link"></i></div>
      <div class="graphic-ring ring-1"></div>
      <div class="graphic-ring ring-2"></div>
      <div class="graphic-label">Blockchain Credential Network</div>
    </div>
  </div>
</div>

<!-- ── MAIN PORTAL ────────────────────────────────────────────────── -->
{:else}
<div class="shell">

  <!-- TOP BAR -->
  <header class="topbar">
    <div class="topbar-left">
      <div class="topbar-logo"><i class="fa-solid fa-link"></i></div>
      <div class="topbar-title">
        <span class="topbar-brand">Zequen</span>
        <span class="topbar-divider">|</span>
        <span class="topbar-section">Dashboard</span>
      </div>
    </div>
    <div class="topbar-right">
      <div class="topbar-status">
        <span class="status-dot"></span>
        <span>Network Live</span>
      </div>
      <div class="topbar-user">
        <div class="topbar-avatar">{user.username[0].toUpperCase()}</div>
        <div class="topbar-userinfo">
          <div class="topbar-username">{user.username}</div>
          <div class="topbar-role">Platform Operator</div>
        </div>
      </div>
      <button class="topbar-logout" onclick={logout}>
        <i class="fa-solid fa-right-from-bracket"></i>
      </button>
    </div>
  </header>

  <div class="body">

    <!-- SIDEBAR -->
    <aside class="sidebar">
      <nav class="nav">
        <div class="nav-group-label">Operations</div>
        <ul>
          <li class:active={page === 'overview'}>
            <button onclick={() => page = 'overview'}>
              <i class="fa-solid fa-gauge-high"></i> Overview
            </button>
          </li>
          <li class:active={page === 'organizations'}>
            <button onclick={() => page = 'organizations'}>
              <i class="fa-solid fa-building-columns"></i> Organizations
            </button>
          </li>
          <li class:active={page === 'add-org'}>
            <button onclick={() => page = 'add-org'}>
              <i class="fa-solid fa-plus-circle"></i> Register Org
            </button>
          </li>
        </ul>
        <div class="nav-group-label">Blockchain</div>
        <ul>
          <li class:active={page === 'blockchain'}>
            <button onclick={() => page = 'blockchain'}>
              <i class="fa-solid fa-cubes"></i> Ledger
            </button>
          </li>
        </ul>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-network">
          <i class="fa-solid fa-circle-dot"></i> Ganache · localhost:8545
        </div>
      </div>
    </aside>

    <!-- CONTENT -->
    <main class="content">

      {#if message}
      <div class="toast">
        <i class="fa-solid fa-circle-check"></i>
        <span>{message}</span>
        <button onclick={() => message = ''}><i class="fa-solid fa-xmark"></i></button>
      </div>
      {/if}

      <!-- OVERVIEW ────────────────────────────────── -->
      {#if page === 'overview'}
      <div class="page-header">
        <div>
          <h1>System Overview</h1>
          <p class="page-desc">Real-time snapshot of the Zequen credential network</p>
        </div>
        <button class="btn-refresh" onclick={loadAll}><i class="fa-solid fa-arrows-rotate"></i> Refresh</button>
      </div>

      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-icon blue"><i class="fa-solid fa-building-columns"></i></div>
          <div class="kpi-body">
            <div class="kpi-value">{organizations.length}</div>
            <div class="kpi-label">Organizations</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon emerald"><i class="fa-solid fa-cubes"></i></div>
          <div class="kpi-body">
            <div class="kpi-value">{transactions.length}</div>
            <div class="kpi-label">Blockchain TXs</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon violet"><i class="fa-solid fa-certificate"></i></div>
          <div class="kpi-body">
            <div class="kpi-value">{organizations.filter(o => o.status === 'active').length}</div>
            <div class="kpi-label">Active Orgs</div>
          </div>
        </div>
      </div>

      <div class="section-header">
        <h2>Recent Organizations</h2>
        <button class="link-btn" onclick={() => page = 'organizations'}>View all →</button>
      </div>
      <div class="org-cards">
        {#each [...organizations].reverse().slice(0, 3) as o}
        <div class="org-card">
          <div class="org-card-icon"><i class="fa-solid fa-building-columns"></i></div>
          <div class="org-card-body">
            <div class="org-card-name">{o.name}</div>
            <div class="org-card-meta">{o.type} · {o.email}</div>
          </div>
          <span class="status-pill status-{o.status}">{o.status}</span>
        </div>
        {/each}
      </div>

      {#if transactions.length > 0}
      <div class="section-header" style="margin-top:32px">
        <h2>Latest Blockchain Activity</h2>
        <button class="link-btn" onclick={() => page = 'blockchain'}>View ledger →</button>
      </div>
      <div class="activity-list">
        {#each transactions.slice(0, 5) as t}
        <div class="activity-row">
          <div class="activity-icon"><i class="fa-solid fa-link"></i></div>
          <div class="activity-body">
            <div class="activity-title"><code>{t.certificate_uid}</code> registered on chain</div>
            <div class="activity-meta">by {t.org_name} · Block #{t.block_number}</div>
          </div>
          <div class="activity-hash"><code>{t.tx_hash?.slice(0, 14)}...</code></div>
        </div>
        {/each}
      </div>
      {/if}

      <!-- ORGANIZATIONS ───────────────────────────── -->
      {:else if page === 'organizations'}
      <div class="page-header">
        <div>
          <h1>Network Organizations</h1>
          <p class="page-desc">{organizations.length} registered organization{organizations.length !== 1 ? 's' : ''} on the Zequen network</p>
        </div>
        <button class="btn-primary" onclick={() => page = 'add-org'}>
          <i class="fa-solid fa-plus"></i> Register Org
        </button>
      </div>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Organization</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each organizations as o}
            <tr>
              <td class="muted">#{o.id}</td>
              <td>
                <div class="org-name-cell">
                  <div class="org-initials">{o.name.split(' ').map(w => w[0]).join('').slice(0,2)}</div>
                  <div>
                    <div class="org-name">{o.name}</div>
                    <div class="org-email">{o.email}</div>
                    <div class="org-wallet">
                      <i class="fa-solid fa-wallet"></i>
                      {o.wallet_address ? o.wallet_address.slice(0, 20) + '...' : 'Wallet pending'}
                    </div>
                  </div>
                </div>
              </td>
              <td><span class="type-badge">{o.type}</span></td>
              <td><span class="status-pill status-{o.status}">{o.status}</span></td>
              <td>
                {#if o.status === 'active'}
                  <button class="btn-sm btn-danger" onclick={() => updateStatus(o.id, 'inactive')}>
                    <i class="fa-solid fa-ban"></i> Suspend
                  </button>
                {:else}
                  <button class="btn-sm btn-success" onclick={() => updateStatus(o.id, 'active')}>
                    <i class="fa-solid fa-check"></i> Activate
                  </button>
                {/if}
              </td>
            </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- ADD ORG ─────────────────────────────────── -->
      {:else if page === 'add-org'}
      <div class="page-header">
        <div>
          <h1>Register New Organization</h1>
          <p class="page-desc">Add a university, issuer, or verifier to the Zequen network</p>
        </div>
      </div>
      <div class="form-card">
        <div class="form-section-title"><i class="fa-solid fa-building-columns"></i> Organization Details</div>
        <div class="form-grid">
          <div class="form-field">
            <label for="oname">Organization Name *</label>
            <input id="oname" bind:value={newOrg.name} placeholder="e.g. Global Tech Institute">
          </div>
          <div class="form-field">
            <label for="otype">Organization Type</label>
            <select id="otype" bind:value={newOrg.type}>
              <option value="university">University / Educational Institution</option>
              <option value="issuer">Government / Authorized Issuer</option>
              <option value="verifier">Corporate Verifier</option>
            </select>
          </div>
          <div class="form-field">
            <label for="oemail">Contact Email *</label>
            <input id="oemail" bind:value={newOrg.email} placeholder="admin@institute.edu">
          </div>
          <div class="form-field">
            <label for="ocontact">Contact Person</label>
            <input id="ocontact" bind:value={newOrg.contact_person} placeholder="John Doe (optional)">
          </div>
        </div>

        <div class="info-box">
          <i class="fa-solid fa-circle-info"></i>
          <div>
            <strong>Automatic Wallet Assignment</strong>
            <p>Upon registration, a blockchain wallet address will be automatically assigned to this organization from the active Ganache network. A default admin user <code>admin@{newOrg.name?.toLowerCase().replace(/\s+/g, '') || 'domain'}</code> will also be created.</p>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn-primary" onclick={addOrg} disabled={loading}>
            {#if loading}<i class="fa-solid fa-arrows-rotate fa-spin"></i> Registering...{:else}<i class="fa-solid fa-plus"></i> Register Organization{/if}
          </button>
          <button class="btn-secondary" onclick={() => page = 'organizations'}>Cancel</button>
        </div>
      </div>

      <!-- BLOCKCHAIN LEDGER ─────────────────────────── -->
      {:else if page === 'blockchain'}
      <div class="page-header">
        <div>
          <h1>Blockchain Ledger</h1>
          <p class="page-desc">{transactions.length} on-chain certificate registration{transactions.length !== 1 ? 's' : ''}</p>
        </div>
        <button class="btn-refresh" onclick={loadTransactions}><i class="fa-solid fa-arrows-rotate"></i> Refresh</button>
      </div>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>TX Hash</th>
              <th>Method</th>
              <th>Certificate UID</th>
              <th>Issuing Org</th>
              <th>Block</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {#each transactions as t}
            <tr>
              <td><code class="hash-code" title={t.tx_hash}>{t.tx_hash?.slice(0, 16)}...</code></td>
              <td><span class="method-pill">registerCertificate</span></td>
              <td><code>{t.certificate_uid}</code></td>
              <td>
                <div class="org-name-cell">
                  <div class="org-initials small">{t.org_name?.split(' ').map(w => w[0]).join('').slice(0,2)}</div>
                  {t.org_name}
                </div>
              </td>
              <td><span class="block-pill">#{t.block_number}</span></td>
              <td class="muted">{new Date(t.created_at).toLocaleString()}</td>
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
  /* ── Reset ─────────────────────────────────────── */
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }
  :global(body) {
    font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
    background: #f0f2f5;
    color: #111827;
    font-size: 14px;
  }

  /* ── Login ─────────────────────────────────────── */
  .login-shell {
    display: flex;
    min-height: 100vh;
  }
  .login-panel {
    width: 460px;
    flex-shrink: 0;
    background: #fff;
    padding: 64px 56px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border-right: 1px solid #e5e7eb;
  }
  .login-wordmark {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 40px;
  }
  .zq-mark {
    width: 38px; height: 38px;
    background: #111827;
    color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
  }
  .login-wordmark span {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #111827;
  }
  .login-panel h1 {
    font-size: 26px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 8px;
    letter-spacing: -0.4px;
  }
  .login-sub {
    font-size: 14px;
    color: #6b7280;
    line-height: 1.6;
    margin-bottom: 36px;
  }
  .login-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
    padding: 10px 14px;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
  }
  .login-field { margin-bottom: 18px; }
  .login-field label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 6px;
  }
  .login-field input {
    width: 100%;
    padding: 11px 14px;
    border: 1px solid #d1d5db;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s;
    font-family: inherit;
    background: #fafafa;
  }
  .login-field input:focus { border-color: #111827; background: white; }
  .login-btn {
    width: 100%;
    margin-top: 8px;
    padding: 13px;
    background: #111827;
    color: white;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: inherit;
    transition: background 0.15s;
  }
  .login-btn:hover { background: #1f2937; }
  .login-hint {
    font-size: 12px;
    color: #9ca3af;
    text-align: center;
    margin-top: 16px;
  }
  .login-hint code {
    background: #f3f4f6;
    padding: 2px 6px;
    font-size: 11px;
    border: 1px solid #e5e7eb;
  }
  .login-graphic {
    flex: 1;
    background: #111827;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  .graphic-inner {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 24px;
  }
  .graphic-node {
    width: 80px; height: 80px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    font-size: 32px;
    color: white;
    position: relative;
    z-index: 2;
  }
  .graphic-ring {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .ring-1 { width: 240px; height: 240px; }
  .ring-2 { width: 400px; height: 400px; }
  .graphic-label {
    color: rgba(255,255,255,0.4);
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    position: absolute;
    bottom: -56px;
  }

  /* ── Shell ─────────────────────────────────────── */
  .shell { display: flex; flex-direction: column; min-height: 100vh; }

  /* ── Topbar ────────────────────────────────────── */
  .topbar {
    background: #111827;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    position: sticky;
    top: 0;
    z-index: 100;
    border-bottom: 1px solid #1f2937;
  }
  .topbar-left { display: flex; align-items: center; gap: 14px; }
  .topbar-logo {
    width: 32px; height: 32px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: 14px;
  }
  .topbar-brand { font-size: 15px; font-weight: 800; color: white; letter-spacing: -0.3px; }
  .topbar-divider { color: #374151; margin: 0 4px; }
  .topbar-section { font-size: 14px; color: #6b7280; font-weight: 500; }
  .topbar-right { display: flex; align-items: center; gap: 20px; }
  .topbar-status {
    display: flex; align-items: center; gap: 7px;
    font-size: 12px; color: #6b7280;
  }
  .status-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 0 2px rgba(34,197,94,0.2);
  }
  .topbar-user { display: flex; align-items: center; gap: 10px; }
  .topbar-avatar {
    width: 32px; height: 32px;
    background: #1f2937;
    border: 1px solid #374151;
    color: #9ca3af;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700;
  }
  .topbar-username { font-size: 13px; font-weight: 600; color: #f9fafb; }
  .topbar-role { font-size: 11px; color: #6b7280; }
  .topbar-logout {
    background: none;
    border: 1px solid #374151;
    color: #6b7280;
    width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 14px;
    transition: all 0.15s;
  }
  .topbar-logout:hover { background: #1f2937; color: #f9fafb; }

  /* ── Body ──────────────────────────────────────── */
  .body { display: flex; flex: 1; }

  /* ── Sidebar ───────────────────────────────────── */
  .sidebar {
    width: 220px;
    background: white;
    border-right: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    padding: 20px 0;
  }
  .nav { flex: 1; padding: 0 10px; }
  .nav-group-label {
    font-size: 10px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 16px 10px 6px;
  }
  .nav ul { list-style: none; }
  .nav ul li button {
    width: 100%;
    text-align: left;
    padding: 8px 12px;
    background: none;
    border: none;
    border-left: 2px solid transparent;
    color: #6b7280;
    font-size: 13.5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: inherit;
    transition: all 0.12s;
  }
  .nav ul li button:hover { color: #111827; background: #f9fafb; }
  .nav ul li.active button {
    color: #111827;
    background: #f3f4f6;
    border-left-color: #111827;
    font-weight: 600;
  }
  .sidebar-footer {
    padding: 16px 20px;
    border-top: 1px solid #f3f4f6;
  }
  .sidebar-network {
    font-size: 11px;
    color: #9ca3af;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .sidebar-network i { color: #22c55e; }

  /* ── Content ───────────────────────────────────── */
  .content { flex: 1; padding: 28px 32px; overflow-y: auto; }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e5e7eb;
  }
  .page-header h1 { font-size: 22px; font-weight: 700; color: #111827; }
  .page-desc { font-size: 13px; color: #6b7280; margin-top: 3px; }

  /* ── Toast ─────────────────────────────────────── */
  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #111827;
    color: white;
    padding: 12px 16px;
    margin-bottom: 20px;
    border-left: 3px solid #22c55e;
    font-size: 13px;
  }
  .toast i { color: #22c55e; }
  .toast span { flex: 1; }
  .toast button {
    background: none; border: none;
    color: #6b7280; cursor: pointer; font-size: 14px;
  }

  /* ── KPI Cards ─────────────────────────────────── */
  .kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
  .kpi-card {
    background: white;
    border: 1px solid #e5e7eb;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .kpi-icon {
    width: 44px; height: 44px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }
  .kpi-icon.blue { background: #eff6ff; color: #2563eb; }
  .kpi-icon.emerald { background: #f0fdf4; color: #16a34a; }
  .kpi-icon.violet { background: #faf5ff; color: #7c3aed; }
  .kpi-value { font-size: 30px; font-weight: 800; color: #111827; line-height: 1; }
  .kpi-label { font-size: 12px; color: #6b7280; margin-top: 4px; }

  /* ── Section header ────────────────────────────── */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .section-header h2 { font-size: 15px; font-weight: 700; color: #111827; }
  .link-btn {
    background: none; border: none;
    font-size: 13px; color: #6b7280;
    cursor: pointer; font-family: inherit;
    transition: color 0.12s;
  }
  .link-btn:hover { color: #111827; }

  /* ── Org cards (overview) ──────────────────────── */
  .org-cards { display: flex; flex-direction: column; gap: 8px; }
  .org-card {
    display: flex;
    align-items: center;
    gap: 14px;
    background: white;
    border: 1px solid #e5e7eb;
    padding: 14px 16px;
  }
  .org-card-icon {
    width: 36px; height: 36px;
    background: #f3f4f6;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; color: #6b7280;
    flex-shrink: 0;
  }
  .org-card-body { flex: 1; }
  .org-card-name { font-size: 13px; font-weight: 600; color: #111827; }
  .org-card-meta { font-size: 12px; color: #9ca3af; margin-top: 2px; }

  /* ── Activity List ─────────────────────────────── */
  .activity-list { display: flex; flex-direction: column; gap: 0; }
  .activity-row {
    display: flex;
    align-items: center;
    gap: 14px;
    background: white;
    border: 1px solid #e5e7eb;
    border-bottom-width: 0;
    padding: 12px 16px;
  }
  .activity-row:last-child { border-bottom-width: 1px; }
  .activity-icon {
    width: 30px; height: 30px;
    background: #eff6ff;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; color: #2563eb;
    flex-shrink: 0;
  }
  .activity-body { flex: 1; }
  .activity-title { font-size: 13px; color: #111827; }
  .activity-meta { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  .activity-hash code { font-size: 11px; color: #6b7280; }

  /* ── Data Tables ───────────────────────────────── */
  .data-table-wrap { background: white; border: 1px solid #e5e7eb; overflow: auto; }
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th {
    background: #f9fafb;
    padding: 11px 16px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    border-bottom: 1px solid #e5e7eb;
  }
  .data-table td {
    padding: 13px 16px;
    border-bottom: 1px solid #f3f4f6;
    font-size: 13px;
    color: #111827;
    vertical-align: middle;
  }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: #fafafa; }
  .muted { color: #9ca3af; }

  /* ── Org name cell ─────────────────────────────── */
  .org-name-cell { display: flex; align-items: center; gap: 10px; }
  .org-initials {
    width: 32px; height: 32px;
    background: #111827;
    color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700;
    flex-shrink: 0;
    letter-spacing: 0.3px;
  }
  .org-initials.small { width: 26px; height: 26px; font-size: 10px; }
  .org-name { font-size: 13px; font-weight: 600; }
  .org-email { font-size: 11px; color: #9ca3af; }
  .org-wallet {
    font-size: 10.5px;
    color: #6b7280;
    font-family: 'Courier New', monospace;
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 2px;
  }
  .org-wallet i { font-size: 9px; color: #9ca3af; }

  /* ── Code and badges ───────────────────────────── */
  code {
    background: #f3f4f6;
    padding: 2px 7px;
    font-size: 12px;
    border: 1px solid #e5e7eb;
    font-family: 'Courier New', monospace;
    color: #374151;
  }
  .hash-code { font-size: 11px; }
  .type-badge {
    display: inline-block;
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #e5e7eb;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
    text-transform: capitalize;
  }
  .method-pill {
    display: inline-block;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #dbeafe;
    padding: 3px 10px;
    font-size: 11px;
    font-family: monospace;
  }
  .block-pill {
    display: inline-block;
    background: #f0fdf4;
    color: #15803d;
    border: 1px solid #dcfce7;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
  }
  .status-pill {
    display: inline-block;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
    text-transform: capitalize;
    border: 1px solid transparent;
  }
  .status-active { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
  .status-inactive { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }

  /* ── Form ──────────────────────────────────────── */
  .form-card {
    background: white;
    border: 1px solid #e5e7eb;
    padding: 28px 32px;
    max-width: 720px;
  }
  .form-section-title {
    font-size: 13px;
    font-weight: 700;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    padding-bottom: 14px;
    border-bottom: 1px solid #f3f4f6;
  }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 24px; }
  .form-field { display: flex; flex-direction: column; gap: 6px; }
  .form-field label { font-size: 13px; font-weight: 600; color: #374151; }
  .form-field input, .form-field select {
    padding: 10px 13px;
    border: 1px solid #d1d5db;
    font-size: 13px;
    outline: none;
    font-family: inherit;
    transition: border-color 0.15s;
    background: #fafafa;
  }
  .form-field input:focus, .form-field select:focus { border-color: #111827; background: white; }
  .info-box {
    display: flex;
    gap: 12px;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-left: 3px solid #0284c7;
    padding: 14px 16px;
    margin-bottom: 24px;
    font-size: 13px;
    color: #0c4a6e;
    align-items: flex-start;
  }
  .info-box i { color: #0284c7; margin-top: 1px; flex-shrink: 0; }
  .info-box strong { font-size: 13px; font-weight: 700; display: block; margin-bottom: 4px; }
  .info-box p { font-size: 12px; color: #075985; line-height: 1.5; }
  .info-box code { background: rgba(255,255,255,0.7); font-size: 11px; }
  .form-actions { display: flex; gap: 12px; }

  /* ── Buttons ───────────────────────────────────── */
  .btn-primary {
    padding: 9px 18px;
    background: #111827;
    color: white;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    transition: background 0.15s;
    font-family: inherit;
  }
  .btn-primary:hover { background: #1f2937; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary {
    padding: 9px 18px;
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .btn-secondary:hover { background: #f9fafb; }
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
  .btn-refresh:hover { background: #f9fafb; }
  .btn-sm {
    padding: 5px 12px;
    border: 1px solid transparent;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: inherit;
  }
  .btn-danger { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
  .btn-danger:hover { background: #fee2e2; }
  .btn-success { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
  .btn-success:hover { background: #dcfce7; }
</style>
