// =========================================================
// MERCYLIFE TRAINING COLLEGE - UTILITY FUNCTIONS
// =========================================================
import { getSchoolInfo } from './config.js';

export function formatCurrency(amount) {
  const school = getSchoolInfo();
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: school.currency === 'KSh' ? 'KES' : (school.currency || 'KES'),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num).replace('KES', school.currency || 'KSh');
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function getStatusBadge(status) {
  const s = String(status).toLowerCase();
  switch (s) {
    case 'active':
    case 'paid':
    case 'present':
    case 'completed':
    case 'published':
      return `<span class="badge-pill badge-success">${status.toUpperCase()}</span>`;
    case 'partially_paid':
    case 'in_progress':
    case 'late':
    case 'assigned':
      return `<span class="badge-pill badge-warning">${status.replace('_', ' ').toUpperCase()}</span>`;
    case 'unpaid':
    case 'overdue':
    case 'absent':
    case 'suspended':
    case 'fail':
      return `<span class="badge-pill badge-danger">${status.toUpperCase()}</span>`;
    default:
      return `<span class="badge-pill badge-primary">${status.toUpperCase()}</span>`;
  }
}

// Download table or JSON as CSV
export function exportToCSV(filename, rows) {
  if (!rows || !rows.length) return;
  const keys = Object.keys(rows[0]);
  const csvContent = [
    keys.join(','),
    ...rows.map(row => keys.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Printable Window Trigger
export function printDocument(title, htmlContent) {
  const school = getSchoolInfo();
  const printWindow = window.open('', '_blank', 'width=850,height=950');
  const logoHtml = school.logoUrl 
    ? `<img src="${school.logoUrl}" alt="${school.name} Logo" style="max-height:65px; max-width:180px; margin-bottom:8px; display:block; margin-left:auto; margin-right:auto; border-radius:4px;" />` 
    : '';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - ${school.name}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 2.5rem; color: #1e293b; line-height: 1.5; font-size: 13px; }
          .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 1rem; margin-bottom: 1.5rem; }
          .logo-title { font-size: 22px; font-weight: 800; color: #064e3b; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 2px; }
          .tagline { font-size: 12px; font-weight: 600; color: #059669; margin-bottom: 4px; }
          .sub { font-size: 11px; color: #64748b; }
          .doc-badge { margin-top: 12px; font-size: 15px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; background: #ecfdf5; padding: 6px 16px; display: inline-block; border-radius: 6px; border: 1px solid #a7f3d0; }
          table { width: 100%; border-collapse: collapse; margin-top: 1.25rem; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 12px; text-align: left; }
          th { background: #f8fafc; font-weight: 700; color: #334155; text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; }
          .footer { margin-top: 3rem; font-size: 10px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
          .signature-box { display: flex; justify-content: space-between; margin-top: 2.5rem; padding: 0 1rem; }
          .sig-line { border-top: 1px dashed #64748b; width: 200px; text-align: center; padding-top: 4px; font-size: 11px; font-weight: 600; color: #334155; }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoHtml}
          <div class="logo-title">${school.name}</div>
          <div class="tagline">${school.tagline} ${school.owner ? `&bull; ${school.owner}` : ''}</div>
          <div class="sub">${school.address} &bull; ${school.poBox}</div>
          <div class="sub">Email: ${school.email} | Phone: ${school.phone} | Web: ${school.website}</div>
          ${school.examBoard ? `<div class="sub" style="margin-top:2px; font-style:italic; font-weight:500;">Accreditation: ${school.examBoard}</div>` : ''}
          <div class="doc-badge">${title}</div>
        </div>
        ${htmlContent}
        <div class="footer">
          Generated officially by ${school.name} ERP System on ${new Date().toLocaleString()}<br/>
          Official Stamp & Authorized Signature Required for External Validation &bull; Ref: ${school.name.replace(/[^A-Z]/g, '')}/VERIFIED
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
