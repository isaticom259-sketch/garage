import { api } from '../api.js';
import { openModal, closeModal, toast, fmtDate, fmtCurrency, loadingHTML, emptyState, icons } from '../utils.js';

const LOW_STOCK = 5;

export async function renderParts(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Stock de Pièces</h1>
        <p>Inventaire et gestion du stock</p>
      </div>
      <button class="btn btn-primary" id="btnAddPart">
        ${icons.plus} Ajouter pièce
      </button>
    </div>
    <div id="lowStockWrap"></div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Inventaire</span>
        <div class="search-bar">
          <div class="search-input-wrap">
            ${icons.search}
            <input class="search-input" id="searchPart" placeholder="Nom, emplacement…" />
          </div>
        </div>
      </div>
      <div id="partsTableWrap">${loadingHTML()}</div>
    </div>
  `;

  document.getElementById('btnAddPart').addEventListener('click', () => showPartForm(null, container));
  document.getElementById('searchPart').addEventListener('input', e => loadParts(container, e.target.value));

  await loadParts(container, '');
}

async function loadParts(container, search = '') {
  const wrap = document.getElementById('partsTableWrap');
  const lowWrap = document.getElementById('lowStockWrap');
  if (!wrap) return;
  wrap.innerHTML = loadingHTML();

  const { data, error } = await api.getParts(search);
  if (error) {
    wrap.innerHTML = `<p style="padding:20px;color:red">Erreur: ${error.message}</p>`;
    return;
  }

  const lowStock = (data || []).filter(p => p.quantity <= LOW_STOCK);
  if (lowWrap) {
    lowWrap.innerHTML = lowStock.length
      ? `<div class="low-stock-alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span><strong>${lowStock.length} pièce(s)</strong> en stock faible (≤ ${LOW_STOCK}) : ${lowStock.map(p => p.part_name).join(', ')}</span>
        </div>`
      : '';
  }

  if (!data?.length) {
    wrap.innerHTML = emptyState('Aucune pièce en stock');
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Nom de la pièce</th>
            <th>Quantité</th>
            <th>Prix unitaire</th>
            <th>Emplacement</th>
            <th>Créé le</th>
            <th>Statut</th>
            <th style="width:100px">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(p => `
            <tr>
              <td><strong>${p.part_name}</strong></td>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-weight:600">${p.quantity}</span>
                  <button class="btn-icon" style="padding:3px 7px;font-size:.78rem;border:1px solid var(--neutral-200);border-radius:4px" title="Ajuster stock" data-adjust="${p.id}" data-qty="${p.quantity}">±</button>
                </div>
              </td>
              <td>${fmtCurrency(p.unit_price)}</td>
              <td>${p.location || '—'}</td>
              <td>${fmtDate(p.created_at)}</td>
              <td><span class="badge ${p.quantity <= LOW_STOCK ? 'badge-low' : 'badge-ok'}">${p.quantity <= LOW_STOCK ? 'Faible' : 'OK'}</span></td>
              <td>
                <div class="actions-cell">
                  <button class="btn-icon edit" title="Modifier" data-edit="${p.id}">${icons.edit}</button>
                  <button class="btn-icon danger" title="Supprimer" data-delete="${p.id}">${icons.trash}</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  wrap.querySelectorAll('[data-edit]').forEach(btn => {
    const p = data.find(x => x.id === Number(btn.dataset.edit));
    btn.addEventListener('click', () => showPartForm(p, container));
  });
  wrap.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deletePart(Number(btn.dataset.delete), container));
  });
  wrap.querySelectorAll('[data-adjust]').forEach(btn => {
    btn.addEventListener('click', () => adjustStock(Number(btn.dataset.adjust), parseInt(btn.dataset.qty, 10), container));
  });
}

function showPartForm(part, container) {
  openModal(
    part ? 'Modifier pièce' : 'Nouvelle pièce',
    `<form id="partForm">
      <div class="form-group">
        <label class="form-label">Nom de la pièce *</label>
        <input class="form-control" name="part_name" required value="${part?.part_name || ''}" placeholder="Ex: Filtre à huile" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Quantité *</label>
          <input class="form-control" type="number" name="quantity" min="0" required value="${part?.quantity ?? 0}" />
        </div>
        <div class="form-group">
          <label class="form-label">Prix unitaire (DH) *</label>
          <input class="form-control" type="number" name="unit_price" min="0" step="0.01" required value="${part?.unit_price ?? 0}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Emplacement</label>
        <input class="form-control" name="location" value="${part?.location || ''}" placeholder="Ex: Étagère A3" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancelPartForm">Annuler</button>
        <button type="submit" class="btn btn-primary">${part ? 'Enregistrer' : 'Créer'}</button>
      </div>
    </form>`,
    async (e) => {
      const fd = new FormData(e.target);
      const payload = {
        part_name: fd.get('part_name'),
        quantity: parseInt(fd.get('quantity'), 10),
        unit_price: parseFloat(fd.get('unit_price')),
        location: fd.get('location'),
      };
      const result = part
        ? await api.updatePart(part.id, payload)
        : await api.createPart(payload);
      if (result.error) { toast(result.error.message, 'error'); return; }
      toast(part ? 'Pièce modifiée' : 'Pièce créée');
      closeModal();
      loadParts(container, '');
    }
  );
  document.getElementById('cancelPartForm')?.addEventListener('click', closeModal);
}

function adjustStock(id, currentQty, container) {
  openModal(
    'Ajuster le stock',
    `<form id="adjustForm">
      <div class="form-group">
        <label class="form-label">Nouvelle quantité</label>
        <input class="form-control" type="number" name="qty" min="0" value="${currentQty}" required />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancelAdjust">Annuler</button>
        <button type="submit" class="btn btn-primary">Enregistrer</button>
      </div>
    </form>`,
    async (e) => {
      const fd = new FormData(e.target);
      const qty = parseInt(fd.get('qty'), 10);
      const { error } = await api.updatePart(id, { quantity: qty });
      if (error) { toast(error.message, 'error'); return; }
      toast('Stock ajusté');
      closeModal();
      loadParts(container, '');
    }
  );
  document.getElementById('cancelAdjust')?.addEventListener('click', closeModal);
}

async function deletePart(id, container) {
  if (!confirm('Supprimer cette pièce du stock ?')) return;
  const { error } = await api.deletePart(id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Pièce supprimée');
  loadParts(container, '');
}
