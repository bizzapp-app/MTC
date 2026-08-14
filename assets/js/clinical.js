// =========================================================
// CLINICAL ATTACHMENTS MODULE (VANILLA JS MODULE)
// Special Hospital Rotations at Mercylite Hospital
// =========================================================
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { dbService } from './supabase.js';
import { getCurrentUser, enforcePageAccess } from './auth.js';
import { getStatusBadge, printDocument } from './utils.js';
import { createModal } from './components/modal.js';
import { showToast } from './components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  await enforcePageAccess();
  await renderSidebar('clinical');
  await renderNavbar('Mercylite Hospital Clinical Rotations');

  await loadClinicalData();
});

async function loadClinicalData() {
  const clinicals = await dbService.getClinicalAttachments();
  const tbody = document.getElementById('clinical-tbody');
  if (!tbody) return;

  tbody.innerHTML = clinicals.map(c => `
    <tr>
      <td><strong>${c.student_name}</strong></td>
      <td><strong>${c.hospital_name}</strong></td>
      <td><span class="badge-pill badge-primary">${c.department}</span></td>
      <td>${c.supervisor_name}</td>
      <td>
        <div style="font-weight:700;">${c.completed_hours} / ${c.required_hours} Hours</div>
        <div style="height:6px; background:var(--border-color); border-radius:3px; overflow:hidden; margin-top:2px;">
          <div style="width:${Math.min(100, Math.round((c.completed_hours / c.required_hours) * 100))}%; height:100%; background:var(--color-primary);"></div>
        </div>
      </td>
      <td><strong>${c.assessment_score}%</strong></td>
      <td>${getStatusBadge(c.status)}</td>
      <td>
        <button class="btn btn-sm btn-outline logbook-btn" data-id="${c.id}" data-name="${c.student_name}">📋 Logbook</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.logbook-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const item = clinicals.find(c => c.id === id);
      if (item) openLogbookModal(item);
    });
  });
}

function openLogbookModal(c) {
  createModal({
    title: `Clinical Logbook - ${c.student_name}`,
    bodyHTML: `
      <div style="padding:0.5rem;">
        <h4>Hospital: ${c.hospital_name} (${c.department})</h4>
        <p><strong>Clinical Supervisor:</strong> ${c.supervisor_name} (${c.supervisor_phone})</p>
        <p><strong>Logbook Assessment Summary:</strong></p>
        <div style="padding:1rem; background:var(--bg-hover); border-radius:var(--radius-md); font-size:0.9rem;">
          ${c.logbook_summary}
        </div>
        <div style="margin-top:1rem; font-weight:700; color:var(--color-primary);">
          Completed Clinical Hours: ${c.completed_hours} / ${c.required_hours} Hours (${Math.round((c.completed_hours / c.required_hours)*100)}%)
        </div>
      </div>
    `,
    footerHTML: `<button class="btn btn-primary" id="print-logbook-btn">🖨️ Print Clinical Evaluation</button>`,
    onOpen: () => {
      document.getElementById('print-logbook-btn')?.addEventListener('click', () => {
        printDocument(`Clinical Attachment Evaluation - ${c.student_name}`, `
          <h3>Mercylite Hospital Clinical Logbook</h3>
          <p><strong>Student:</strong> ${c.student_name}</p>
          <p><strong>Hospital Department:</strong> ${c.department}</p>
          <p><strong>Supervisor:</strong> ${c.supervisor_name}</p>
          <p><strong>Assessment Score:</strong> ${c.assessment_score}%</p>
          <p><strong>Logbook Notes:</strong> ${c.logbook_summary}</p>
        `);
      });
    }
  });
}
