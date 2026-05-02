import { api } from '../api.js';
import { openModal, closeModal, toast, fmtDate, loadingHTML, emptyState, icons } from '../utils.js';

export async function renderVehicles(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Véhicules</h1>
        <p>Gérez les véhicules des clients</p>
      </div>
      <button class="btn btn-primary" id="btnAddVehicle">
        ${icons.plus} Ajouter véhicule
      </button>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Liste des véhicules</span>
        <div class="search-bar">
          <div class="search-input-wrap">
            ${icons.search}
            <input class="search-input" id="searchVehicle" placeholder="Plaque, marque, modèle…" />
          </div>
        </div>
      </div>
      <div id="vehiclesTableWrap">${loadingHTML()}</div>
    </div>
  `;

  document.getElementById('btnAddVehicle').addEventListener('click', () => showVehicleForm(null, container));
  document.getElementById('searchVehicle').addEventListener('input', e => loadVehicles(container, e.target.value));

  await loadVehicles(container, '');
}

async function loadVehicles(container, search = '') {
  const wrap = document.getElementById('vehiclesTableWrap');
  if (!wrap) return;
  wrap.innerHTML = loadingHTML();

  const { data, error } = await api.getVehicles(search);
  if (error) {
    wrap.innerHTML = `<p style="padding:20px;color:red">Erreur: ${error.message}</p>`;
    return;
  }
  if (!data?.length) {
    wrap.innerHTML = emptyState('Aucun véhicule enregistré');
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Immatriculation</th>
            <th>Marque / Modèle</th>
            <th>Client</th>
            <th>Créé le</th>
            <th style="width:100px">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(v => `
            <tr>
              <td><strong>${v.plate_number}</strong></td>
              <td>${v.brand} ${v.model}</td>
              <td>${v.client_name || '—'}</td>
              <td>${fmtDate(v.created_at)}</td>
              <td>
                <div class="actions-cell">
                  <button class="btn-icon edit" title="Modifier" data-edit="${v.id}">${icons.edit}</button>
                  <button class="btn-icon danger" title="Supprimer" data-delete="${v.id}">${icons.trash}</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  wrap.querySelectorAll('[data-edit]').forEach(btn => {
    const v = data.find(x => x.id === Number(btn.dataset.edit));
    btn.addEventListener('click', () => showVehicleForm(v, container));
  });
  wrap.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteVehicle(Number(btn.dataset.delete), container));
  });
}

async function showVehicleForm(vehicle, container) {
  const { data: clients, error } = await api.getClientsOptions();
  if (error) {
    toast(error.message, 'error');
    return;
  }

  openModal(
    vehicle ? 'Modifier véhicule' : 'Nouveau véhicule',
    `<form id="vehicleForm">
      <div class="form-group">
        <label class="form-label">Client *</label>
        <select class="form-control" name="client_id" required>
          <option value="">— Sélectionner un client —</option>
          ${(clients || []).map(c => `<option value="${c.id}" ${vehicle?.client_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Marque *</label>
          <input class="form-control" name="brand" required value="${vehicle?.brand || ''}" placeholder="Ex: Dacia" />
        </div>
        <div class="form-group">
          <label class="form-label">Modèle *</label>
          <input class="form-control" name="model" required value="${vehicle?.model || ''}" placeholder="Ex: Logan" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Immatriculation *</label>
        <input class="form-control" name="plate_number" required value="${vehicle?.plate_number || ''}" placeholder="Ex: 12345-A-1" style="text-transform:uppercase" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancelVehicleForm">Annuler</button>
        <button type="submit" class="btn btn-primary">${vehicle ? 'Enregistrer' : 'Créer'}</button>
      </div>
    </form>`,
    async (e) => {
      const fd = new FormData(e.target);
      const payload = {
        client_id: fd.get('client_id'),
        brand: fd.get('brand'),
        model: fd.get('model'),
        plate_number: fd.get('plate_number').toUpperCase(),
      };
      const result = vehicle
        ? await api.updateVehicle(vehicle.id, payload)
        : await api.createVehicle(payload);
      if (result.error) { toast(result.error.message, 'error'); return; }
      toast(vehicle ? 'Véhicule modifié' : 'Véhicule créé');
      closeModal();
      loadVehicles(container, '');
    }
  );
  document.getElementById('cancelVehicleForm')?.addEventListener('click', closeModal);
}

async function deleteVehicle(id, container) {
  if (!confirm('Supprimer ce véhicule ?')) return;
  const { error } = await api.deleteVehicle(id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Véhicule supprimé');
  loadVehicles(container, '');
}
