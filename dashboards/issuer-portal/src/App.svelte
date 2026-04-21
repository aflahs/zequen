<script>
  import { api, login, getUser, clearAuth } from '../../shared/api.js';

  let user = $state(getUser());
  let page = $state('pending');
  let username = $state('');
  let password = $state('');
  let loginError = $state('');
  let organizations = $state([]);
  let certificates = $state([]);
  let transactions = $state([]);
  let loading = $state(false);
  let message = $state('');

  async function handleLogin() {
    try { loginError = ''; const data = await login(username, password); user = data.user; await loadAll(); } catch (e) { loginError = e.message; }
  }

  function logout() { clearAuth(); user = null; }

  async function loadAll() {
    await Promise.all([loadOrgs(), loadCertificates(), loadTransactions()]);
  }

  async function loadOrgs() {
    try { organizations = await api('/organizations'); } catch (e) { console.error(e); }
  }

  async function loadCertificates() {
    try { certificates = await api('/certificates?status=approved'); } catch (e) { console.error(e); }
  }

  async function loadTransactions() {
    try { transactions = await api('/blockchain/transactions'); } catch (e) { console.error(e); }
  }

  async function registerOnBlockchain(certId) {
    try {
      loading = true;
      const result = await api('/blockchain/register', {
        method: 'POST',
        body: JSON.stringify({ certificate_id: certId }),
      });
      message = `<i class="fa-solid fa-check"></i> Registered! TX: ${result.txHash.slice(0, 18)}...`;
      await loadAll();
    } catch (e) { message = '<i class="fa-solid fa-xmark"></i> ' + e.message; } finally { loading = false; }
  }

  if (user) loadAll();
</script>

{#if !user}
<div class="login-container">
  <div class="login-card">
    <div class="login-brand">
      <div class="logo"><i class="fa-solid fa-link"></i></div>
      <h1>Issuer Portal</h1>
      <p>Zequen — Blockchain Certificate Registration</p>
    </div>
    {#if loginError}<div class="error">{loginError}</div>{/if}
    <input type="text" placeholder="Username (e.g. issuer@zequen)" bind:value={username}>
    <input type="password" placeholder="Password" bind:value={password}>
    <button class="btn-primary" onclick={handleLogin}>Sign In</button>
    <p class="hint">Default: issuer@zequen / password123</p>
  </div>
</div>
{:else}
<div class="app-layout">
  <nav class="sidebar">
    <div class="sidebar-brand"><span><i class="fa-solid fa-link"></i></span><h2>Issuer Portal</h2></div>
    <div class="sidebar-user">
      <span class="user-avatar">{user.username[0].toUpperCase()}</span>
      <div><strong>{user.username}</strong><small>Issuer</small></div>
    </div>
    <ul class="nav-links">
      <li class:active={page==='pending'}><button onclick={() => page='pending'}><i class="fa-solid fa-list-check"></i> Pending Registration</button></li>
      <li class:active={page==='transactions'}><button onclick={() => page='transactions'}><i class="fa-solid fa-chart-line"></i> Transaction History</button></li>
      <li class:active={page==='orgs'}><button onclick={() => page='orgs'}><i class="fa-solid fa-building-columns"></i> Organizations</button></li>
    </ul>
    <button class="logout-btn" onclick={logout}><i class="fa-solid fa-right-from-bracket"></i> Sign Out</button>
  </nav>

  <main class="content">
    {#if message}<div class="toast"><span>{@html message}</span><button onclick={() => message=''}>&times;</button></div>{/if}

    {#if page === 'pending'}
    <div class="page-header"><h1>Approved Certificates — Pending Blockchain Registration</h1></div>
    {#if certificates.length === 0}
    <div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-list-check"></i></div><h3>No approved certificates pending</h3><p>Certificates approved by university admins will appear here for blockchain registration.</p></div>
    {:else}
    <div class="table-container">
      <table>
        <thead><tr><th>Certificate ID</th><th>Student</th><th>Institution</th><th>Degree</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {#each certificates as c}
          <tr>
            <td><code>{c.certificate_uid}</code></td>
            <td>{c.student_name}</td>
            <td>{c.institution}</td>
            <td>{c.degree}</td>
            <td><span class="status-badge status-{c.status}">{c.status}</span></td>
            <td>
              {#if c.status === 'approved'}
              <button class="btn-register" onclick={() => registerOnBlockchain(c.id)} disabled={loading}>
                {#if loading}
                  <i class="fa-solid fa-hourglass-half"></i> Registering...
                {:else}
                  <i class="fa-solid fa-link"></i> Register on Chain
                {/if}
              </button>
              {:else}
              <span class="registered-badge"><i class="fa-solid fa-check"></i> Registered</span>
              {/if}
            </td>
          </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {/if}

    {:else if page === 'transactions'}
    <div class="page-header"><h1>Blockchain Transaction History</h1><span class="badge">{transactions.length} records</span></div>
    <div class="table-container">
      <table>
        <thead><tr><th>TX Hash</th><th>Certificate</th><th>Student</th><th>Organization</th><th>Block</th><th>Date</th></tr></thead>
        <tbody>
          {#each transactions as t}
          <tr>
            <td><code title={t.tx_hash}>{t.tx_hash?.slice(0, 16)}...</code></td>
            <td><code>{t.certificate_uid}</code></td>
            <td>{t.student_name}</td>
            <td>{t.org_name}</td>
            <td>#{t.block_number}</td>
            <td>{new Date(t.created_at).toLocaleDateString()}</td>
          </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {:else if page === 'orgs'}
    <div class="page-header"><h1>Connected Organizations</h1></div>
    <div class="card-grid">
      {#each organizations as o}
      <div class="org-card">
        <div class="org-type-badge">{o.type === 'university' ? '<i class="fa-solid fa-building-columns"></i>' : '<i class="fa-solid fa-building"></i>'} {o.type}</div>
        <h3>{o.name}</h3>
        <div class="org-detail"><span><i class="fa-solid fa-envelope"></i></span> {o.email || 'N/A'}</div>
        <div class="org-detail"><span><i class="fa-solid fa-key"></i></span> <code>{o.wallet_address ? o.wallet_address.slice(0, 16) + '...' : 'Not assigned'}</code></div>
        <div class="org-status">Status:  <span class="status-badge status-{o.status}">{o.status}</span></div>
      </div>
      {/each}
    </div>
    {/if}
  </main>
</div>
{/if}

<style>
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }
  :global(body) { font-family: 'Inter', -apple-system, sans-serif; background: #f8fafc; color: #0f172a; }

  .login-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; }
  .login-card { background: white; border-radius: 0; padding: 48px; width: 400px; box-shadow: none; border: 1px solid #1e293b; text-align: center; }
  .login-brand .logo { font-size: 48px; margin-bottom: 8px; color: #2563eb; }
  .login-brand h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .login-brand p { color: #475569; margin-bottom: 32px; font-size: 14px; }
  .login-card input { width: 100%; padding: 14px 18px; border: 1px solid #cbd5e1; border-radius: 0; font-size: 15px; margin-bottom: 14px; outline: none; transition: border-color 0.2s; }
  .login-card input:focus { border-color: #2563eb; }
  .hint { color: #64748b; font-size: 12px; margin-top: 16px; }
  .error { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 0; margin-bottom: 14px; font-size: 13px; border: 1px solid #f87171; }
  .btn-primary { width: 100%; padding: 14px; background: #2563eb; color: white; border: none; border-radius: 0; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
  .btn-primary:hover { background: #1d4ed8; }

  .app-layout { display: flex; min-height: 100vh; }
  .sidebar { width: 260px; background: #1e293b; color: white; padding: 24px 16px; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; }
  .sidebar-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; padding: 0 8px; color: #f8fafc; }
  .sidebar-brand h2 { font-size: 20px; font-weight: 700; }
  .sidebar-brand span { font-size: 28px; color: #3b82f6; }
  .sidebar-user { display: flex; align-items: center; gap: 10px; padding: 12px; margin-bottom: 24px; background: #334155; border-radius: 0; }
  .user-avatar { width: 36px; height: 36px; border-radius: 0; background: #0f172a; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
  .sidebar-user small { display: block; color: #94a3b8; font-size: 11px; }
  .nav-links { list-style: none; flex: 1; }
  .nav-links li button { width: 100%; text-align: left; padding: 12px 16px; background: none; border: none; color: #cbd5e1; font-size: 14px; cursor: pointer; border-radius: 0; transition: all 0.2s; display: flex; align-items: center; gap: 10px; }
  .nav-links li button:hover, .nav-links li.active button { background: #334155; color: white; border-left: 3px solid #3b82f6; }
  .logout-btn { padding: 12px; background: #0f172a; border: 1px solid #334155; color: #cbd5e1; border-radius: 0; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 10px; }
  .logout-btn:hover { background: #7f1d1d; color: #fecaca; border-color: #991b1b; }

  .content { margin-left: 260px; flex: 1; padding: 32px; }
  .page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; }
  .page-header h1 { font-size: 28px; font-weight: 700; }
  .badge { background: #e2e8f0; color: #334155; padding: 6px 14px; border-radius: 0; font-size: 13px; font-weight: 600; }
  .toast { background: #0f172a; color: white; padding: 12px 20px; border-radius: 0; border-left: 4px solid #3b82f6; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
  .toast button { background: none; border: none; color: white; font-size: 18px; cursor: pointer; }

  .table-container { background: white; border-radius: 0; overflow: auto; border: 1px solid #cbd5e1; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f8fafc; padding: 14px 18px; text-align: left; font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  code { background: #f1f5f9; padding: 4px 8px; border-radius: 0; font-size: 12px; color: #0f172a; border: 1px solid #e2e8f0; }

  .status-badge { padding: 4px 12px; border-radius: 0; font-size: 12px; font-weight: 600; text-transform: capitalize; border: 1px solid transparent; }
  .status-approved { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
  .status-registered { background: #f0f9ff; color: #0369a1; border-color: #bae6fd; }
  .status-active { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
  .status-inactive { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }

  .btn-register { padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 0; font-size: 12px; font-weight: 600; cursor: pointer; }
  .btn-register:hover { background: #1d4ed8; }
  .btn-register:disabled { opacity: 0.5; cursor: not-allowed; }
  .registered-badge { color: #15803d; font-size: 13px; font-weight: 600; }

  .empty-state { text-align: center; padding: 60px; background: white; border-radius: 0; border: 1px solid #cbd5e1; }
  .empty-icon { font-size: 56px; margin-bottom: 12px; color: #94a3b8; }
  .empty-state h3 { margin-bottom: 6px; }
  .empty-state p { color: #64748b; font-size: 14px; }

  .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
  .org-card { background: white; border-radius: 0; padding: 24px; border: 1px solid #cbd5e1; transition: border-color 0.2s; }
  .org-card:hover { border-color: #94a3b8; }
  .org-type-badge { font-size: 12px; font-weight: 600; color: #2563eb; text-transform: capitalize; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .org-card h3 { font-size: 17px; margin-bottom: 12px; }
  .org-detail { font-size: 13px; color: #475569; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
  .org-status { margin-top: 12px; font-size: 13px; }
</style>
