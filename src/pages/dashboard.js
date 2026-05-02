import { api } from '../api.js';
import { fmtCurrency, loadingHTML } from '../utils.js';

let charts = {};

export async function renderDashboard(container) {
  container.innerHTML = loadingHTML();

  const { data, error } = await api.getDashboard();
  if (error) {
    container.innerHTML = `<p style="padding:20px;color:red">Erreur: ${error.message}</p>`;
    return;
  }

  const { clientCount, vehicleCount, repairCount, transactions: txData, repairsByMonth } = data;

  let totalIncome = 0, totalExpense = 0;
  (txData || []).forEach(t => {
    if (t.type === 'income') totalIncome += Number(t.amount);
    else totalExpense += Number(t.amount);
  });
  const profit = totalIncome - totalExpense;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p>Vue d'ensemble de l'activité du garage</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="stat-info">
          <div class="label">Clients</div>
          <div class="value">${clientCount || 0}</div>
          <div class="sub">Clients enregistrés</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        </div>
        <div class="stat-info">
          <div class="label">Véhicules</div>
          <div class="value">${vehicleCount || 0}</div>
          <div class="sub">En base</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        </div>
        <div class="stat-info">
          <div class="label">Réparations</div>
          <div class="value">${repairCount || 0}</div>
          <div class="sub">Total</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="stat-info">
          <div class="label">Profit net</div>
          <div class="value">${fmtCurrency(profit)}</div>
          <div class="sub">Revenus − Coûts</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        </div>
        <div class="stat-info">
          <div class="label">Revenus</div>
          <div class="value">${fmtCurrency(totalIncome)}</div>
          <div class="sub">Total encaissé</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
        </div>
        <div class="stat-info">
          <div class="label">Coûts</div>
          <div class="value">${fmtCurrency(totalExpense)}</div>
          <div class="sub">Total dépensé</div>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="card">
        <div class="card-header"><span class="card-title">Revenus vs Coûts vs Profits (par mois)</span></div>
        <div class="card-body"><div class="chart-wrapper"><canvas id="chartFinance"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Réparations par mois</span></div>
        <div class="card-body"><div class="chart-wrapper"><canvas id="chartRepairs"></canvas></div></div>
      </div>
    </div>
  `;

  Object.values(charts).forEach(c => c.destroy());
  charts = {};

  const monthlyFinance = {};
  (txData || []).forEach(t => {
    const key = new Date(t.created_at).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    if (!monthlyFinance[key]) monthlyFinance[key] = { income: 0, expense: 0 };
    if (t.type === 'income') monthlyFinance[key].income += Number(t.amount);
    else monthlyFinance[key].expense += Number(t.amount);
  });

  const monthlyRepairs = {};
  (repairsByMonth || []).forEach(r => {
    const key = new Date(r.created_at).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    monthlyRepairs[key] = (monthlyRepairs[key] || 0) + 1;
  });

  const financeLabels = Object.keys(monthlyFinance);
  const repairLabels = Object.keys(monthlyRepairs);

  charts.finance = new Chart(document.getElementById('chartFinance'), {
    type: 'bar',
    data: {
      labels: financeLabels,
      datasets: [
        {
          label: 'Revenus',
          data: financeLabels.map(k => monthlyFinance[k].income),
          backgroundColor: 'rgba(34,197,94,.7)',
        },
        {
          label: 'Coûts',
          data: financeLabels.map(k => monthlyFinance[k].expense),
          backgroundColor: 'rgba(239,68,68,.7)',
        },
        {
          label: 'Profit',
          data: financeLabels.map(k => monthlyFinance[k].income - monthlyFinance[k].expense),
          backgroundColor: 'rgba(59,130,246,.7)',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
      scales: { y: { beginAtZero: true } },
    },
  });

  charts.repairs = new Chart(document.getElementById('chartRepairs'), {
    type: 'line',
    data: {
      labels: repairLabels,
      datasets: [{
        label: 'Réparations',
        data: repairLabels.map(k => monthlyRepairs[k]),
        borderColor: 'rgb(59,130,246)',
        backgroundColor: 'rgba(59,130,246,.1)',
        tension: 0.4,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}
