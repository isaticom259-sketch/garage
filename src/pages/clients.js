import { api } from '../api.js';
import { openModal, closeModal, toast, fmtDate, loadingHTML, emptyState, icons } from '../utils.js';

export async function renderClients(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Clients</h1>
        <p>Gérez votre base de clients</p>
      </div>
      <button class="btn btn-primary" id="btnAddClient">
        ${icons.plus} Ajouter client
      </button>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Liste des clients</span>
        <div class="search-bar">
          <div class="search-input-wrap">
            ${icons.search}
            <input class="search-input" id="searchClient" placeholder="Rechercher…" />
          </div>
        </div>
      </div>
      <div id="clientsTableWrap">${loadingHTML()}</div>
    </div>
  `;

  document.getElementById('btnAddClient').addEventListener('click', () => showClientForm(null, container));
  document.getElementById('searchClient').addEventListener('input', e => loadClients(container, e.target.value));

  await loadClients(container, '');
}

async function loadClients(container, search = '') {
  const wrap = document.getElementById('clientsTableWrap');
  if (!wrap) return;
  wrap.innerHTML = loadingHTML();

  const { data, error } = await api.getClients(search);
  if (error) {
    wrap.innerHTML = `<p style="padding:20px;color:red">Erreur: ${error.message}</p>`;
    return;
  }

  if (!data?.length) {
    wrap.innerHTML = emptyState('Aucun client enregistré');
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Téléphone</th>
            <th>Créé le</th>
            <th style="width:100px">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(c => `
            <tr>
              <td><strong>${c.name}</strong></td>
              <td>${c.phone || '—'}</td>
              <td>${fmtDate(c.created_at)}</td>
              <td>
                <div class="actions-cell">
                  <button class="btn-icon edit" title="Modifier" data-edit="${c.id}">${icons.edit}</button>
                  <button class="btn-icon danger" title="Supprimer" data-delete="${c.id}">${icons.trash}</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  wrap.querySelectorAll('[data-edit]').forEach(btn => {
    const client = data.find(c => c.id === Number(btn.dataset.edit));
    btn.addEventListener('click', () => showClientForm(client, container));
  });
  wrap.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteClient(Number(btn.dataset.delete), container));
  });
}

function showClientForm(client, container) {
  openModal(
    client ? 'Modifier client' : 'Nouveau client',
    `<form id="clientForm">
      <div class="form-group">
        <label class="form-label">Nom complet *</label>
        <input class="form-control" name="name" required value="${client?.name || ''}" placeholder="Ex: Ahmed Benali" />
      </div>
      <div class="form-group">
        <label class="form-label">Téléphone</label>
        <input class="form-control" name="phone" value="${client?.phone || ''}" placeholder="Ex: 0600000000" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancelClientForm">Annuler</button>
        <button type="submit" class="btn btn-primary">${client ? 'Enregistrer' : 'Créer'}</button>
      </div>
    </form>`,
    async (e) => {
      const fd = new FormData(e.target);
      const payload = { name: fd.get('name'), phone: fd.get('phone') };
      const { error } = client
        ? await api.updateClient(client.id, payload)
        : await api.createClient(payload);
      if (error) { toast(error.message, 'error'); return; }
      toast(client ? 'Client modifié' : 'Client créé');
      closeModal();
      loadClients(container, '');
    }
  );
  document.getElementById('cancelClientForm')?.addEventListener('click', closeModal);
}

async function deleteClient(id, container) {
  if (!confirm('Supprimer ce client ? Ses véhicules et réparations seront aussi supprimés.')) return;
  const { error } = await api.deleteClient(id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Client supprimé');
  loadClients(container, '');
}
