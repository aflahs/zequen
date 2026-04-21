<script>
  import { api, login, getUser, clearAuth } from '../../shared/api.js';

  let user = $state(getUser());
  let page = $state('students');
  let username = $state('');
  let password = $state('');
  let loginError = $state('');
  let students = $state([]);
  let certificates = $state([]);
  let loading = $state(false);
  let approving = $state(null);
  let newStudent = $state({ student_uid: '', name: '', degree: '', institution: '', graduation_year: '' });
  let message = $state('');
  let messageType = $state('success'); // 'success' | 'error'

  async function handleLogin() {
    try {
      loginError = '';
      const data = await login(username, password);
      user = data.user;
      await loadStudents();
      await loadCertificates();
    } catch (e) { loginError = e.message; }
  }

  function logout() { clearAuth(); user = null; }

  async function loadStudents() {
    try { students = await api('/students'); } catch (e) { console.error(e); }
  }

  async function loadCertificates() {
    try { certificates = await api('/certificates'); } catch (e) { console.error(e); }
  }

  async function addStudent() {
    if (!newStudent.name || !newStudent.student_uid) { showMsg('Please fill required fields', 'error'); return; }
    try {
      loading = true;
      const org = user?.org_name || 'National University of Technology';
      await api('/students', {
        method: 'POST',
        body: JSON.stringify({ ...newStudent, institution: org, org_id: user?.org_id }),
      });
      showMsg('Student enrolled successfully.', 'success');
      newStudent = { student_uid: '', name: '', degree: '', institution: '', graduation_year: '' };
      await loadStudents();
    } catch (e) { showMsg(e.message, 'error'); } finally { loading = false; }
  }

  async function generateCertificate(studentId) {
    try {
      loading = true;
      await api('/certificates/generate', {
        method: 'POST',
        body: JSON.stringify({ student_id: studentId }),
      });
      showMsg('Certificate generated and pending approval.', 'success');
      await loadCertificates();
    } catch (e) { showMsg(e.message, 'error'); } finally { loading = false; }
  }

  async function approveCert(id) {
    try {
      approving = id;
      const result = await api(`/certificates/${id}/approve`, { method: 'PUT' });
      const tx = result.txHash ? result.txHash.slice(0, 22) + '...' : '';
      showMsg(`Certificate approved & registered on blockchain. TX: ${tx}`, 'success');
      await loadCertificates();
    } catch (e) { showMsg('Registration failed: ' + e.message, 'error'); } finally { approving = null; }
  }

  async function rejectCert(id) {
    try {
      await api(`/certificates/${id}/reject`, { method: 'PUT' });
      showMsg('Certificate rejected.', 'error');
      await loadCertificates();
    } catch (e) { showMsg(e.message, 'error'); }
  }

  function downloadCert(id) {
    const token = localStorage.getItem('zequen_token');
    window.open(`http://localhost:4000/api/certificates/${id}/download?token=${token}`, '_blank');
  }

  function showMsg(text, type = 'success') {
    message = text;
    messageType = type;
    setTimeout(() => message = '', 6000);
  }

  const registeredCount = $derived(certificates.filter(c => c.status === 'registered').length);
  const pendingCount = $derived(certificates.filter(c => c.status === 'pending').length);

  // ── Plugin modal state (UI-only mockups) ──
  let showIssuerConfig = $state(false);
  let showVfrConfig = $state(false);
  let showCertGenConfig = $state(false);
  let showAddPlugin = $state(false);

  if (user) { loadStudents(); loadCertificates(); }
</script>

{#if !user}
<div class="login-shell">
  <div class="login-left">
    <div class="login-left-inner">
      <div class="univ-seal">
        <i class="fa-solid fa-landmark-dome"></i>
      </div>
      <h1>National University<br>of Technology</h1>
      <p class="univ-tagline">Knowledge • Integrity • Excellence</p>
      <div class="login-decoration">
        <div class="deco-line"></div>
        <span>Est. 1962</span>
        <div class="deco-line"></div>
      </div>
    </div>
  </div>
  <div class="login-right">
    <div class="login-form-container">
      <div class="login-form-header">
        <div class="zequen-badge"><i class="fa-solid fa-link"></i> Powered by Zequen</div>
        <h2>Academic Administration Portal</h2>
        <p>Sign in with your institutional credentials to continue.</p>
      </div>
      {#if loginError}<div class="alert alert-error"><i class="fa-solid fa-circle-exclamation"></i> {loginError}</div>{/if}
      <div class="form-field">
        <label for="uname">Username</label>
        <input id="uname" type="text" placeholder="e.g. admin@nut" bind:value={username} onkeydown={e => e.key === 'Enter' && handleLogin()}>
      </div>
      <div class="form-field">
        <label for="pass">Password</label>
        <input id="pass" type="password" placeholder="••••••••••" bind:value={password} onkeydown={e => e.key === 'Enter' && handleLogin()}>
      </div>
      <button class="btn-signin" onclick={handleLogin}>
        <i class="fa-solid fa-right-to-bracket"></i> Sign In
      </button>
      <p class="login-hint">Default credentials: <code>admin@nut</code> / <code>password123</code></p>
    </div>
  </div>
</div>

{:else}
<div class="portal-shell">

  <!-- TOP HEADER BAR -->
  <header class="top-header">
    <div class="header-left">
      <div class="header-seal"><i class="fa-solid fa-landmark-dome"></i></div>
      <div>
        <div class="header-university">National University of Technology</div>
        <div class="header-sub">Academic Administration Portal</div>
      </div>
    </div>
    <div class="header-right">
      <div class="header-user">
        <div class="header-avatar">{user.username[0].toUpperCase()}</div>
        <div>
          <div class="header-username">{user.username}</div>
          <div class="header-role">University Administrator</div>
        </div>
      </div>
      <button class="btn-logout" onclick={logout}><i class="fa-solid fa-right-from-bracket"></i> Sign Out</button>
    </div>
  </header>

  <div class="portal-body">

    <!-- SIDEBAR -->
    <aside class="sidebar">
      <nav class="sidebar-nav">
        <div class="nav-section-label">Main</div>
        <ul>
          <li class:active={page === 'dashboard'}>
            <button onclick={() => page = 'dashboard'}><i class="fa-solid fa-gauge-high"></i> Dashboard</button>
          </li>
          <li class:active={page === 'students'}>
            <button onclick={() => page = 'students'}><i class="fa-solid fa-users"></i> Students</button>
          </li>
          <li class:active={page === 'add-student'}>
            <button onclick={() => page = 'add-student'}><i class="fa-solid fa-user-plus"></i> Enrol Student</button>
          </li>
          <li class:active={page === 'certificates'}>
            <button onclick={() => page = 'certificates'}><i class="fa-solid fa-file-contract"></i> Certificates</button>
          </li>
        </ul>
        <div class="nav-section-label">System</div>
        <ul>
          <li class:active={page === 'plugins'}>
            <button onclick={() => page = 'plugins'}><i class="fa-solid fa-plug"></i> Plugins</button>
          </li>
        </ul>
      </nav>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="main-content">

      {#if message}
      <div class="alert-banner alert-{messageType}">
        <i class="fa-solid {messageType === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
        {message}
        <button onclick={() => message = ''}><i class="fa-solid fa-xmark"></i></button>
      </div>
      {/if}

      <!-- DASHBOARD -->
      {#if page === 'dashboard'}
      <div class="page-title">
        <div>
          <h1>Dashboard</h1>
          <p class="page-sub">Welcome back, {user.username}. Here's your academic overview.</p>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fa-solid fa-users"></i></div>
          <div class="stat-data">
            <div class="stat-value">{students.length}</div>
            <div class="stat-label">Enrolled Students</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon slate"><i class="fa-solid fa-file-lines"></i></div>
          <div class="stat-data">
            <div class="stat-value">{certificates.length}</div>
            <div class="stat-label">Total Certificates</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber"><i class="fa-solid fa-clock"></i></div>
          <div class="stat-data">
            <div class="stat-value">{pendingCount}</div>
            <div class="stat-label">Pending Approval</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fa-solid fa-link"></i></div>
          <div class="stat-data">
            <div class="stat-value">{registeredCount}</div>
            <div class="stat-label">On Blockchain</div>
          </div>
        </div>
      </div>

      {#if pendingCount > 0}
      <div class="info-banner">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <strong>{pendingCount} certificate{pendingCount > 1 ? 's' : ''} awaiting your approval.</strong>
        <button class="link-btn" onclick={() => page = 'certificates'}>Review now →</button>
      </div>
      {/if}

      <!-- STUDENTS PAGE -->
      {:else if page === 'students'}
      <div class="page-title">
        <div>
          <h1>Student Directory</h1>
          <p class="page-sub">{students.length} enrolled students</p>
        </div>
        <button class="btn-primary" onclick={() => page = 'add-student'}><i class="fa-solid fa-user-plus"></i> Enrol Student</button>
      </div>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Full Name</th>
              <th>Degree Programme</th>
              <th>Graduation Year</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {#each students as s}
            <tr>
              <td><code>{s.student_uid}</code></td>
              <td>
                <div class="name-cell">
                  <div class="name-avatar">{s.name.split(' ').map(n => n[0]).join('').slice(0,2)}</div>
                  {s.name}
                </div>
              </td>
              <td>{s.degree}</td>
              <td>{s.graduation_year}</td>
              <td>
                <button class="btn-action" onclick={() => generateCertificate(s.id)} disabled={loading}>
                  <i class="fa-solid fa-file-signature"></i> Generate Certificate
                </button>
              </td>
            </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- ADD STUDENT PAGE -->
      {:else if page === 'add-student'}
      <div class="page-title">
        <div>
          <h1>Enrol New Student</h1>
          <p class="page-sub">Add a new student to the academic registry</p>
        </div>
      </div>
      <div class="form-card">
        <div class="form-grid">
          <div class="form-field">
            <label for="sid">Student ID *</label>
            <input id="sid" bind:value={newStudent.student_uid} placeholder="e.g. NUT-2024-006">
          </div>
          <div class="form-field">
            <label for="sname">Full Name *</label>
            <input id="sname" bind:value={newStudent.name} placeholder="e.g. John Doe">
          </div>
          <div class="form-field">
            <label for="sdeg">Degree Programme</label>
            <input id="sdeg" bind:value={newStudent.degree} placeholder="e.g. Bachelor of Computer Science">
          </div>
          <div class="form-field">
            <label for="syear">Graduation Year</label>
            <input id="syear" type="number" bind:value={newStudent.graduation_year} placeholder="2025">
          </div>
        </div>
        <div class="form-actions">
          <button class="btn-primary" onclick={addStudent} disabled={loading}>
            {loading ? 'Enrolling...' : 'Enrol Student'}
          </button>
          <button class="btn-secondary" onclick={() => page = 'students'}>Cancel</button>
        </div>
      </div>

      <!-- CERTIFICATES PAGE -->
      {:else if page === 'certificates'}
      <div class="page-title">
        <div>
          <h1>Certificate Management</h1>
          <p class="page-sub">{certificates.length} total certificates</p>
        </div>
      </div>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Certificate ID</th>
              <th>Student</th>
              <th>Degree</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each certificates as c}
            <tr>
              <td><code>{c.certificate_uid}</code></td>
              <td>{c.student_name}</td>
              <td>{c.degree}</td>
              <td><span class="status-badge status-{c.status}">{c.status}</span></td>
              <td class="action-cell">
                {#if c.status === 'pending'}
                  <button class="btn-approve" onclick={() => approveCert(c.id)} disabled={approving === c.id}>
                    {#if approving === c.id}
                      <i class="fa-solid fa-hourglass-half fa-spin"></i> Registering...
                    {:else}
                      <i class="fa-solid fa-link"></i> Approve & Register
                    {/if}
                  </button>
                  <button class="btn-reject" onclick={() => rejectCert(c.id)} disabled={approving === c.id}>
                    <i class="fa-solid fa-ban"></i> Reject
                  </button>
                {/if}
                {#if c.file_path}
                  <button class="btn-action" onclick={() => downloadCert(c.id)}>
                    <i class="fa-solid fa-download"></i> Download
                  </button>
                {/if}
              </td>
            </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- PLUGINS PAGE -->
      {:else if page === 'plugins'}
      <div class="page-title">
        <div>
          <h1>Installed Plugins</h1>
          <p class="page-sub">3 active integrations connected to Academic Administration Portal</p>
        </div>
        <button class="btn-primary" onclick={() => showAddPlugin = true}>
          <i class="fa-solid fa-plus"></i> Add Plugin
        </button>
      </div>

      <div class="plugin-grid">

        <!-- ── Certificate Generator ───────────────────── -->
        <div class="plugin-card plugin-active">
          <div class="plugin-header">
            <div class="plugin-logo certgen-logo"><i class="fa-solid fa-file-signature"></i></div>
            <div class="plugin-meta">
              <h3>Certificate Generator</h3>
              <span class="plugin-version">v2.4.1</span>
            </div>
            <div class="plugin-status-badge active"><i class="fa-solid fa-circle"></i> Active</div>
          </div>
          <p class="plugin-desc">
            Automated PDF certificate generation engine with dynamic templates, institutional branding, and watermark support. Integrated directly into the certificate approval pipeline.
          </p>
          <div class="plugin-features">
            <div class="plugin-feature"><i class="fa-solid fa-check"></i> Dynamic PDF generation (Puppeteer)</div>
            <div class="plugin-feature"><i class="fa-solid fa-check"></i> Institutional template engine</div>
            <div class="plugin-feature"><i class="fa-solid fa-check"></i> QR code embedding</div>
            <div class="plugin-feature"><i class="fa-solid fa-check"></i> Digital watermarking</div>
          </div>
          <div class="plugin-footer">
            <div class="plugin-info-items">
              <span><i class="fa-solid fa-code-branch"></i> Engine: Chromium PDF · puppeteer@21</span>
              <span><i class="fa-solid fa-folder-open"></i> Templates: /assets/cert-templates/</span>
            </div>
            <div class="plugin-actions">
              <button class="btn-plugin-secondary" onclick={() => showCertGenConfig = true}>
                <i class="fa-solid fa-gear"></i> Configure
              </button>
            </div>
          </div>
        </div>

        <!-- ── Zequen Issuer ───────────────────────────── -->
        <div class="plugin-card plugin-active">
          <div class="plugin-header">
            <div class="plugin-logo zequen-logo"><i class="fa-solid fa-link"></i></div>
            <div class="plugin-meta">
              <h3>Zequen Issuer</h3>
              <span class="plugin-version">v1.0.0</span>
            </div>
            <div class="plugin-status-badge active"><i class="fa-solid fa-circle"></i> Active</div>
          </div>
          <p class="plugin-desc">
            Blockchain-powered credential issuance. Automatically registers approved certificates as immutable SHA-256 records on the Ethereum network upon admin approval.
          </p>
          <div class="plugin-features">
            <div class="plugin-feature"><i class="fa-solid fa-check"></i> On-approval auto-registration</div>
            <div class="plugin-feature"><i class="fa-solid fa-check"></i> SHA-256 canonical hashing</div>
            <div class="plugin-feature"><i class="fa-solid fa-check"></i> Smart contract integration</div>
            <div class="plugin-feature"><i class="fa-solid fa-check"></i> Audit trail & TX logging</div>
          </div>
          <div class="plugin-footer">
            <div class="plugin-info-items">
              <span><i class="fa-solid fa-network-wired"></i> Ganache · localhost:8545</span>
              <span><i class="fa-solid fa-cube"></i> Contract: CertificateRegistry.sol</span>
            </div>
            <div class="plugin-actions">
              <a href="http://localhost:4000/api/health" target="_blank" class="btn-plugin-secondary">
                <i class="fa-solid fa-server"></i> API Status
              </a>
              <button class="btn-plugin-secondary" onclick={() => showIssuerConfig = true}>
                <i class="fa-solid fa-gear"></i> Configure
              </button>
            </div>
          </div>
        </div>

        <!-- ── Zequen VFR ──────────────────────────────── -->
        <div class="plugin-card plugin-active">
          <div class="plugin-logo-row">
            <div class="plugin-header">
              <div class="plugin-logo vfr-logo"><i class="fa-solid fa-shield-halved"></i></div>
              <div class="plugin-meta">
                <h3>Zequen VFR</h3>
                <span class="plugin-version">v1.0.0</span>
              </div>
              <div class="plugin-status-badge active"><i class="fa-solid fa-circle"></i> Active</div>
            </div>
          </div>
          <p class="plugin-desc">
            Public verifier portal adapter. Exposes an employer-facing endpoint where third parties can upload and instantly verify credential authenticity against the immutable blockchain ledger.
          </p>
          <div class="plugin-features">
            <div class="plugin-feature"><i class="fa-solid fa-check"></i> Public no-login verifier portal</div>
            <div class="plugin-feature"><i class="fa-solid fa-check"></i> PDF upload + hash cross-check</div>
            <div class="plugin-feature"><i class="fa-solid fa-check"></i> Blockchain record lookup</div>
            <div class="plugin-feature"><i class="fa-solid fa-check"></i> Employer-ready verification report</div>
          </div>
          <div class="plugin-footer">
            <div class="plugin-info-items">
              <span><i class="fa-solid fa-arrow-up-right-from-square"></i> Hosted: localhost:3004</span>
              <span><i class="fa-solid fa-users"></i> Audience: employers, institutions</span>
            </div>
            <div class="plugin-actions">
              <a href="http://localhost:3004" target="_blank" class="btn-plugin-secondary">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Portal
              </a>
              <button class="btn-plugin-secondary" onclick={() => showVfrConfig = true}>
                <i class="fa-solid fa-gear"></i> Configure
              </button>
            </div>
          </div>
        </div>

      </div>
      {/if}

      <!-- ══ CERT GEN CONFIG MODAL ══════════════════ -->
      {#if showCertGenConfig}
      <div class="modal-overlay" onclick={() => showCertGenConfig = false}>
        <div class="modal" onclick={e => e.stopPropagation()}>
          <div class="modal-header">
            <div class="modal-title"><i class="fa-solid fa-file-signature"></i> Certificate Generator — Settings</div>
            <button class="modal-close" onclick={() => showCertGenConfig = false}><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <div class="modal-section">
              <label class="modal-label">Active Template</label>
              <select class="modal-input">
                <option>NUT Official — Landscape (default)</option>
                <option>NUT Postgraduate — Portrait</option>
                <option>NUT Engineering — Landscape</option>
              </select>
            </div>
            <div class="modal-section">
              <label class="modal-label">Institution Seal</label>
              <div class="mock-file-input"><i class="fa-solid fa-image"></i> nut-seal-2024.png <span class="mock-change">Change</span></div>
            </div>
            <div class="modal-row">
              <div class="modal-section">
                <label class="modal-label">Primary Colour</label>
                <div class="mock-color"><span style="background:#0d1b2a"></span> #0D1B2A — Navy</div>
              </div>
              <div class="modal-section">
                <label class="modal-label">Accent Colour</label>
                <div class="mock-color"><span style="background:#c5a94e"></span> #C5A94E — Gold</div>
              </div>
            </div>
            <div class="modal-section">
              <label class="modal-label">QR Code Destination</label>
              <input class="modal-input" value="http://localhost:3004" readonly>
            </div>
            <div class="modal-toggle-row">
              <span>Embed digital watermark</span>
              <div class="mock-toggle on"></div>
            </div>
            <div class="modal-toggle-row">
              <span>Auto-generate on student enrolment</span>
              <div class="mock-toggle"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-modal-save" onclick={() => showCertGenConfig = false}><i class="fa-solid fa-floppy-disk"></i> Save Settings</button>
            <button class="btn-modal-cancel" onclick={() => showCertGenConfig = false}>Cancel</button>
          </div>
        </div>
      </div>
      {/if}

      <!-- ══ ZEQUEN ISSUER CONFIG MODAL ════════════ -->
      {#if showIssuerConfig}
      <div class="modal-overlay" onclick={() => showIssuerConfig = false}>
        <div class="modal" onclick={e => e.stopPropagation()}>
          <div class="modal-header">
            <div class="modal-title"><i class="fa-solid fa-link"></i> Zequen Issuer — Settings</div>
            <button class="modal-close" onclick={() => showIssuerConfig = false}><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <div class="modal-section">
              <label class="modal-label">Blockchain RPC URL</label>
              <input class="modal-input" value="http://127.0.0.1:8545" readonly>
            </div>
            <div class="modal-section">
              <label class="modal-label">Smart Contract Address</label>
              <input class="modal-input" value="0xCertificateRegistry..." readonly>
            </div>
            <div class="modal-section">
              <label class="modal-label">Issuer Wallet</label>
              <input class="modal-input" value="0xAd558607b6bdd95b76c7DF34F95d8cA80373b081" readonly>
            </div>
            <div class="modal-section">
              <label class="modal-label">Registration Trigger</label>
              <select class="modal-input">
                <option selected>On certificate approval (auto)</option>
                <option>Manual — operator triggered</option>
                <option>Scheduled batch (nightly)</option>
              </select>
            </div>
            <div class="modal-toggle-row">
              <span>Retry failed transactions</span>
              <div class="mock-toggle on"></div>
            </div>
            <div class="modal-toggle-row">
              <span>Emit audit log on every TX</span>
              <div class="mock-toggle on"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-modal-save" onclick={() => showIssuerConfig = false}><i class="fa-solid fa-floppy-disk"></i> Save Settings</button>
            <button class="btn-modal-cancel" onclick={() => showIssuerConfig = false}>Cancel</button>
          </div>
        </div>
      </div>
      {/if}

      <!-- ══ ZEQUEN VFR CONFIG MODAL ════════════════ -->
      {#if showVfrConfig}
      <div class="modal-overlay" onclick={() => showVfrConfig = false}>
        <div class="modal" onclick={e => e.stopPropagation()}>
          <div class="modal-header">
            <div class="modal-title"><i class="fa-solid fa-shield-halved"></i> Zequen VFR — Settings</div>
            <button class="modal-close" onclick={() => showVfrConfig = false}><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <div class="modal-section">
              <label class="modal-label">Verifier Portal URL</label>
              <input class="modal-input" value="http://localhost:3004" readonly>
            </div>
            <div class="modal-section">
              <label class="modal-label">Access Policy</label>
              <select class="modal-input">
                <option selected>Public — no login required</option>
                <option>Token-gated — employer API key</option>
                <option>Institutional only — IP whitelist</option>
              </select>
            </div>
            <div class="modal-section">
              <label class="modal-label">Verification Result Display</label>
              <select class="modal-input">
                <option selected>Full — name, degree, date, issuer</option>
                <option>Minimal — valid/invalid only</option>
              </select>
            </div>
            <div class="modal-toggle-row">
              <span>Show blockchain TX hash to verifiers</span>
              <div class="mock-toggle on"></div>
            </div>
            <div class="modal-toggle-row">
              <span>Allow bulk CSV verification</span>
              <div class="mock-toggle"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-modal-save" onclick={() => showVfrConfig = false}><i class="fa-solid fa-floppy-disk"></i> Save Settings</button>
            <button class="btn-modal-cancel" onclick={() => showVfrConfig = false}>Cancel</button>
          </div>
        </div>
      </div>
      {/if}

      <!-- ══ ADD PLUGIN MARKETPLACE MODAL ══════════ -->
      {#if showAddPlugin}
      <div class="modal-overlay" onclick={() => showAddPlugin = false}>
        <div class="modal modal-wide" onclick={e => e.stopPropagation()}>
          <div class="modal-header">
            <div class="modal-title"><i class="fa-solid fa-store"></i> Plugin Marketplace</div>
            <button class="modal-close" onclick={() => showAddPlugin = false}><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <input class="modal-input" placeholder="Search plugins..." style="margin-bottom:20px">
            <div class="marketplace-grid">
              <div class="marketplace-item">
                <div class="mp-icon" style="background:#f0fdf4;color:#16a34a"><i class="fa-solid fa-graduation-cap"></i></div>
                <div class="mp-body">
                  <div class="mp-name">LMS Connector <span class="mp-badge">Popular</span></div>
                  <div class="mp-desc">Sync student records with Moodle, Canvas, and Blackboard.</div>
                </div>
                <button class="btn-mp-install">Install</button>
              </div>
              <div class="marketplace-item">
                <div class="mp-icon" style="background:#fff7ed;color:#c2410c"><i class="fa-solid fa-id-card"></i></div>
                <div class="mp-body">
                  <div class="mp-name">Student ID System</div>
                  <div class="mp-desc">Auto-generate and manage institutional ID cards.</div>
                </div>
                <button class="btn-mp-install">Install</button>
              </div>
              <div class="marketplace-item">
                <div class="mp-icon" style="background:#faf5ff;color:#7c3aed"><i class="fa-solid fa-money-bill-wave"></i></div>
                <div class="mp-body">
                  <div class="mp-name">Financial Aid Portal</div>
                  <div class="mp-desc">Scholarship and bursary management integration.</div>
                </div>
                <button class="btn-mp-install">Install</button>
              </div>
              <div class="marketplace-item">
                <div class="mp-icon" style="background:#eff6ff;color:#1d4ed8"><i class="fa-solid fa-envelope"></i></div>
                <div class="mp-body">
                  <div class="mp-name">Email Notifications</div>
                  <div class="mp-desc">Automated student and admin email workflows via SMTP.</div>
                </div>
                <button class="btn-mp-install">Install</button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-modal-cancel" onclick={() => showAddPlugin = false}>Close</button>
          </div>
        </div>
      </div>
      {/if}

    </main>
  </div>
</div>
{/if}

<style>
  /* ─── Reset ─── */
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }
  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #f4f6f9;
    color: #1a1f2e;
    font-size: 14px;
  }
  :global(a) { text-decoration: none; }

  /* ─── LOGIN ─── */
  .login-shell {
    display: flex;
    min-height: 100vh;
  }
  .login-left {
    width: 420px;
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
  .univ-seal {
    font-size: 64px;
    color: #c5a94e;
    margin-bottom: 24px;
  }
  .login-left h1 {
    font-size: 26px;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.3px;
    margin-bottom: 8px;
  }
  .univ-tagline {
    font-size: 13px;
    color: #8fa3b8;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 32px;
  }
  .login-decoration {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #4a6278;
    font-size: 12px;
  }
  .deco-line { flex: 1; height: 1px; background: #2a3f52; }
  .login-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f4f6f9;
  }
  .login-form-container {
    width: 420px;
    padding: 48px;
    background: white;
    border: 1px solid #dde3ec;
  }
  .zequen-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    color: #2563eb;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    padding: 4px 10px;
    margin-bottom: 20px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .login-form-header h2 {
    font-size: 22px;
    font-weight: 700;
    color: #0d1b2a;
    margin-bottom: 6px;
  }
  .login-form-header p {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 28px;
  }
  .form-field { margin-bottom: 18px; }
  .form-field label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 6px;
  }
  .form-field input {
    width: 100%;
    padding: 11px 14px;
    border: 1px solid #d1d5db;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s;
    border-radius: 0;
    background: #fafafa;
  }
  .form-field input:focus { border-color: #2563eb; background: white; }
  .btn-signin {
    width: 100%;
    padding: 13px;
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
    border-radius: 0;
    margin-top: 8px;
  }
  .btn-signin:hover { background: #1a2d3f; }
  .login-hint {
    text-align: center;
    font-size: 12px;
    color: #94a3b8;
    margin-top: 16px;
  }
  .login-hint code {
    background: #f1f5f9;
    padding: 2px 6px;
    font-size: 11px;
    border: 1px solid #e2e8f0;
  }

  /* ─── PORTAL SHELL ─── */
  .portal-shell { display: flex; flex-direction: column; min-height: 100vh; }

  /* ─── TOP HEADER ─── */
  .top-header {
    background: #0d1b2a;
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 28px;
    height: 60px;
    border-bottom: 3px solid #c5a94e;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .header-seal { font-size: 28px; color: #c5a94e; }
  .header-university { font-size: 15px; font-weight: 700; letter-spacing: -0.2px; }
  .header-sub { font-size: 11px; color: #7a9bba; }
  .header-right { display: flex; align-items: center; gap: 20px; }
  .header-user { display: flex; align-items: center; gap: 10px; }
  .header-avatar {
    width: 34px; height: 34px;
    background: #1e3a52;
    border: 1px solid #2d4f6e;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 14px; color: #c5a94e;
  }
  .header-username { font-size: 13px; font-weight: 600; }
  .header-role { font-size: 11px; color: #7a9bba; }
  .btn-logout {
    padding: 7px 14px;
    background: transparent;
    border: 1px solid #2d4f6e;
    color: #94a3b8;
    font-size: 12px;
    cursor: pointer;
    display: flex; align-items: center; gap: 6px;
    transition: all 0.15s;
  }
  .btn-logout:hover { background: #1e3a52; color: white; border-color: #3b6283; }

  /* ─── PORTAL BODY ─── */
  .portal-body { display: flex; flex: 1; overflow: hidden; }

  /* ─── SIDEBAR ─── */
  .sidebar {
    width: 230px;
    background: #ffffff;
    border-right: 1px solid #dde3ec;
    flex-shrink: 0;
    overflow-y: auto;
    padding: 24px 0;
  }
  .sidebar-nav { padding: 0 12px; }
  .nav-section-label {
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 14px 10px 6px;
  }
  .sidebar-nav ul { list-style: none; }
  .sidebar-nav ul li button {
    width: 100%;
    text-align: left;
    padding: 9px 12px;
    background: none;
    border: none;
    border-left: 3px solid transparent;
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
    background: #eff6ff;
    color: #1d4ed8;
    border-left-color: #2563eb;
    font-weight: 600;
  }

  /* ─── MAIN CONTENT ─── */
  .main-content { flex: 1; overflow-y: auto; padding: 32px 36px; }

  .page-title {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e2e8f0;
  }
  .page-title h1 { font-size: 24px; font-weight: 700; color: #0d1b2a; }
  .page-sub { font-size: 13px; color: #64748b; margin-top: 2px; }

  /* ─── ALERTS ─── */
  .alert { padding: 12px 16px; font-size: 13px; display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
  .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
  .alert-banner {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px;
    margin-bottom: 20px;
    font-size: 13px;
    border-left: 4px solid;
  }
  .alert-banner.alert-success { background: #f0fdf4; border-color: #16a34a; color: #15803d; }
  .alert-banner.alert-error { background: #fef2f2; border-color: #dc2626; color: #b91c1c; }
  .alert-banner button {
    margin-left: auto;
    background: none; border: none;
    color: inherit; cursor: pointer; font-size: 14px;
  }

  /* ─── STAT CARDS ─── */
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .stat-card {
    background: white;
    border: 1px solid #e2e8f0;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .stat-icon {
    width: 48px; height: 48px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }
  .stat-icon.blue { background: #eff6ff; color: #2563eb; }
  .stat-icon.slate { background: #f8fafc; color: #475569; }
  .stat-icon.amber { background: #fffbeb; color: #d97706; }
  .stat-icon.green { background: #f0fdf4; color: #16a34a; }
  .stat-value { font-size: 28px; font-weight: 700; color: #0d1b2a; line-height: 1; }
  .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }

  .info-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-left: 4px solid #d97706;
    padding: 12px 16px;
    font-size: 13px;
    color: #92400e;
  }
  .link-btn {
    background: none; border: none;
    color: #2563eb; cursor: pointer;
    font-size: 13px; font-weight: 600;
    margin-left: auto; font-family: inherit;
  }

  /* ─── DATA TABLE ─── */
  .data-table-wrap { background: white; border: 1px solid #e2e8f0; overflow: auto; }
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th {
    background: #f8fafc;
    padding: 12px 16px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    border-bottom: 2px solid #e2e8f0;
  }
  .data-table td {
    padding: 13px 16px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 13px;
    color: #1a1f2e;
    vertical-align: middle;
  }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: #fafbfc; }
  code {
    background: #f1f5f9;
    padding: 3px 8px;
    font-size: 12px;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    font-family: 'Courier New', monospace;
  }
  .name-cell { display: flex; align-items: center; gap: 10px; }
  .name-avatar {
    width: 28px; height: 28px;
    background: #0d1b2a;
    color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700;
    flex-shrink: 0;
  }
  .action-cell { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

  /* ─── STATUS BADGES ─── */
  .status-badge {
    display: inline-block;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
    text-transform: capitalize;
    border: 1px solid;
  }
  .status-pending { background: #fffbeb; color: #b45309; border-color: #fde68a; }
  .status-approved { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
  .status-registered { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
  .status-rejected { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }

  /* ─── BUTTONS ─── */
  .btn-primary {
    padding: 9px 18px;
    background: #0d1b2a;
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
  .btn-primary:hover { background: #1a2d3f; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary {
    padding: 9px 18px;
    background: white;
    color: #475569;
    border: 1px solid #d1d5db;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .btn-secondary:hover { background: #f8fafc; }
  .btn-action {
    padding: 6px 12px;
    background: #f8fafc;
    color: #374151;
    border: 1px solid #d1d5db;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: inherit;
    transition: all 0.12s;
  }
  .btn-action:hover { background: #f1f5f9; border-color: #9ca3af; }
  .btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-approve {
    padding: 6px 12px;
    background: #f0fdf4;
    color: #15803d;
    border: 1px solid #bbf7d0;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: inherit;
    transition: all 0.12s;
  }
  .btn-approve:hover { background: #dcfce7; }
  .btn-approve:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-reject {
    padding: 6px 12px;
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fecaca;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: inherit;
    transition: all 0.12s;
  }
  .btn-reject:hover { background: #fee2e2; }
  .btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ─── FORM ─── */
  .form-card {
    background: white;
    border: 1px solid #e2e8f0;
    padding: 32px;
    max-width: 640px;
  }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .form-actions { display: flex; gap: 12px; align-items: center; }

  /* ─── PLUGINS ─── */
  .plugin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }
  .plugin-card {
    background: white;
    border: 1px solid #e2e8f0;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .plugin-card.plugin-active { border-top: 3px solid #2563eb; }
  .plugin-card.plugin-inactive { border-top: 3px solid #e2e8f0; opacity: 0.8; }
  .plugin-header { display: flex; align-items: center; gap: 14px; }
  .plugin-logo {
    width: 52px; height: 52px;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }
  .zequen-logo { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
  .inactive-logo { background: #f8fafc; color: #94a3b8; border: 1px solid #e2e8f0; }
  .plugin-meta { flex: 1; }
  .plugin-meta h3 { font-size: 16px; font-weight: 700; color: #0d1b2a; }
  .plugin-version {
    font-size: 11px; color: #94a3b8;
    background: #f1f5f9;
    padding: 2px 8px;
    border: 1px solid #e2e8f0;
    font-family: monospace;
    margin-top: 4px;
    display: inline-block;
  }
  .plugin-status-badge {
    padding: 4px 12px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .plugin-status-badge.active {
    background: #f0fdf4;
    color: #16a34a;
    border: 1px solid #bbf7d0;
  }
  .plugin-status-badge.inactive {
    background: #f8fafc;
    color: #64748b;
    border: 1px solid #e2e8f0;
  }
  .plugin-status-badge.active i { font-size: 8px; }
  .plugin-desc { font-size: 13px; color: #475569; line-height: 1.6; }
  .plugin-features { display: flex; flex-direction: column; gap: 6px; }
  .plugin-feature {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: #374151;
  }
  .plugin-feature i { color: #16a34a; font-size: 12px; }
  .plugin-footer {
    border-top: 1px solid #f1f5f9;
    padding-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .plugin-info-items { display: flex; flex-direction: column; gap: 4px; }
  .plugin-info-items span {
    font-size: 12px;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .plugin-actions { display: flex; gap: 10px; justify-content: flex-end; }
  .btn-plugin-primary {
    padding: 8px 16px;
    background: #2563eb;
    color: white;
    border: none;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background 0.15s;
  }
  .btn-plugin-primary:hover { background: #1d4ed8; }
  .btn-plugin-secondary {
    padding: 8px 16px;
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s;
  }
  .btn-plugin-secondary:hover { background: #f8fafc; }
  .btn-plugin-disabled {
    padding: 8px 16px;
    background: #f8fafc;
    color: #adb8c7;
    border: 1px solid #e2e8f0;
    font-size: 12px;
    font-weight: 600;
    cursor: not-allowed;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
  }

  /* ─── Additional plugin logo colours ─── */
  .certgen-logo { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
  .vfr-logo { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
  .plugin-logo-row { width: 100%; }

  /* ─── Modal overlay ─── */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 24px;
  }
  .modal {
    background: white;
    border: 1px solid #e2e8f0;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  .modal-wide { max-width: 620px; }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
  }
  .modal-title {
    font-size: 14px;
    font-weight: 700;
    color: #0d1b2a;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .modal-close {
    background: none;
    border: none;
    font-size: 16px;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px;
    transition: color 0.12s;
  }
  .modal-close:hover { color: #0d1b2a; }
  .modal-body { padding: 24px 20px; display: flex; flex-direction: column; gap: 0; }
  .modal-section { margin-bottom: 16px; }
  .modal-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .modal-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .modal-input {
    width: 100%;
    padding: 9px 12px;
    border: 1px solid #d1d5db;
    font-size: 13px;
    outline: none;
    font-family: inherit;
    transition: border-color 0.15s;
    background: #fafafa;
  }
  .modal-input:focus { border-color: #2563eb; background: white; }
  .mock-file-input {
    padding: 9px 12px;
    border: 1px solid #d1d5db;
    font-size: 13px;
    color: #374151;
    background: #f8fafc;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .mock-change {
    margin-left: auto;
    color: #2563eb;
    font-size: 12px;
    cursor: pointer;
    font-weight: 600;
  }
  .mock-color {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border: 1px solid #d1d5db;
    font-size: 13px;
    background: #f8fafc;
  }
  .mock-color span {
    width: 18px; height: 18px;
    display: inline-block;
    border: 1px solid rgba(0,0,0,0.1);
  }
  .modal-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #f1f5f9;
    font-size: 13px;
    color: #374151;
  }
  .mock-toggle {
    width: 38px; height: 20px;
    background: #d1d5db;
    border-radius: 10px;
    position: relative;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.2s;
  }
  .mock-toggle.on { background: #16a34a; }
  .mock-toggle::after {
    content: '';
    position: absolute;
    width: 16px; height: 16px;
    background: white;
    border-radius: 50%;
    top: 2px; left: 2px;
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  .mock-toggle.on::after { left: 20px; }
  .modal-footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding: 16px 20px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
  }
  .btn-modal-save {
    padding: 9px 18px;
    background: #0d1b2a;
    color: white;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: inherit;
    transition: background 0.15s;
  }
  .btn-modal-save:hover { background: #1a2d3f; }
  .btn-modal-cancel {
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
  .btn-modal-cancel:hover { background: #f8fafc; }

  /* ─── Marketplace grid ─── */
  .marketplace-grid { display: flex; flex-direction: column; gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0; }
  .marketplace-item {
    display: flex;
    align-items: center;
    gap: 14px;
    background: white;
    padding: 14px 16px;
  }
  .mp-icon {
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
    border: 1px solid rgba(0,0,0,0.05);
  }
  .mp-body { flex: 1; }
  .mp-name { font-size: 13px; font-weight: 600; color: #0d1b2a; display: flex; align-items: center; gap: 8px; }
  .mp-desc { font-size: 12px; color: #94a3b8; margin-top: 2px; }
  .mp-badge {
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
    font-size: 10px;
    padding: 1px 7px;
    font-weight: 700;
  }
  .btn-mp-install {
    padding: 6px 14px;
    background: #0d1b2a;
    color: white;
    border: none;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: background 0.15s;
  }
  .btn-mp-install:hover { background: #1a2d3f; }
</style>
