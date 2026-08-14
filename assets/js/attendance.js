// =========================================================
// CLASS ATTENDANCE MODULE (VANILLA JS MODULE)
// =========================================================
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { dbService } from './supabase.js';
import { getCurrentUser, enforcePageAccess } from './auth.js';
import { getStatusBadge } from './utils.js';
import { showToast } from './components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  await enforcePageAccess();
  await renderSidebar('attendance');
  await renderNavbar('Class & Clinical Attendance');

  await loadAttendanceData();

  document.getElementById('save-attendance-btn')?.addEventListener('click', async () => {
    const button = document.getElementById('save-attendance-btn');
    const dateInput = document.querySelector('input[type="date"]');
    const date = dateInput?.value || new Date().toISOString().slice(0, 10);
    const rows = [...document.querySelectorAll('#attendance-tbody tr')];
    const currentUser = await getCurrentUser();

    const records = rows.map((row) => {
      const studentId = row.dataset.studentId;
      const status = row.querySelector('.att-status-select')?.value;
      const remarks = row.querySelector('input[type="text"]')?.value?.trim() || null;
      if (!studentId || !status) return null;
      return {
        student_id: studentId,
        date,
        status,
        remarks,
        recorded_by: currentUser?.id || null
      };
    }).filter(Boolean);

    if (!records.length) {
      showToast('No attendance records are available to save.', 'error');
      return;
    }

    try {
      if (button) {
        button.disabled = true;
        button.textContent = 'Saving…';
      }
      await dbService.markAttendance(records);
      showToast(`Attendance saved for ${records.length} student(s).`);
    } catch (err) {
      console.error('[attendance] save failed', err);
      showToast(err.message || 'Attendance was NOT saved.', 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = '💾 Save Attendance Register';
      }
    }
  });
});

async function loadAttendanceData() {
  const students = await dbService.getStudents();
  const attendance = await dbService.getAttendance();

  const tbody = document.getElementById('attendance-tbody');
  if (!tbody) return;

  tbody.innerHTML = students.map(s => `
    <tr data-student-id="${s.id}">
      <td><strong>${s.admission_no}</strong></td>
      <td>${s.full_name}</td>
      <td>${s.course_name}</td>
      <td>
        <select class="form-control att-status-select" style="padding:0.25rem; font-size:0.8rem; font-weight:600;">
          <option value="present" selected>Present ✅</option>
          <option value="late">Late ⏰</option>
          <option value="absent">Absent ❌</option>
          <option value="excused">Excused Medical 🏥</option>
        </select>
      </td>
      <td><input type="text" class="form-control" placeholder="Remarks..." style="padding:0.25rem; font-size:0.8rem;" /></td>
    </tr>
  `).join('');
}
