// =========================================================
// REPORTS & ANALYTICS MODULE (VANILLA JS MODULE)
// =========================================================
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { dbService } from './supabase.js';
import { getCurrentUser, enforcePageAccess } from './auth.js';
import { formatCurrency, exportToCSV, printDocument } from './utils.js';
import { showToast } from './components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  await enforcePageAccess(['administrator', 'principal', 'finance_officer', 'registrar']);
  await renderSidebar('reports');
  await renderNavbar('Executive Reports & Analytics');

  const students = await dbService.getStudents();
  const invoices = await dbService.getInvoices();
  const payments = await dbService.getPayments();

  renderReports(students, invoices, payments);
});

function renderReports(students, invoices, payments) {
  const container = document.getElementById('reports-container');
  if (!container) return;

  const totalRev = payments.reduce((s, p) => s + Number(p.amount_paid), 0);
  const totalBal = invoices.reduce((s, i) => s + Number(i.balance), 0);

  container.innerHTML = `
    <div class="metrics-grid">
      <div class="card">
        <h4 class="card-title">📈 Admissions Summary</h4>
        <div style="font-size:1.8rem; font-weight:800; color:var(--color-primary);">${students.length} Total Enrolled</div>
        <button class="btn btn-sm btn-outline" id="export-adm-report" style="margin-top:0.75rem;">📄 Export Admissions Report</button>
      </div>

      <div class="card">
        <h4 class="card-title">💰 Revenue Collections</h4>
        <div style="font-size:1.8rem; font-weight:800; color:#15803D;">${formatCurrency(totalRev)}</div>
        <button class="btn btn-sm btn-outline" id="export-rev-report" style="margin-top:0.75rem;">💵 Export Revenue Ledger</button>
      </div>

      <div class="card">
        <h4 class="card-title">⚠️ Fee Defaulters Summary</h4>
        <div style="font-size:1.8rem; font-weight:800; color:#DC2626;">${formatCurrency(totalBal)}</div>
        <button class="btn btn-sm btn-outline" id="export-def-report" style="margin-top:0.75rem;">⚠️ Export Defaulters List</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">📊 County & Gender Demographic Breakdown</h3>
        <button class="btn btn-sm btn-primary" id="print-full-report">🖨️ Print Complete Executive Report</button>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>County</th>
            <th>Female Students</th>
            <th>Male Students</th>
            <th>Total Percentage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Kiambu</strong></td>
            <td>45</td>
            <td>30</td>
            <td>40%</td>
          </tr>
          <tr>
            <td><strong>Nairobi</strong></td>
            <td>35</td>
            <td>25</td>
            <td>32%</td>
          </tr>
          <tr>
            <td><strong>Machakos</strong></td>
            <td>15</td>
            <td>10</td>
            <td>14%</td>
          </tr>
          <tr>
            <td><strong>Kisumu / Others</strong></td>
            <td>15</td>
            <td>12</td>
            <td>14%</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('export-adm-report')?.addEventListener('click', () => {
    exportToCSV('Mercylife_Admissions_Report.csv', students);
  });
  document.getElementById('export-rev-report')?.addEventListener('click', () => {
    exportToCSV('Mercylife_Revenue_Report.csv', payments);
  });
  document.getElementById('export-def-report')?.addEventListener('click', () => {
    exportToCSV('Mercylife_Fee_Defaulters.csv', invoices.filter(i => i.balance > 0));
  });

  document.getElementById('print-full-report')?.addEventListener('click', () => {
    printDocument('Mercylife Executive Board Performance Report', `
      <h3>Executive Summary</h3>
      <p>Total Enrolled Students: ${students.length}</p>
      <p>Total Collections: ${formatCurrency(totalRev)}</p>
      <p>Total Fee Balances: ${formatCurrency(totalBal)}</p>
    `);
  });
}
