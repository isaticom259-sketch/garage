const API_BASE = 'http://localhost:3000';

async function request(url, options = {}) {
  const response = await fetch(API_BASE + url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    return { error: { message: payload?.error || response.statusText || 'Erreur API' } };
  }
  return { data: payload };
}

export const api = {
  getDashboard() {
    return request('/api/dashboard');
  },
  getClients(search = '') {
    return request(`/api/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`);
  },
  createClient(payload) {
    return request('/api/clients', { method: 'POST', body: payload });
  },
  updateClient(id, payload) {
    return request(`/api/clients/${id}`, { method: 'PUT', body: payload });
  },
  deleteClient(id) {
    return request(`/api/clients/${id}`, { method: 'DELETE' });
  },
  getVehicles(search = '') {
    return request(`/api/vehicles${search ? `?search=${encodeURIComponent(search)}` : ''}`);
  },
  getClientsOptions() {
    return request('/api/clients-options');
  },
  createVehicle(payload) {
    return request('/api/vehicles', { method: 'POST', body: payload });
  },
  updateVehicle(id, payload) {
    return request(`/api/vehicles/${id}`, { method: 'PUT', body: payload });
  },
  deleteVehicle(id) {
    return request(`/api/vehicles/${id}`, { method: 'DELETE' });
  },
  getRepairs(search = '', status = '') {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    return request(`/api/repairs${params.toString() ? `?${params}` : ''}`);
  },
  getRepair(id) {
    return request(`/api/repairs/${id}`);
  },
  getVehicleOptions() {
    return request('/api/vehicle-options');
  },
  createRepair(payload) {
    return request('/api/repairs', { method: 'POST', body: payload });
  },
  updateRepair(id, payload) {
    return request(`/api/repairs/${id}`, { method: 'PUT', body: payload });
  },
  deleteRepair(id) {
    return request(`/api/repairs/${id}`, { method: 'DELETE' });
  },
  getRepairParts(repairId) {
    return request(`/api/repair_parts?repair_id=${encodeURIComponent(repairId)}`);
  },
  addRepairPart(payload) {
    return request('/api/repair_parts', { method: 'POST', body: payload });
  },
  deleteRepairPart(id) {
    return request(`/api/repair_parts/${id}`, { method: 'DELETE' });
  },
  getParts(search = '') {
    return request(`/api/parts${search ? `?search=${encodeURIComponent(search)}` : ''}`);
  },
  createPart(payload) {
    return request('/api/parts', { method: 'POST', body: payload });
  },
  updatePart(id, payload) {
    return request(`/api/parts/${id}`, { method: 'PUT', body: payload });
  },
  deletePart(id) {
    return request(`/api/parts/${id}`, { method: 'DELETE' });
  },
  getInvoices() {
    return request('/api/invoices');
  },
  getInvoice(id) {
    return request(`/api/invoices/${id}`);
  },
  createInvoice(payload) {
    return request('/api/invoices', { method: 'POST', body: payload });
  },
  deleteInvoice(id) {
    return request(`/api/invoices/${id}`, { method: 'DELETE' });
  },
  getTransactions(type = '') {
    return request(`/api/transactions${type ? `?type=${encodeURIComponent(type)}` : ''}`);
  },
  createTransaction(payload) {
    return request('/api/transactions', { method: 'POST', body: payload });
  },
  deleteTransaction(id) {
    return request(`/api/transactions/${id}`, { method: 'DELETE' });
  },
  getRepairsOptions() {
    return request('/api/repairs-options');
  },
};
