/* ===== Toast notifications ===== */
export function toast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'i';
  el.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ===== Modal ===== */
let _modalSubmitHandler = null;

export function openModal(title, bodyHTML, onSubmit) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').classList.add('open');

  if (_modalSubmitHandler) {
    document.getElementById('modalBody').removeEventListener('submit', _modalSubmitHandler);
  }
  _modalSubmitHandler = async (e) => {
    e.preventDefault();
    await onSubmit(e);
  };
  document.getElementById('modalBody').addEventListener('submit', _modalSubmitHandler);
}

export function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

/* ===== Format currency ===== */
export function fmtCurrency(val) {
  return Number(val || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DH';
}

/* ===== Format date ===== */
export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ===== Status label ===== */
export function statusBadge(status) {
  const labels = { pending: 'En attente', in_progress: 'En cours', done: 'Terminé' };
  return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}

/* ===== Loading HTML ===== */
export function loadingHTML() {
  return `<div class="loading-center"><div class="spinner"></div></div>`;
}

/* ===== Empty state ===== */
export function emptyState(message = 'Aucune donnée') {
  return `<div class="empty-state">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    <p>${message}</p>
  </div>`;
}

/* ===== Icon SVG helpers ===== */
export const icons = {
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  download: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
};
