import { api } from '../api.js';
import { openModal, closeModal, toast, fmtDate, fmtCurrency, loadingHTML, emptyState, icons } from '../utils.js';

export async function renderInvoices(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Factures</h1>
        <p>Génération et suivi des factures clients</p>
      </div>
      <button class="btn btn-primary" id="btnGenInvoice">
        ${icons.plus} Générer une facture
      </button>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Factures émises</span>
      </div>
      <div id="invoicesTableWrap">${loadingHTML()}</div>
    </div>
  `;

  document.getElementById('btnGenInvoice').addEventListener('click', () => showGenerateInvoice(container));

  await loadInvoices(container);
}

async function loadInvoices(container) {
  const wrap = document.getElementById('invoicesTableWrap');
  if (!wrap) return;
  wrap.innerHTML = loadingHTML();

  const { data, error } = await api.getInvoices();
  if (error) {
    wrap.innerHTML = `<p style="padding:20px;color:red">Erreur: ${error.message}</p>`;
    return;
  }
  if (!data?.length) {
    wrap.innerHTML = emptyState('Aucune facture générée');
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>N° Facture</th>
            <th>Client</th>
            <th>Véhicule</th>
            <th>Montant total</th>
            <th>Date</th>
            <th style="width:110px">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(inv => `
            <tr>
              <td><code style="font-size:.8rem;background:var(--neutral-100);padding:2px 6px;border-radius:4px">${String(inv.id).slice(0,8).toUpperCase()}</code></td>
              <td>${inv.client_name || '—'}</td>
              <td>${inv.plate_number || '—'} · ${inv.brand || ''} ${inv.model || ''}</td>
              <td style="font-weight:700">${fmtCurrency(inv.total_amount)}</td>
              <td>${fmtDate(inv.created_at)}</td>
              <td>
                <div class="actions-cell">
                  <button class="btn-icon" title="Voir / Télécharger" data-view="${inv.id}">${icons.download}</button>
                  <button class="btn-icon danger" title="Supprimer" data-delete="${inv.id}">${icons.trash}</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  wrap.querySelectorAll('[data-view]').forEach(btn => {
    const inv = data.find(x => x.id === Number(btn.dataset.view));
    btn.addEventListener('click', () => downloadInvoicePDF(inv));
  });
  wrap.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteInvoice(Number(btn.dataset.delete), container));
  });
}

async function showGenerateInvoice(container) {
  const { data: repairs, error } = await api.getRepairsOptions();
  if (error) { toast(error.message, 'error'); return; }

  openModal(
    'Générer une facture',
    `<form id="genInvoiceForm">
      <div class="form-group">
        <label class="form-label">Réparation *</label>
        <select class="form-control" name="repair_id" required>
          <option value="">— Sélectionner une réparation —</option>
          ${(repairs || []).map(r => `<option value="${r.id}">[${r.status}] ${r.description.substring(0,50)}</option>`).join('')}
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancelGenInvoice">Annuler</button>
        <button type="submit" class="btn btn-primary">Générer</button>
      </div>
    </form>`,
    async (e) => {
      const fd = new FormData(e.target);
      const repairId = fd.get('repair_id');

      const [{ data: repair, error: repairError }, { data: repairParts, error: partsError }] = await Promise.all([
        api.getRepair(repairId),
        api.getRepairParts(repairId),
      ]);
      if (repairError) { toast(repairError.message, 'error'); return; }
      if (partsError) { toast(partsError.message, 'error'); return; }

      const partsTotal = (repairParts || []).reduce((s, r) => s + Number(r.unit_price_at_time) * r.quantity_used, 0);
      const total = Number(repair.labor_price) + partsTotal;

      const { data: inv, error: createError } = await api.createInvoice({ repair_id: repairId, total_amount: total });
      if (createError) { toast(createError.message, 'error'); return; }

      toast('Facture générée');
      closeModal();

      const { data: fullInvoice, error: invoiceError } = await api.getInvoice(inv.id);
      if (invoiceError) { toast(invoiceError.message, 'error'); return; }
      downloadInvoicePDF(fullInvoice);
      loadInvoices(container);
    }
  );
  document.getElementById('cancelGenInvoice')?.addEventListener('click', closeModal);
}

async function downloadInvoicePDF(inv) {
  let invoice = inv;
  if (!invoice.parts) {
    const { data, error } = await api.getInvoice(inv.id);
    if (error) { toast(error.message, 'error'); return; }
    invoice = data;
  }

  const repair = {
    description: invoice.repair_description,
    labor_price: invoice.labor_price,
    status: invoice.status,
  };

  const repairParts = invoice.parts || [];

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageW, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('GarageOS', 14, 20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Système de Gestion de Garage', 14, 30);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`FACTURE`, pageW - 14, 18, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`N°: ${String(invoice.id).slice(0, 8).toUpperCase()}`, pageW - 14, 26, { align: 'right' });
  doc.text(`Date: ${fmtDate(invoice.created_at)}`, pageW - 14, 33, { align: 'right' });

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT', 14, 55);
  doc.text('VÉHICULE', 110, 55);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(invoice.client_name || '—', 14, 63);
  doc.text(`Tél: ${invoice.client_phone || '—'}`, 14, 70);
  doc.text(`${invoice.brand || ''} ${invoice.model || ''}`, 110, 63);
  doc.text(`Immatriculation: ${invoice.plate_number || '—'}`, 110, 70);

  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION INTERVENTION:', 14, 85);
  doc.setFont('helvetica', 'normal');
  const descLines = doc.splitTextToSize(repair.description || '', pageW - 28);
  doc.text(descLines, 14, 93);

  const tableStartY = 93 + descLines.length * 6 + 10;
  const partsRows = (repairParts || []).map(rp => [
    rp.part_name || '—',
    rp.quantity_used.toString(),
    fmtCurrency(rp.unit_price_at_time),
    fmtCurrency(Number(rp.unit_price_at_time) * rp.quantity_used),
  ]);

  doc.autoTable({
    startY: tableStartY,
    head: [['Pièce', 'Qté', 'Prix unitaire', 'Sous-total']],
    body: partsRows.length ? partsRows : [['Aucune pièce', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  const partsTotal = (repairParts || []).reduce((s, r) => s + Number(r.unit_price_at_time) * r.quantity_used, 0);
  const laborPrice = Number(repair.labor_price || 0);
  const total = laborPrice + partsTotal;

  doc.setDrawColor(220, 220, 220);
  doc.line(pageW - 80, finalY, pageW - 14, finalY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Main d\'oeuvre:', pageW - 80, finalY + 8);
  doc.text(fmtCurrency(laborPrice), pageW - 14, finalY + 8, { align: 'right' });
  doc.text('Total pièces:', pageW - 80, finalY + 15);
  doc.text(fmtCurrency(partsTotal), pageW - 14, finalY + 15, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setFillColor(243, 244, 246);
  doc.rect(pageW - 85, finalY + 19, 71, 12, 'F');
  doc.text('TOTAL:', pageW - 80, finalY + 27);
  doc.text(fmtCurrency(total), pageW - 14, finalY + 27, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Merci pour votre confiance · GarageOS', pageW / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

  doc.save(`Facture_${String(invoice.id).slice(0, 8).toUpperCase()}.pdf`);
  toast('PDF téléchargé');
}

async function deleteInvoice(id, container) {
  if (!confirm('Supprimer cette facture ?')) return;
  const { error } = await api.deleteInvoice(id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Facture supprimée');
  loadInvoices(container);
}
