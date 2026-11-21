// ═══════════════════════════════════════════════════
// Page Watcher — Client Dashboard Application
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════
let targets   = [];
let checkingSet = new Set();
let currentSection = 'targets';

// ═══════════════════════════════════════════════════
// SECTION NAVIGATION
// ═══════════════════════════════════════════════════
function showSection(name) {
  document.getElementById('section-targets').style.display  = name === 'targets'  ? 'block' : 'none';
  document.getElementById('section-activity').style.display = name === 'activity' ? 'block' : 'none';
  currentSection = name;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  event.currentTarget.classList.add('active');
  if (name === 'activity') loadActivity();
}

// ═══════════════════════════════════════════════════
// LOAD TARGETS
// ═══════════════════════════════════════════════════
async function loadTargets() {
  try {
    const res  = await fetch('/api/targets');
    const json = await res.json();
    targets = json.data || [];
    renderTargets();
    updateStats();
  } catch (err) {
    toast('Failed to connect to server', 'error');
  }
}

function updateStats() {
  const total   = targets.length;
  const changed = targets.filter(t => t.snapshot && t.isChecking === false && checkHasChanges(t)).length;
  const errors  = targets.filter(t => t.snapshot && !t.snapshot.success).length;
  const stable  = targets.filter(t => t.snapshot && t.snapshot.success && !checkHasChanges(t)).length;

  document.getElementById('stat-total').textContent   = total;
  document.getElementById('stat-changes').textContent = changed;
  document.getElementById('stat-stable').textContent  = stable;
  document.getElementById('stat-errors').textContent  = errors;
  document.getElementById('nav-count').textContent    = total;
  document.getElementById('targets-count').textContent = `${total} target${total !== 1 ? 's' : ''}`;
}

function checkHasChanges(t) {
  return false;
}

// ═══════════════════════════════════════════════════
// RENDER TARGETS
// ═══════════════════════════════════════════════════
function renderTargets() {
  const grid = document.getElementById('targets-grid');
  if (!targets.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔭</div>
        <div class="empty-title">No targets yet</div>
        <div class="empty-sub">Add your first page to start monitoring. You'll be notified whenever something changes.</div>
        <button class="btn btn-primary" onclick="openModal()">➕ Add First Target</button>
      </div>`;
    return;
  }
  grid.innerHTML = targets.map(renderCard).join('');
}

function renderCard(t) {
  const snap     = t.snapshot;
  const checking = checkingSet.has(t.id) || t.isChecking;

  let statusBadge = '';
  let cardClass   = '';
  if (checking) {
    statusBadge = `<div class="badge checking"><div class="spinner"></div> Checking...</div>`;
    cardClass   = 'is-checking';
  } else if (!snap) {
    statusBadge = `<div class="badge pending">⏳ Not checked yet</div>`;
  } else if (!snap.success) {
    statusBadge = `<div class="badge error"><div class="badge-dot" style="background:var(--danger)"></div>Error</div>`;
    cardClass   = 'has-error';
  } else {
    statusBadge = `<div class="badge stable"><div class="badge-dot" style="background:var(--success)"></div>Stable</div>`;
  }

  // Fields preview
  let fieldsHtml = '';
  if (snap && snap.fields && snap.fields.length) {
    fieldsHtml = `<div class="fields-grid">` +
      snap.fields.slice(0, 4).map(f => `
        <div class="field-item">
          <div class="field-label">${esc(f.name)}</div>
          <div class="field-value ${f.cleanValue ? '' : 'null-val'}" title="${esc(f.cleanValue || '')}">
            ${esc(f.cleanValue || '(not found)')}
          </div>
        </div>`).join('') +
      `</div>`;
  } else if (!snap) {
    fieldsHtml = `<div style="text-align:center;padding:20px 0;color:var(--text3);font-size:13px">Run a check to extract data</div>`;
  }

  // Timestamp
  const timeStr = snap
    ? `<div class="last-checked">Last checked <time>${formatTime(snap.timestamp)}</time></div>`
    : '';

  const urlDisplay = t.url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return `
    <div class="target-card ${cardClass}" id="card-${t.id}">
      <div class="card-header">
        <div class="card-title-group">
          <div class="card-name" title="${esc(t.name)}">${esc(t.name)}</div>
          <div class="card-url"><a href="${esc(t.url)}" target="_blank" rel="noopener" title="${esc(t.url)}">🔗 ${esc(urlDisplay)}</a></div>
        </div>
        ${statusBadge}
      </div>
      ${fieldsHtml}
      ${timeStr}
      <div class="card-actions">
        <button class="btn btn-ghost btn-sm" onclick="checkTarget('${t.id}')" ${checking ? 'disabled' : ''}>
          ${checking ? '<div class="spinner"></div> Checking...' : '🔍 Check Now'}
        </button>
        <button class="btn btn-danger-soft btn-sm" onclick="deleteTarget('${t.id}', '${esc(t.name)}')">🗑 Delete</button>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════
// CHECK TARGET
// ═══════════════════════════════════════════════════
async function checkTarget(id) {
  if (checkingSet.has(id)) return;
  checkingSet.add(id);
  renderTargets();

  try {
    const res  = await fetch(`/api/targets/${id}/check`, { method: 'POST' });
    const json = await res.json();
    checkingSet.delete(id);

    if (!json.success) {
      toast(`Check failed: ${json.error}`, 'error');
      await loadTargets();
      return;
    }

    const report = json.data.report;
    await loadTargets();

    if (!report.success) {
      toast(`❌ ${report.targetName}: ${report.error}`, 'error');
    } else if (report.diff?.hasChanges) {
      const count = report.diff.changes.filter(c => c.changeType !== 'unchanged').length;
      toast(`⚡ ${report.targetName}: ${count} change${count > 1 ? 's' : ''} detected!`, 'info');
      showChangesOnCard(id, report.diff.changes);
    } else {
      toast(`✔ ${report.targetName}: No changes — stable`, 'success');
    }
  } catch (err) {
    checkingSet.delete(id);
    toast('Network error while checking', 'error');
    await loadTargets();
  }
}

function showChangesOnCard(targetId, changes) {
  const card = document.getElementById(`card-${targetId}`);
  if (!card) return;
  const relevant = changes.filter(c => c.changeType !== 'unchanged');
  if (!relevant.length) return;

  const existing = card.querySelector('.diff-section');
  if (existing) existing.remove();

  const html = `
    <div class="diff-section">
      <div class="diff-title">⚡ Changes Detected</div>
      ${relevant.map(c => `
        <div class="diff-item ${c.changeType}">
          <div class="diff-name">${esc(c.name)}</div>
          ${c.changeType === 'modified'
            ? `<span class="diff-old">${esc(c.oldValue ?? 'null')}</span>
               <span class="diff-arrow">→</span>
               <span class="diff-new">${esc(c.newValue ?? 'null')}</span>`
            : c.changeType === 'added'
            ? `<span class="diff-new">+ ${esc(c.newValue ?? 'null')}</span>`
            : `<span class="diff-old">- ${esc(c.oldValue ?? 'null')}</span>`
          }
        </div>`).join('')}
    </div>`;

  const actions = card.querySelector('.card-actions');
  actions.insertAdjacentHTML('beforebegin', html);
}

// ═══════════════════════════════════════════════════
// CHECK ALL
// ═══════════════════════════════════════════════════
async function checkAll() {
  if (!targets.length) { toast('No targets to check', 'info'); return; }
  const btn = document.getElementById('check-all-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="nav-icon"><div class="spinner" style="width:14px;height:14px;border-width:2px"></div></span> Checking...';
  targets.forEach(t => checkingSet.add(t.id));
  renderTargets();

  try {
    const res  = await fetch('/api/check-all', { method: 'POST' });
    const json = await res.json();
    checkingSet.clear();
    await loadTargets();

    if (!json.success) { toast('Check all failed: ' + json.error, 'error'); return; }
    const changed = json.data.filter(r => r.diff?.hasChanges).length;
    const failed  = json.data.filter(r => !r.success).length;

    if (changed > 0)
      toast(`⚡ ${changed} change${changed > 1 ? 's' : ''} detected across all targets`, 'info');
    else if (failed > 0)
      toast(`${failed} target${failed > 1 ? 's' : ''} failed — ${json.data.length - failed} stable`, 'error');
    else
      toast(`✔ All ${json.data.length} targets are stable`, 'success');

    json.data.forEach(r => { if (r.diff?.hasChanges) showChangesOnCard(r.targetId, r.diff.changes); });
  } catch (err) {
    checkingSet.clear();
    toast('Network error', 'error');
    await loadTargets();
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="nav-icon">🔄</span> Check All Now';
  }
}

// ═══════════════════════════════════════════════════
// DELETE TARGET
// ═══════════════════════════════════════════════════
async function deleteTarget(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    const res  = await fetch(`/api/targets/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      toast(`🗑 "${name}" removed`, 'success');
      await loadTargets();
    } else {
      toast('Delete failed: ' + json.error, 'error');
    }
  } catch { toast('Network error', 'error'); }
}

// ═══════════════════════════════════════════════════
// LOAD ACTIVITY
// ═══════════════════════════════════════════════════
async function loadActivity() {
  const list = document.getElementById('activity-list');
  list.innerHTML = '<p style="color:var(--text3);text-align:center;padding:40px">Loading...</p>';
  try {
    const res  = await fetch('/api/history?limit=50');
    const json = await res.json();
    const entries = json.data || [];

    if (!entries.length) {
      list.innerHTML = `
        <div style="text-align:center;padding:60px;color:var(--text3)">
          <div style="font-size:40px;margin-bottom:16px">📭</div>
          <div style="font-size:15px;font-weight:600;color:var(--text2)">No activity yet</div>
          <div style="font-size:13px;margin-top:6px">Run your first check to see results here</div>
        </div>`;
      return;
    }

    list.innerHTML = entries.map(e => {
      let icon, detail;
      if (!e.success) {
        icon = '❌'; detail = `<span style="color:var(--danger)">Error: ${esc(e.error || 'unknown')}</span>`;
      } else if (e.hasChanges) {
        icon = '⚡';
        const pts = e.changes.slice(0, 2).map(c =>
          `${esc(c.name)}: <span style="color:var(--danger)">${esc(c.oldValue ?? '—')}</span> → <span style="color:var(--success)">${esc(c.newValue ?? '—')}</span>`).join(' · ');
        detail = `<span style="color:var(--warning)">${e.changesCount} change${e.changesCount > 1 ? 's' : ''}</span> · ${pts}`;
      } else {
        icon = '✅'; detail = '<span style="color:var(--success)">No changes — stable</span>';
      }
      return `
        <div class="activity-item">
          <div class="activity-icon">${icon}</div>
          <div class="activity-body">
            <div class="activity-name">${esc(e.targetName)}</div>
            <div class="activity-detail">${detail}</div>
          </div>
          <div class="activity-time">${formatTime(e.timestamp)}</div>
        </div>`;
    }).join('');
  } catch { list.innerHTML = '<p style="color:var(--danger);text-align:center;padding:40px">Failed to load activity</p>'; }
}

// ═══════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════
function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('fields-container').innerHTML = '';
  document.getElementById('f-name').value = '';
  document.getElementById('f-id').value   = '';
  document.getElementById('f-url').value  = '';
  addFieldRow();
  setTimeout(() => document.getElementById('f-name').focus(), 100);
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}
function closeModalOnBg(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

// Auto-generate ID from name
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('f-name').addEventListener('input', e => {
    const idField = document.getElementById('f-id');
    if (!idField._touched) {
      idField.value = e.target.value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
  });
  document.getElementById('f-id').addEventListener('input', () => {
    document.getElementById('f-id')._touched = true;
  });
});

function addFieldRow(name = '', selector = '', type = 'text') {
  const container = document.getElementById('fields-container');
  const row = document.createElement('div');
  row.className = 'field-row';
  row.innerHTML = `
    <input type="text" placeholder='e.g. "price"' value="${esc(name)}" />
    <input type="text" placeholder="p.price_color" value="${esc(selector)}" />
    <select>
      <option value="text"     ${type==='text'      ? 'selected':''}>text</option>
      <option value="href"     ${type==='href'      ? 'selected':''}>href</option>
      <option value="src"      ${type==='src'       ? 'selected':''}>src</option>
      <option value="innerHTML"${type==='innerHTML' ? 'selected':''}>innerHTML</option>
      <option value="count"    ${type==='count'     ? 'selected':''}>count</option>
    </select>
    <button class="remove-field-btn" onclick="this.parentElement.remove()" title="Remove field">✕</button>`;
  container.appendChild(row);
}

async function submitTarget() {
  const name      = document.getElementById('f-name').value.trim();
  const id        = document.getElementById('f-id').value.trim();
  const url       = document.getElementById('f-url').value.trim();
  const condition = document.getElementById('f-condition').value;

  if (!name || !id || !url) { toast('Please fill in Name, ID, and URL', 'error'); return; }
  try { new URL(url); } catch { toast('Please enter a valid URL (starting with https://)', 'error'); return; }

  const rows   = document.querySelectorAll('#fields-container .field-row');
  const fields = [];
  for (const row of rows) {
    const inputs  = row.querySelectorAll('input, select');
    const fname   = inputs[0].value.trim();
    const fsel    = inputs[1].value.trim();
    const ftype   = inputs[2].value;
    if (fname && fsel) fields.push({ name: fname, selector: fsel, type: ftype });
  }
  if (!fields.length) { toast('Add at least one field to extract', 'error'); return; }

  const submitBtn = document.querySelector('.modal-footer .btn-primary');
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Adding...';

  try {
    const res  = await fetch('/api/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, url, fields, alertCondition: condition }),
    });
    const json = await res.json();
    if (json.success) {
      closeModal();
      toast(`🎯 "${name}" added successfully!`, 'success');
      await loadTargets();
    } else {
      toast('Error: ' + json.error, 'error');
    }
  } catch { toast('Network error', 'error'); }
  finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '🚀 Add Target';
  }
}

// ═══════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════
function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: '💡' };
  const el    = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="toast-icon">${icons[type]}</div><div class="toast-text">${esc(msg)}</div>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTime(iso) {
  if (!iso) return '—';
  const d   = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return d.toLocaleDateString();
}

// ═══════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'n' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openModal(); }
});

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
loadTargets();
setInterval(() => { if (currentSection === 'targets') loadTargets(); }, 30000);
