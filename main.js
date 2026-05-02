import { renderDashboard } from './src/pages/dashboard.js';
import { renderClients } from './src/pages/clients.js';
import { renderVehicles } from './src/pages/vehicles.js';
import { renderRepairs } from './src/pages/repairs.js';
import { renderParts } from './src/pages/parts.js';
import { renderFinance } from './src/pages/finance.js';
import { renderInvoices } from './src/pages/invoices.js';
import { closeModal } from './src/utils.js';

const pages = {
  dashboard: { title: 'Dashboard', render: renderDashboard },
  clients: { title: 'Clients', render: renderClients },
  vehicles: { title: 'Véhicules', render: renderVehicles },
  repairs: { title: 'Réparations', render: renderRepairs },
  parts: { title: 'Stock Pièces', render: renderParts },
  finance: { title: 'Finances', render: renderFinance },
  invoices: { title: 'Factures', render: renderInvoices },
};

let currentPage = 'dashboard';

async function navigate(pageKey) {
  currentPage = pageKey;
  const page = pages[pageKey];
  if (!page) return;

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageKey);
  });

  // Update topbar title
  document.getElementById('topbarTitle').textContent = page.title;
  document.getElementById('topbarActions').innerHTML = '';

  // Render page
  const container = document.getElementById('pageContainer');
  await page.render(container);

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
  document.querySelector('.sidebar-backdrop')?.classList.remove('open');
}

function init() {
  // Create sidebar backdrop for mobile
  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  backdrop.id = 'sidebarBackdrop';
  document.body.appendChild(backdrop);

  // Nav clicks
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(el.dataset.page);
    });
  });

  // Mobile menu toggle
  document.getElementById('menuToggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const bd = document.getElementById('sidebarBackdrop');
    sidebar.classList.toggle('open');
    bd.classList.toggle('open');
  });

  document.getElementById('sidebarBackdrop').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarBackdrop').classList.remove('open');
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  // Load first page
  navigate('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
