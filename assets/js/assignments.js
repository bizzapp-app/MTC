// =========================================================
// ASSIGNMENTS & DOWNLOADS MODULE (VANILLA JS MODULE)
// =========================================================
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { dbService } from './supabase.js';
import { getCurrentUser, enforcePageAccess } from './auth.js';
import { showToast } from './components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  await enforcePageAccess();
  await renderSidebar('assignments');
  await renderNavbar('Course Assignments & Downloads');

  renderAssignments();
});

function renderAssignments() {
  const container = document.getElementById('assignments-container');
  if (!container) return;

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">📝 Active Course Assignments</h3>
        <button class="btn btn-sm btn-primary" id="upload-asg-btn">➕ Create Assignment</button>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Unit</th>
            <th>Title</th>
            <th>Deadline</th>
            <th>Max Marks</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge-pill badge-primary">ANA-101</span></td>
            <td><strong>Cardiovascular System Histology Report</strong></td>
            <td>05 Aug 2026</td>
            <td>30 Marks</td>
            <td><button class="btn btn-sm btn-secondary submit-asg-btn">📤 Submit Solution</button></td>
          </tr>
          <tr>
            <td><span class="badge-pill badge-primary">NUR-201</span></td>
            <td><strong>Clinical Nursing Care Plan Case Study</strong></td>
            <td>10 Aug 2026</td>
            <td>50 Marks</td>
            <td><button class="btn btn-sm btn-secondary submit-asg-btn">📤 Submit Solution</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">📁 Downloadable Academic Resources</h3>
      </div>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1rem;">
        <div style="padding:1rem; border:1px solid var(--border-color); border-radius:var(--radius-md);">
          <div style="font-weight:700;">📅 Academic Calendar 2026/2027</div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem;">PDF • 1.2 MB</div>
          <button class="btn btn-sm btn-outline dl-btn" data-file="Academic_Calendar_2026.pdf">📥 Download</button>
        </div>
        <div style="padding:1rem; border:1px solid var(--border-color); border-radius:var(--radius-md);">
          <div style="font-weight:700;">📜 College Rules & Code of Ethics</div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem;">PDF • 850 KB</div>
          <button class="btn btn-sm btn-outline dl-btn" data-file="School_Rules.pdf">📥 Download</button>
        </div>
        <div style="padding:1rem; border:1px solid var(--border-color); border-radius:var(--radius-md);">
          <div style="font-weight:700;">🏥 Mercylite Hospital Rotation Guide</div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem;">PDF • 2.4 MB</div>
          <button class="btn btn-sm btn-outline dl-btn" data-file="Clinical_Rotation_Manual.pdf">📥 Download</button>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.submit-asg-btn').forEach(b => {
    b.addEventListener('click', () => {
      showToast('Assignment file uploaded successfully!', 'success');
    });
  });

  document.querySelectorAll('.dl-btn').forEach(b => {
    b.addEventListener('click', (e) => {
      showToast(`Downloading resource: ${e.target.getAttribute('data-file')}`);
    });
  });
}
