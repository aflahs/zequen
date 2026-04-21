<script>
  const API = 'http://localhost:4000/api';

  let studentId = $state('');
  let result = $state(null);
  let loading = $state(false);

  async function lookup() {
    const id = studentId.trim();
    if (!id) return;
    loading = true;
    result = null;

    try {
      const res = await fetch(`${API}/students/lookup?uid=${encodeURIComponent(id)}`);
      const data = await res.json();

      if (!res.ok) {
        result = { found: false, error: data.error || 'Student not found.' };
      } else if (data.certificates.length === 0) {
        result = { found: true, student: data.student, certs: [], error: 'No registered certificates found for this student yet.' };
      } else {
        result = { found: true, student: data.student, certs: data.certificates };
      }
    } catch (e) {
      result = { found: false, error: 'Could not connect to the server. Please try again.' };
    } finally {
      loading = false;
    }
  }

  function quickFill(id) {
    studentId = id;
    lookup();
  }

  function download(certId) {
    window.open(`${API}/certificates/${certId}/download`, '_blank');
  }

  function reset() {
    studentId = '';
    result = null;
  }
</script>

<div class="shell">

  <!-- Header -->
  <header class="header">
    <div class="header-brand">
      <i class="fa-solid fa-landmark-dome"></i>
      <span>Certificate Retrieval Portal</span>
    </div>
    <div class="header-powered">
      <i class="fa-solid fa-link"></i> Secured by Zequen Blockchain
    </div>
  </header>

  <main class="main">

    <!-- Lookup Panel -->
    <div class="card lookup-card">
      <div class="card-icon">
        <i class="fa-solid fa-id-card"></i>
      </div>
      <h1>Retrieve Your Certificate</h1>
      <p class="sub">Enter your Student ID to find and download your blockchain-verified academic certificate.</p>

      <div class="input-row">
        <input
          type="text"
          bind:value={studentId}
          placeholder="e.g. NUT-2024-001"
          onkeydown={e => e.key === 'Enter' && lookup()}
          disabled={loading}
        />
        <button class="btn-lookup" onclick={lookup} disabled={loading || !studentId.trim()}>
          {#if loading}
            <i class="fa-solid fa-circle-notch fa-spin"></i>
          {:else}
            <i class="fa-solid fa-magnifying-glass"></i>
          {/if}
        </button>
      </div>

      <p class="example-hint">Try: <button class="hint-btn" onclick={() => quickFill('NUT-2024-001')}>NUT-2024-001</button>, <button class="hint-btn" onclick={() => quickFill('NUT-2024-002')}>NUT-2024-002</button></p>
    </div>

    <!-- Results -->
    {#if result}
      {#if !result.found || (result.found && result.error && result.certs?.length === 0)}
        <!-- Error / Not Found -->
        <div class="card result-card error-card">
          <i class="fa-solid fa-circle-exclamation icon-lg red"></i>
          <p>{result.error}</p>
          <button class="btn-text" onclick={reset}>← Try another ID</button>
        </div>

      {:else if result.found && result.certs?.length > 0}
        <!-- Student Info -->
        <div class="card result-card">
          <div class="student-info">
            <div class="student-avatar">{result.student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
            <div>
              <div class="student-name">{result.student.name}</div>
              <div class="student-meta">{result.student.student_uid} &nbsp;·&nbsp; {result.student.institution}</div>
            </div>
          </div>

          <div class="divider"></div>

          {#each result.certs as cert}
          <div class="cert-row">
            <div class="cert-info">
              <div class="cert-title">{cert.degree}</div>
              <div class="cert-meta">
                <code>{cert.certificate_uid}</code>
                <span class="chain-badge"><i class="fa-solid fa-link"></i> On Blockchain</span>
              </div>
            </div>
            <button class="btn-download" onclick={() => download(cert.id)}>
              <i class="fa-solid fa-download"></i> Download PDF
            </button>
          </div>
          {/each}

          <button class="btn-text" onclick={reset}>← Look up another student</button>
        </div>
      {/if}
    {/if}

  </main>

  <footer class="footer">
    Certificates on this portal are cryptographically verified on the Ethereum blockchain via Zequen.
  </footer>

</div>

<style>
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }
  :global(body) {
    font-family: 'Inter', -apple-system, sans-serif;
    background: #f7f8fa;
    color: #1a1f2e;
    min-height: 100vh;
  }

  .shell { display: flex; flex-direction: column; min-height: 100vh; }

  /* HEADER */
  .header {
    background: #0d1b2a;
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    height: 52px;
    border-bottom: 2px solid #c5a94e;
  }
  .header-brand {
    display: flex; align-items: center; gap: 10px;
    font-size: 14px; font-weight: 600;
    color: #f0f4f8;
  }
  .header-brand i { color: #c5a94e; font-size: 18px; }
  .header-powered {
    font-size: 11px; color: #6b8aaa;
    display: flex; align-items: center; gap: 6px;
  }
  .header-powered i { color: #2563eb; }

  /* MAIN */
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 20px 40px;
    gap: 20px;
  }

  /* CARDS */
  .card {
    background: white;
    border: 1px solid #e2e8f0;
    padding: 40px 44px;
    width: 100%;
    max-width: 520px;
  }

  /* LOOKUP CARD */
  .lookup-card {
    text-align: center;
    border-top: 3px solid #0d1b2a;
  }
  .card-icon {
    width: 56px; height: 56px;
    background: #f4f6f9;
    border: 1px solid #e2e8f0;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; color: #475569;
    margin: 0 auto 20px;
  }
  .lookup-card h1 {
    font-size: 20px;
    font-weight: 700;
    color: #0d1b2a;
    margin-bottom: 8px;
  }
  .sub {
    font-size: 13px;
    color: #64748b;
    line-height: 1.6;
    margin-bottom: 28px;
  }

  .input-row {
    display: flex;
    gap: 0;
  }
  .input-row input {
    flex: 1;
    padding: 12px 16px;
    border: 1px solid #d1d5db;
    border-right: none;
    font-size: 14px;
    outline: none;
    font-family: inherit;
    background: #fafafa;
    transition: border-color 0.15s;
  }
  .input-row input:focus {
    border-color: #2563eb;
    background: white;
  }
  .btn-lookup {
    padding: 12px 20px;
    background: #0d1b2a;
    color: white;
    border: 1px solid #0d1b2a;
    font-size: 16px;
    cursor: pointer;
    transition: background 0.15s;
    display: flex; align-items: center;
  }
  .btn-lookup:hover { background: #1a2d3f; }
  .btn-lookup:disabled { opacity: 0.4; cursor: not-allowed; }

  .example-hint {
    margin-top: 14px;
    font-size: 12px;
    color: #94a3b8;
  }
  .example-hint span {
    color: #2563eb;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .example-hint span:hover { color: #1d4ed8; }

  /* RESULT CARD */
  .result-card {
    border-top: 3px solid #2563eb;
    padding: 28px 36px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .error-card {
    border-top-color: #dc2626;
    text-align: center;
    align-items: center;
    color: #b91c1c;
  }
  .icon-lg { font-size: 32px; }
  .red { color: #dc2626; }

  .student-info {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .student-avatar {
    width: 44px; height: 44px;
    background: #0d1b2a;
    color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700;
    flex-shrink: 0;
    letter-spacing: 0.5px;
  }
  .student-name { font-size: 15px; font-weight: 700; color: #0d1b2a; }
  .student-meta { font-size: 12px; color: #64748b; margin-top: 2px; }

  .divider { height: 1px; background: #f1f5f9; }

  .cert-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 4px 0;
  }
  .cert-title { font-size: 14px; font-weight: 600; color: #1a1f2e; margin-bottom: 6px; }
  .cert-meta { display: flex; align-items: center; gap: 10px; }
  code {
    background: #f1f5f9;
    padding: 2px 8px;
    font-size: 11px;
    border: 1px solid #e2e8f0;
    font-family: monospace;
    color: #475569;
  }
  .chain-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    color: #1d4ed8;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    padding: 2px 8px;
  }
  .chain-badge i { font-size: 9px; }

  .btn-download {
    padding: 8px 16px;
    background: #0d1b2a;
    color: white;
    border: none;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: flex; align-items: center; gap: 6px;
    white-space: nowrap;
    transition: background 0.15s;
    font-family: inherit;
  }
  .btn-download:hover { background: #1a2d3f; }

  .btn-text {
    background: none; border: none;
    color: #64748b; font-size: 12px;
    cursor: pointer; font-family: inherit;
    text-align: left; padding: 0;
    margin-top: 4px;
  }
  .btn-text:hover { color: #2563eb; }

  /* FOOTER */
  .footer {
    text-align: center;
    padding: 20px;
    font-size: 12px;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    background: white;
  }
  .footer a { color: #2563eb; }
  .footer a:hover { text-decoration: underline; }
</style>
