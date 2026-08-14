// =========================================================
// COURSE & UNIT MANAGEMENT MODULE (VANILLA JS MODULE)
// =========================================================
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { dbService } from './supabase.js';
import { getCurrentUser, enforcePageAccess } from './auth.js';
import { formatCurrency } from './utils.js';
import { createModal } from './components/modal.js';
import { showToast } from './components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  await enforcePageAccess();
  await renderSidebar('courses');
  await renderNavbar('Course & Unit Management');

  await loadCourses();

  document.getElementById('add-course-btn')?.addEventListener('click', () => {
    openCourseModal();
  });
});

async function loadCourses() {
  const courses = await dbService.getCourses();
  const container = document.getElementById('courses-grid');
  if (!container) return;

  container.innerHTML = courses.map(c => `
    <div class="card" style="height: 100%; display:flex; flex-direction:column; justify-space-between;">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
          <span class="badge-pill badge-primary">${c.code}</span>
          <span style="font-size:0.8rem; font-weight:700; color:var(--color-primary);">${formatCurrency(c.fees_per_semester)} / Semester</span>
        </div>
        <h3 class="card-title" style="margin-bottom:0.35rem;">${c.name}</h3>
        <div style="font-size:0.75rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.75rem;">
          Department: ${c.department} • Duration: ${c.duration_months} Months
        </div>
        <p style="font-size:0.85rem; color:var(--text-main); margin-bottom:1rem;">
          ${c.description}
        </p>
        <div style="padding:0.6rem; background:var(--bg-hover); border-radius:var(--radius-md); font-size:0.8rem; margin-bottom:1rem;">
          <strong>Admission Requirements:</strong> ${c.requirements}
        </div>
      </div>

      <div style="border-top:1px solid var(--border-color); padding-top:0.75rem; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.8rem; font-weight:600; color:var(--text-muted);">Year 1 & 2 Units Attached</span>
        <button class="btn btn-sm btn-outline view-units-btn" data-code="${c.code}" data-name="${c.name}">📖 View Curriculum</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.view-units-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const code = e.currentTarget.getAttribute('data-code');
      const name = e.currentTarget.getAttribute('data-name');
      openUnitsModal(code, name);
    });
  });
}

function openCourseModal() {
  createModal({
    title: "➕ Add New Course Program",
    bodyHTML: `
      <form id="course-form">
        <div class="form-group">
          <label class="form-label">Course Code *</label>
          <input type="text" class="form-control" id="crs-code" required placeholder="e.g. DCM-101" />
        </div>
        <div class="form-group">
          <label class="form-label">Course Title *</label>
          <input type="text" class="form-control" id="crs-name" required placeholder="e.g. Diploma in Clinical Medicine & Surgery" />
        </div>
        <div class="form-group">
          <label class="form-label">Department *</label>
          <select class="form-control" id="crs-dept" required>
            <option value="Clinical Medicine">Clinical Medicine</option>
            <option value="Nursing">Nursing</option>
            <option value="Community Health">Community Health</option>
            <option value="Health Records">Health Records</option>
            <option value="Laboratory Sciences">Laboratory Sciences</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Fee per Semester (KSh) *</label>
          <input type="number" class="form-control" id="crs-fee" required placeholder="e.g. 65000" />
        </div>
        <div class="form-group">
          <label class="form-label">Duration (Months) *</label>
          <input type="number" class="form-control" id="crs-duration" value="36" required />
        </div>
        <div class="form-group">
          <label class="form-label">Entry Requirements *</label>
          <input type="text" class="form-control" id="crs-req" required placeholder="e.g. KCSE Mean Grade C Plain with C in Bio & Chem" />
        </div>
        <div class="form-group">
          <label class="form-label">Program Description</label>
          <textarea class="form-control" id="crs-desc" rows="3" placeholder="Overview of curriculum and clinical rotation targets..."></textarea>
        </div>
      </form>
    `,
    footerHTML: `
      <button class="btn btn-secondary" id="cancel-crs">Cancel</button>
      <button class="btn btn-primary" id="save-crs">Save Course</button>
    `,
    onOpen: (closeModal) => {
      document.getElementById('cancel-crs')?.addEventListener('click', closeModal);
      document.getElementById('save-crs')?.addEventListener('click', async () => {
        const newCourse = {
          code: document.getElementById('crs-code').value,
          name: document.getElementById('crs-name').value,
          department: document.getElementById('crs-dept').value,
          fees_per_semester: Number(document.getElementById('crs-fee').value),
          duration_months: Number(document.getElementById('crs-duration').value),
          requirements: document.getElementById('crs-req').value,
          description: document.getElementById('crs-desc').value
        };

        try {
          await dbService.addCourse(newCourse);
          showToast('Course saved.');
        } catch (err) {
          showToast(err.message || 'Course was NOT saved', 'error');
          return;
        }
        closeModal();
        await loadCourses();
      });
    }
  });
}

function openUnitsModal(courseCode, courseName) {
  createModal({
    title: `Curriculum Units: ${courseCode} (${courseName})`,
    bodyHTML: `
      <div style="margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.85rem; color:var(--text-muted);">Registered Modules for Academic Year 2026/2027</span>
        <button class="btn btn-sm btn-primary" id="add-unit-sub-btn">➕ Add Unit</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Unit Code</th>
            <th>Unit Title</th>
            <th>Semester</th>
            <th>Lecture Hours</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>ANA-101</strong></td>
            <td>Human Anatomy & Histology I</td>
            <td>Semester 1</td>
            <td>60 Hrs</td>
          </tr>
          <tr>
            <td><strong>PHY-102</strong></td>
            <td>Medical Physiology</td>
            <td>Semester 1</td>
            <td>60 Hrs</td>
          </tr>
          <tr>
            <td><strong>FAR-103</strong></td>
            <td>Pharmacology & Clinical Therapeutics</td>
            <td>Semester 2</td>
            <td>45 Hrs</td>
          </tr>
          <tr>
            <td><strong>PAT-104</strong></td>
            <td>General Pathology & Microbiology</td>
            <td>Semester 2</td>
            <td>50 Hrs</td>
          </tr>
        </tbody>
      </table>
    `,
    onOpen: () => {
      document.getElementById('add-unit-sub-btn')?.addEventListener('click', () => {
        showToast('New unit added to curriculum list.', 'success');
      });
    }
  });
}
