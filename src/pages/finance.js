import { api } from '../api.js';
import { openModal, closeModal, toast, fmtDate, fmtCurrency, loadingHTML, emptyState, icons } from '../utils.js';

export async function renderFinance(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Finances</h1>
        <p>Suivi des revenus, coûts et profits</p>
      </div>
      <button class="btn btn-primary" id="btnAddTx">
        ${icons.plus} Ajouter transaction
      </button>
    </div>
    <div id="financeSummary">${loadingHTML()}</div>
    <div class="card" style="margin-top:0">
      <div class="card-header">
        <span class="card-title">Transactions</span>
        <div class="search-bar">
          <select class="form-control" id="filterTxType" style="width:auto;padding:9px 12px">
            <option value="">Tous types</option>
            <option value="income">Revenus</option>
            <option value="expense">Dépenses</option>
          </select>
        </div>
      </div>
      <div id="txTableWrap">${loadingHTML()}</div>
    </div>
  `;

  document.getElementById('btnAddTx').addEventListener('click', () => showTxForm(null, container));
  document.getElementById('filterTxType').addEventListener('change', () => loadTransactions(container));

  await loadTransactions(container);
}

async function loadTransactions(container) {
  const wrap = document.getElementById('txTableWrap');
  const summaryWrap = document.getElementById('financeSummary');
  if (!wrap) return;
  const type = document.getElementById('filterTxType')?.value || '';
  wrap.innerHTML = loadingHTML();

  const { data, error } = await api.getTransactions(type);
  if (error) {
    wrap.innerHTML = `<p style="padding:20px;color:red">Erreur: ${error.message}</p>`;
    return;
  }

  const allTx = data || [];
  const income = allTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = allTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const profit = income - expense;

  if (summaryWrap) {
    summaryWrap.innerHTML = `
      <div class="finance-summary" style="margin-bottom:24px">
        <div class="stat-card">
          <div class="stat-icon green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div class="stat-info">
            <div class="label">Total Revenus</div>
            <div class="value" style="font-size:1.3rem">${fmtCurrency(income)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
          </div>
          <div class="stat-info">
            <div class="label">Total Coûts</div>
            <div class="value" style="font-size:1.3rem">${fmtCurrency(expense)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon ${profit >= 0 ? 'green' : 'red'}">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="stat-info">
            <div class="label">Profit Net</div>
            <div class="value" style="font-size:1.3rem;color:${profit >= 0 ? 'var(--success-600)' : 'var(--error-500)'}">${fmtCurrency(profit)}</div>
          </div>
        </div>
      </div>
    `;
  }

  if (!allTx.length) {
    wrap.innerHTML = emptyState('Aucune transaction enregistrée');
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Montant</th>
            <th>Description</th>
            <th>Réparation liée</th>
            <th>Date</th>
            <th style="width:80px">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${allTx.map(t => `
            <tr>
              <td><span class="badge badge-${t.type}">${t.type === 'income' ? 'Revenu' : 'Dépense'}</span></td>
              <td style="font-weight:600;color:${t.type === 'income' ? 'var(--success-600)' : 'var(--error-500)'}">
                ${t.type === 'income' ? '+' : '-'}${fmtCurrency(t.amount)}
              </td>
              <td>${t.description || '—'}</td>
              <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.repair_description || '—'}</td>
              <td>${fmtDate(t.created_at)}</td>
              <td>
                <div class="actions-cell">
                  <button class="btn-icon danger" title="Supprimer" data-delete="${t.id}">${icons.trash}</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  wrap.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteTx(Number(btn.dataset.delete), container));
  });
}

async function showTxForm(tx, container) {
  const { data: repairs, error } = await api.getRepairsOptions();
  if (error) { toast(error.message, 'error'); return; }

  openModal(
    'Nouvelle transaction',
    `<form id="txForm">
      <div class="form-group">
        <label class="form-label">Type *</label>
        <select class="form-control" name="type" required>
          <option value="income">Revenu</option>
          <option value="expense">Dépense</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Montant (DH) *</label>
        <input class="form-control" type="number" name="amount" min="0" step="0.01" required value="${tx?.amount || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input class="form-control" name="description" value="${tx?.description || ''}" placeholder="Ex: Achat pièces, paiement client…" />
      </div>
      <div class="form-group">
        <label class="form-label">Réparation liée (optionnel)</label>
        <select class="form-control" name="repair_id">
          <option value="">— Aucune —</option>
          ${(repairs || []).map(r => `<option value="${r.id}" ${tx?.repair_id === r.id ? 'selected' : ''}>${r.description.substring(0,60)}</option>`).join('')}
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancelTxForm">Annuler</button>
        <button type="submit" class="btn btn-primary">Enregistrer</button>
      </div>
    </form>`,
    async (e) => {
      const fd = new FormData(e.target);
      const repairId = fd.get('repair_id');
      const payload = {
        type: fd.get('type'),
        amount: parseFloat(fd.get('amount')),
        description: fd.get('description'),
        repair_id: repairId || null,
      };
      const { error } = await api.createTransaction(payload);
      if (error) { toast(error.message, 'error'); return; }
      toast('Transaction enregistrée');
      closeModal();
      loadTransactions(container);
    }
  );
  document.getElementById('cancelTxForm')?.addEventListener('click', closeModal);
}

async function deleteTx(id, container) {
  if (!confirm('Supprimer cette transaction ?')) return;
  const { error } = await api.deleteTransaction(id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Transaction supprimée');
  loadTransactions(container);
}
