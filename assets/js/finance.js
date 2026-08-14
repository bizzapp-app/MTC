// =========================================================
// FINANCE & ACCOUNTING MODULE (VANILLA JS MODULE)
// =========================================================
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { dbService } from './supabase.js';
import { getCurrentUser, enforcePageAccess } from './auth.js';
import { formatCurrency, formatDate, getStatusBadge, printDocument, exportToCSV } from './utils.js';
import { createModal } from './components/modal.js';
import { showToast } from './components/toast.js';

let invoices = [];
let payments = [];
let students = [];

document.addEventListener('DOMContentLoaded', async () => {
  await enforcePageAccess();
  await renderSidebar('finance');
  await renderNavbar('Finance & Fee Management');

  students = await dbService.getStudents();
  await loadFinanceData();

  document.getElementById('record-payment-btn')?.addEventListener('click', () => {
    openPaymentModal();
  });

  document.getElementById('create-invoice-btn')?.addEventListener('click', () => {
    openInvoiceModal();
  });

  document.getElementById('export-finance-btn')?.addEventListener('click', () => {
    exportToCSV('Mercylife_Fee_Statements.csv', invoices.map(i => ({
      InvoiceNo: i.invoice_no,
      StudentName: i.student_name,
      TotalAmount: i.amount,
      PaidAmount: i.paid_amount,
      Balance: i.balance,
      Status: i.status,
      DueDate: i.due_date
    })));
    showToast('Financial ledger exported.');
  });
});

async function loadFinanceData() {
  try {
    invoices = await dbService.getInvoices();
    payments = await dbService.getPayments();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Failed to load finance data', 'error');
    invoices = [];
    payments = [];
  }

  renderSummaryMetrics();
  renderInvoicesTable();
  renderPaymentsTable();
}

function renderSummaryMetrics() {
  const totalBilled = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const totalCollected = payments.reduce((s, p) => s + Number(p.amount_paid), 0);
  const totalOutstanding = invoices.reduce((s, i) => s + Number(i.balance), 0);

  const container = document.getElementById('finance-metrics');
  if (!container) return;

  container.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon-box metric-icon-green">💵</div>
        <div class="metric-details">
          <span class="metric-value">${formatCurrency(totalCollected)}</span>
          <span class="metric-label">Total Fee Revenue Collected</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon-box metric-icon-amber">📋</div>
        <div class="metric-details">
          <span class="metric-value">${formatCurrency(totalBilled)}</span>
          <span class="metric-label">Total Invoiced Fees</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon-box metric-icon-red">⚠️</div>
        <div class="metric-details">
          <span class="metric-value">${formatCurrency(totalOutstanding)}</span>
          <span class="metric-label">Total Outstanding Balances</span>
        </div>
      </div>
    </div>
  `;
}

function renderInvoicesTable() {
  const tbody = document.getElementById('invoices-tbody');
  if (!tbody) return;

  tbody.innerHTML = invoices.map(inv => `
    <tr>
      <td><strong>${inv.invoice_no}</strong></td>
      <td>${inv.student_name}</td>
      <td>${formatCurrency(inv.amount)}</td>
      <td><span style="color:#15803D; font-weight:700;">${formatCurrency(inv.paid_amount)}</span></td>
      <td><span style="color:#DC2626; font-weight:700;">${formatCurrency(inv.balance)}</span></td>
      <td>${formatDate(inv.due_date)}</td>
      <td>${getStatusBadge(inv.status)}</td>
      <td>
        <button class="btn btn-sm btn-primary pay-inv-btn" data-id="${inv.id}">💳 Pay</button>
        <button class="btn btn-sm btn-outline statement-btn" data-student="${inv.student_id}" data-name="${inv.student_name}">📄 Statement</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.pay-inv-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const inv = invoices.find(i => i.id === id);
      if (inv) openPaymentModal(inv);
    });
  });

  document.querySelectorAll('.statement-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const name = e.currentTarget.getAttribute('data-name');
      openStudentStatement(name);
    });
  });
}

function renderPaymentsTable() {
  const tbody = document.getElementById('payments-tbody');
  if (!tbody) return;

  tbody.innerHTML = payments.map(p => `
    <tr>
      <td><strong>${p.receipt_no}</strong></td>
      <td>${p.student_name}</td>
      <td><strong>${formatCurrency(p.amount_paid)}</strong></td>
      <td>
        ${p.payment_method === 'mpesa' ? `<span class="mpesa-badge">M-PESA ${p.reference_code}</span>` : `<span>${p.payment_method.toUpperCase()} (${p.reference_code})</span>`}
      </td>
      <td>${formatDate(p.payment_date)}</td>
      <td>${p.received_by}</td>
      <td>
        <button class="btn btn-sm btn-secondary view-receipt-btn" data-id="${p.id}">🖨️ Receipt</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.view-receipt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const payment = payments.find(p => p.id === id);
      if (payment) printOfficialReceipt(payment);
    });
  });
}

function openPaymentModal(selectedInvoice = null) {
  createModal({
    title: "💳 Record Student Fee Receipt",
    bodyHTML: `
      <form id="payment-form">
        <div class="form-group">
          <label class="form-label">Select Student *</label>
          <select class="form-control" id="pay-student" required>
            ${students.map(s => `
              <option value="${s.id}" ${selectedInvoice?.student_id === s.id ? 'selected' : ''}>
                ${s.admission_no} - ${s.full_name} (${s.course_name})
              </option>
            `).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Amount Paid (KSh) *</label>
          <input type="number" class="form-control" id="pay-amount" required placeholder="e.g. 45000" value="${selectedInvoice?.balance || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Payment Channel *</label>
          <select class="form-control" id="pay-method" required>
            <option value="mpesa">M-Pesa Express / Paybill</option>
            <option value="bank">KCB Bank Deposit</option>
            <option value="cash">Cashier Counter</option>
            <option value="cheque">Bankers Cheque</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Reference / Transaction Code *</label>
          <input type="text" class="form-control" id="pay-ref" required placeholder="e.g. QJK9182301 or Slip No" />
        </div>
        <div class="form-group">
          <label class="form-label">Notes / Remarks</label>
          <input type="text" class="form-control" id="pay-notes" placeholder="First Term Fee Payment" />
        </div>
      </form>
    `,
    footerHTML: `
      <button class="btn btn-secondary" id="cancel-pay">Cancel</button>
      <button class="btn btn-primary" id="save-pay">✅ Process Payment & Issue Receipt</button>
    `,
    onOpen: (closeModal) => {
      document.getElementById('cancel-pay')?.addEventListener('click', closeModal);
      document.getElementById('save-pay')?.addEventListener('click', async () => {
        const studentId = document.getElementById('pay-student').value;
        try {
          const newPayment = await dbService.recordPayment({
            student_id: studentId,
            invoice_id: document.getElementById('pay-invoice')?.value || null,
            amount_paid: Number(document.getElementById('pay-amount').value),
            payment_method: document.getElementById('pay-method').value,
            reference_code: document.getElementById('pay-ref').value,
            notes: document.getElementById('pay-notes').value
          });
          showToast(`Payment of KSh ${newPayment.amount_paid} recorded. Receipt ${newPayment.receipt_no}.`);
          closeModal();
          await loadFinanceData();
          printOfficialReceipt(newPayment);
        } catch (err) {
          console.error(err);
          showToast(err.message || 'Payment was NOT saved', 'error');
        }
      });
    }
  });
}

function openInvoiceModal() {
  createModal({
    title: "🧾 Create Student Fee Invoice",
    bodyHTML: `
      <form id="invoice-form">
        <div class="form-group">
          <label class="form-label">Select Student *</label>
          <select class="form-control" id="inv-student" required>
            ${students.map(s => `<option value="${s.id}">${s.admission_no} - ${s.full_name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Total Fee Amount (KSh) *</label>
          <input type="number" class="form-control" id="inv-amount" required placeholder="e.g. 65000" />
        </div>
        <div class="form-group">
          <label class="form-label">Due Date *</label>
          <input type="date" class="form-control" id="inv-duedate" required value="2026-04-15" />
        </div>
        <div class="form-group">
          <label class="form-label">Invoice Description *</label>
          <input type="text" class="form-control" id="inv-desc" required value="Semester 1 Tuition & Clinical Rotation Fees" />
        </div>
      </form>
    `,
    footerHTML: `
      <button class="btn btn-secondary" id="cancel-inv">Cancel</button>
      <button class="btn btn-primary" id="save-inv">Generate Invoice</button>
    `,
    onOpen: (closeModal) => {
      document.getElementById('cancel-inv')?.addEventListener('click', closeModal);
      document.getElementById('save-inv')?.addEventListener('click', async () => {
        const studentId = document.getElementById('inv-student').value;
        const studentObj = students.find(s => s.id === studentId);

        const amount = Number(document.getElementById('inv-amount').value);
        try {
          if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a valid amount');
          await dbService.addInvoice({
            student_id: studentId,
            amount: amount,
            paid_amount: 0,
            balance: amount,
            due_date: document.getElementById('inv-duedate').value,
            description: document.getElementById('inv-desc').value,
            status: 'unpaid'
          });
          showToast('Invoice generated successfully.');
          closeModal();
          await loadFinanceData();
        } catch (err) {
          console.error(err);
          showToast(err.message || 'Invoice was NOT saved', 'error');
        }
      });
    }
  });
}

function printOfficialReceipt(p) {
  printDocument(`Official Fee Payment Receipt (${p.receipt_no})`, `
    <div style="border:2px dashed #0F5132; padding:1.5rem; border-radius:8px;">
      <h3 style="text-align:center; color:#0F5132; margin-top:0;">OFFICIAL PAYMENT RECEIPT</h3>
      <table style="width:100%; margin-bottom:1rem;">
        <tr>
          <td><strong>Receipt No:</strong> ${p.receipt_no}</td>
          <td style="text-align:right;"><strong>Date:</strong> ${p.payment_date}</td>
        </tr>
        <tr>
          <td><strong>Student Name:</strong> ${p.student_name}</td>
          <td style="text-align:right;"><strong>Payment Method:</strong> ${p.payment_method.toUpperCase()}</td>
        </tr>
        <tr>
          <td><strong>Reference Code:</strong> ${p.reference_code}</td>
          <td style="text-align:right;"><strong>Received By:</strong> ${p.received_by}</td>
        </tr>
      </table>

      <div style="background:#E8F5E9; padding:1rem; text-align:center; border-radius:6px; margin-top:1rem;">
        <span style="font-size:14px; color:#555;">AMOUNT RECEIVED:</span><br/>
        <strong style="font-size:24px; color:#0F5132;">${formatCurrency(p.amount_paid)}</strong>
      </div>
    </div>
  `);
}

function openStudentStatement(studentName) {
  printDocument(`Student Fee Statement - ${studentName}`, `
    <p><strong>Student Name:</strong> ${studentName}</p>
    <p><strong>Academic Year:</strong> 2026/2027</p>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Transaction Description</th>
          <th>Billed Amount</th>
          <th>Paid Amount</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>10/01/2026</td>
          <td>Semester 1 Tuition & Lab Fees Billed</td>
          <td>KSh 65,000</td>
          <td>KSh 0</td>
          <td>KSh 65,000</td>
        </tr>
        <tr>
          <td>15/01/2026</td>
          <td>M-Pesa Payment Received (QJK9128X01)</td>
          <td>-</td>
          <td>KSh 45,000</td>
          <td>KSh 20,000</td>
        </tr>
      </tbody>
    </table>
  `);
}
