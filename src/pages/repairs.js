import { api } from '../api.js';
import { openModal, closeModal, toast, fmtDate, fmtCurrency, loadingHTML, emptyState, statusBadge, icons } from '../utils.js';

export async function renderRepairs(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Réparations</h1>
        <p>Suivi des interventions et réparations</p>
      </div>
      <button class="btn btn-primary" id="btnAddRepair">
        ${icons.plus} Nouvelle réparation
      </button>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Historique des réparations</span>
        <div class="search-bar">
          <div class="search-input-wrap">
            ${icons.search}
            <input class="search-input" id="searchRepair" placeholder="Description, véhicule…" />
          </div>
          <select class="form-control" id="filterStatus" style="width:auto;padding:9px 12px">
            <option value="">Tous statuts</option>
            <option value="pending">En attente</option>
            <option value="in_progress">En cours</option>
            <option value="done">Terminé</option>
          </select>
        </div>
      </div>
      <div id="repairsTableWrap">${loadingHTML()}</div>
    </div>
  `;

  document.getElementById('btnAddRepair').addEventListener('click', () => showRepairForm(null, container));
  document.getElementById('searchRepair').addEventListener('input', () => loadRepairs(container));
  document.getElementById('filterStatus').addEventListener('change', () => loadRepairs(container));

  await loadRepairs(container);
}

async function loadRepairs(container) {
  const wrap = document.getElementById('repairsTableWrap');
  if (!wrap) return;
  const search = document.getElementById('searchRepair')?.value || '';
  const status = document.getElementById('filterStatus')?.value || '';
  wrap.innerHTML = loadingHTML();

  const { data, error } = await api.getRepairs(search, status);
  if (error) {
    wrap.innerHTML = `<p style="padding:20px;color:red">Erreur: ${error.message}</p>`;
    return;
  }
  if (!data?.length) {
    wrap.innerHTML = emptyState('Aucune réparation enregistrée');
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Véhicule</th>
            <th>Client</th>
            <th>Description</th>
            <th>Main d'oeuvre</th>
            <th>Statut</th>
            <th>Date</th>
            <th style="width:120px">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(r => `
            <tr>
              <td><strong>${r.plate_number || '—'}</strong><br><small style="color:var(--neutral-400)">${r.brand || ''} ${r.model || ''}</small></td>
              <td>${r.client_name || '—'}</td>
              <td style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.description}</td>
              <td>${fmtCurrency(r.labor_price)}</td>
              <td>${statusBadge(r.status)}</td>
              <td>${fmtDate(r.created_at)}</td>
              <td>
                <div class="actions-cell">
                  <button class="btn-icon" title="Pièces utilisées" data-parts="${r.id}">${icons.eye}</button>
                  <button class="btn-icon edit" title="Modifier" data-edit="${r.id}">${icons.edit}</button>
                  <button class="btn-icon danger" title="Supprimer" data-delete="${r.id}">${icons.trash}</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  wrap.querySelectorAll('[data-edit]').forEach(btn => {
    const r = data.find(x => x.id === Number(btn.dataset.edit));
    btn.addEventListener('click', () => showRepairForm(r, container));
  });
  wrap.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteRepair(Number(btn.dataset.delete), container));
  });
  wrap.querySelectorAll('[data-parts]').forEach(btn => {
    btn.addEventListener('click', () => showRepairParts(Number(btn.dataset.parts)));
  });
}

async function showRepairForm(repair, container) {
  const { data: vehicles, error } = await api.getVehicleOptions();
  if (error) { toast(error.message, 'error'); return; }

  openModal(
    repair ? 'Modifier réparation' : 'Nouvelle réparation',
    `<form id="repairForm">
      <div class="form-group">
        <label class="form-label">Véhicule *</label>
        <select class="form-control" name="vehicle_id" required>
          <option value="">— Sélectionner un véhicule —</option>
          ${(vehicles || []).map(v => `<option value="${v.id}" ${repair?.vehicle_id === v.id ? 'selected' : ''}>${v.plate_number} — ${v.brand} ${v.model} (${v.client_name || '—'})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Description *</label>
        <textarea class="form-control" name="description" required rows="3" placeholder="Décrivez l'intervention…">${repair?.description || ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Main d'oeuvre (DH)</label>
          <input class="form-control" type="number" name="labor_price" min="0" step="0.01" value="${repair?.labor_price || 0}" />
        </div>
        <div class="form-group">
          <label class="form-label">Statut</label>
          <select class="form-control" name="status">
            <option value="pending" ${repair?.status === 'pending' || !repair ? 'selected' : ''}>En attente</option>
            <option value="in_progress" ${repair?.status === 'in_progress' ? 'selected' : ''}>En cours</option>
            <option value="done" ${repair?.status === 'done' ? 'selected' : ''}>Terminé</option>
          </select>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancelRepairForm">Annuler</button>
        <button type="submit" class="btn btn-primary">${repair ? 'Enregistrer' : 'Créer'}</button>
      </div>
    </form>`,
    async (e) => {
      const fd = new FormData(e.target);
      const payload = {
        vehicle_id: fd.get('vehicle_id'),
        description: fd.get('description'),
        labor_price: parseFloat(fd.get('labor_price')) || 0,
        status: fd.get('status'),
      };
      const result = repair
        ? await api.updateRepair(repair.id, payload)
        : await api.createRepair(payload);
      if (result.error) { toast(result.error.message, 'error'); return; }
      toast(repair ? 'Réparation modifiée' : 'Réparation créée');
      closeModal();
      loadRepairs(container);
    }
  );
  document.getElementById('cancelRepairForm')?.addEventListener('click', closeModal);
}

async function deleteRepair(id, container) {
  if (!confirm('Supprimer cette réparation ?')) return;
  const { error } = await api.deleteRepair(id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Réparation supprimée');
  loadRepairs(container);
}

async function showRepairParts(repairId) {
  const [{ data: rp, error: rpError }, { data: allParts, error: partsError }] = await Promise.all([
    api.getRepairParts(repairId),
    api.getParts(),
  ]);
  if (rpError) { toast(rpError.message, 'error'); return; }
  if (partsError) { toast(partsError.message, 'error'); return; }

  const total = (rp || []).reduce((s, r) => s + Number(r.unit_price_at_time) * r.quantity_used, 0);

  openModal(
    'Pièces utilisées',
    `<div>
      <div id="rpList">
        ${(rp || []).length === 0
          ? '<p style="color:var(--neutral-400);margin-bottom:16px">Aucune pièce ajoutée.</p>'
          : `<div class="table-wrapper" style="margin-bottom:16px">
              <table>
                <thead><tr><th>Pièce</th><th>Qté</th><th>Prix/u</th><th>Total</th><th></th></tr></thead>
                <tbody>
                  ${(rp || []).map(r => `
                    <tr>
                      <td>${r.part_name}</td>
                      <td>${r.quantity_used}</td>
                      <td>${fmtCurrency(r.unit_price_at_time)}</td>
                      <td>${fmtCurrency(Number(r.unit_price_at_time) * r.quantity_used)}</td>
                      <td><button class="btn-icon danger" data-del-rp="${r.id}" data-part-id="${r.part_id}" data-qty="${r.quantity_used}">${icons.trash}</button></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div style="text-align:right;font-weight:700;color:var(--neutral-800);margin-bottom:16px">Total pièces: ${fmtCurrency(total)}</div>`
        }
      </div>
      <form id="addPartForm" style="border-top:1px solid var(--neutral-100);padding-top:16px">
        <h4 style="font-size:.85rem;font-weight:700;color:var(--neutral-600);margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px">Ajouter une pièce</h4>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Pièce *</label>
            <select class="form-control" name="part_id" required>
              <option value="">— Sélectionner —</option>
              ${(allParts || []).map(p => `<option value="${p.id}" data-price="${p.unit_price}" data-qty="${p.quantity}">${p.part_name} (stock: ${p.quantity})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Quantité *</label>
            <input class="form-control" type="number" name="qty" min="1" value="1" required />
          </div>
        </div>
        <div class="form-actions" style="margin-top:8px">
          <button type="submit" class="btn btn-primary btn-sm">Ajouter</button>
        </div>
      </form>
    </div>`,
    async (e) => {
      const fd = new FormData(e.target);
      const partId = Number(fd.get('part_id'));
      const qty = parseInt(fd.get('qty'), 10) || 1;
      const partOption = e.target.querySelector(`option[value="${partId}"]`);
      const unitPrice = parseFloat(partOption?.dataset.price) || 0;
      const stock = parseInt(partOption?.dataset.qty, 10) || 0;

      if (qty > stock) { toast(`Stock insuffisant (${stock} disponible)`, 'error'); return; }

      const { error: rpErr } = await api.addRepairPart({
        repair_id: repairId,
        part_id: partId,
        quantity_used: qty,
        unit_price_at_time: unitPrice,
      });
      if (rpErr) { toast(rpErr.message, 'error'); return; }

      const { error: updateError } = await api.updatePart(partId, { quantity: stock - qty });
      if (updateError) { toast(updateError.message, 'error'); return; }

      toast('Pièce ajoutée');
      closeModal();
      showRepairParts(repairId);
    }
  );

  document.querySelectorAll('[data-del-rp]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const rpId = Number(btn.dataset.delRp);
      const partId = Number(btn.dataset.partId);
      const qty = parseInt(btn.dataset.qty, 10);
      const { error: deleteError } = await api.deleteRepairPart(rpId);
      if (deleteError) { toast(deleteError.message, 'error'); return; }
      const { data: partsData, error: partsError } = await api.getParts();
      if (partsError) { toast(partsError.message, 'error'); return; }
      const part = (partsData || []).find(p => p.id === partId);
      const newQty = (part?.quantity || 0) + qty;
      const { error: partError } = await api.updatePart(partId, { quantity: newQty });
      if (partError) { toast(partError.message, 'error'); return; }
      toast('Pièce retirée');
      closeModal();
      showRepairParts(repairId);
    });
  });
}
