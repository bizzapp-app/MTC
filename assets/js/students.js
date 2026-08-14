// =========================================================
// STUDENT MANAGEMENT MODULE (VANILLA JS MODULE)
// =========================================================
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { dbService } from './supabase.js';
import { getCurrentUser, enforcePageAccess } from './auth.js';
import { getStatusBadge, exportToCSV, printDocument } from './utils.js';
import { createModal } from './components/modal.js';
import { showToast } from './components/toast.js';

let allStudents = [];
let allCourses = [];

document.addEventListener('DOMContentLoaded', async () => {
  await enforcePageAccess();
  await renderSidebar('students');
  await renderNavbar('Student Management Portal');

  allCourses = await dbService.getCourses();
  await loadStudents();

  // Check query params for quick action e.g. ?action=new
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'new') {
    openStudentModal();
  }
});

async function loadStudents() {
  try {
    allStudents = await dbService.getStudents();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Failed to load students from database', 'error');
    allStudents = [];
  }
  renderStudentTable(allStudents);
  setupFilters();

  document.getElementById('add-student-btn')?.addEventListener('click', () => {
    openStudentModal();
  });

  document.getElementById('export-students-btn')?.addEventListener('click', () => {
    exportToCSV('Mercylife_Students_Roster.csv', allStudents.map(s => ({
      AdmissionNo: s.admission_no,
      Name: s.full_name,
      Gender: s.gender,
      NationalID: s.national_id,
      Phone: s.phone,
      Email: s.email,
      Course: s.course_name,
      County: s.county,
      Status: s.status
    })));
    showToast('Student roster exported to CSV file.');
  });
}

function renderStudentTable(students) {
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">No student records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = students.map(s => `
    <tr>
      <td><strong>${s.admission_no}</strong></td>
      <td>
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <div class="student-photo-thumbnail" style="width:40px;height:40px;border-radius:50%;background:#E5E7EB;display:flex;align-items:center;justify-content:center;font-weight:700;">${(s.full_name||'?').charAt(0)}</div>
          <div>
            <div style="font-weight:700;">${s.full_name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${s.email}</div>
          </div>
        </div>
      </td>
      <td>${s.course_name || 'Medical Program'}</td>
      <td>${s.current_semester || 'Semester 1'}</td>
      <td>${s.county || 'Nairobi'}</td>
      <td>${getStatusBadge(s.status || 'active')}</td>
      <td>
        <div style="display:flex; gap:0.35rem;">
          <button class="btn btn-sm btn-secondary view-btn" data-id="${s.id}">👁️ View</button>
          <button class="btn btn-sm btn-outline edit-btn" data-id="${s.id}">✏️ Edit</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Attach event handlers
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const student = allStudents.find(s => s.id === id);
      if (student) viewStudentDetails(student);
    });
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const student = allStudents.find(s => s.id === id);
      if (student) openStudentModal(student);
    });
  });
}

function setupFilters() {
  const searchInput = document.getElementById('search-student');
  const courseFilter = document.getElementById('filter-course');
  const statusFilter = document.getElementById('filter-status');

  const filterHandler = () => {
    const query = (searchInput?.value || '').toLowerCase();
    const course = courseFilter?.value || '';
    const status = statusFilter?.value || '';

    const filtered = allStudents.filter(s => {
      const matchesQuery = s.full_name.toLowerCase().includes(query) ||
                           s.admission_no.toLowerCase().includes(query) ||
                           (s.national_id && s.national_id.includes(query));
      const matchesCourse = !course || s.course_id === course;
      const matchesStatus = !status || s.status === status;

      return matchesQuery && matchesCourse && matchesStatus;
    });

    renderStudentTable(filtered);
  };

  searchInput?.addEventListener('input', filterHandler);
  courseFilter?.addEventListener('change', filterHandler);
  statusFilter?.addEventListener('change', filterHandler);
}

function viewStudentDetails(student) {
  createModal({
    title: `Student File: ${student.full_name}`,
    bodyHTML: `
      <div class="student-detail-header">
        <img src="${student.passport_photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" class="student-detail-avatar" />
        <div>
          <h2 style="font-size:1.25rem; font-weight:800; margin:0;">${student.full_name}</h2>
          <div style="color:var(--color-primary); font-weight:700; font-size:0.9rem;">Adm No: ${student.admission_no}</div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem;">${student.course_name}</div>
          <div style="margin-top:0.4rem;">${getStatusBadge(student.status)}</div>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Gender / DOB</span>
          <span class="detail-value">${student.gender} • ${student.dob || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">National ID</span>
          <span class="detail-value">${student.national_id || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Phone & Email</span>
          <span class="detail-value">${student.phone}<br/>${student.email}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">County / Nationality</span>
          <span class="detail-value">${student.county} (${student.nationality})</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Guardian Contact</span>
          <span class="detail-value">${student.guardian_name || 'N/A'} (${student.guardian_phone || 'N/A'})</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">KCSE Entry Grade</span>
          <span class="detail-value">${student.kcse_grade || 'C Plain'}</span>
        </div>
        <div class="detail-item" style="grid-column: span 2;">
          <span class="detail-label">Medical History / Allergies</span>
          <span class="detail-value">${student.medical_conditions || 'None Reported'}</span>
        </div>
      </div>

      <div style="margin-top:1.5rem; border-top:1px solid var(--border-color); padding-top:1rem;">
        <h4 style="font-weight:700; margin-bottom:0.75rem;">📁 Student Uploaded Documents</h4>
        <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
          <button class="btn btn-sm btn-outline doc-btn" data-doc="KCSE Certificate">📜 KCSE Certificate</button>
          <button class="btn btn-sm btn-outline doc-btn" data-doc="National ID">🆔 National ID Copy</button>
          <button class="btn btn-sm btn-outline doc-btn" data-doc="Admission Letter">✉️ Admission Letter</button>
          <button class="btn btn-sm btn-outline doc-btn" data-doc="Medical Clearance">🏥 Medical Clearance</button>
        </div>
      </div>
    `,
    footerHTML: `
      <button class="btn btn-primary" id="print-student-profile-btn">🖨️ Print Student Summary</button>
    `,
    onOpen: (closeModal) => {
      document.getElementById('print-student-profile-btn')?.addEventListener('click', () => {
        printDocument(`Student Profile - ${student.full_name} (${student.admission_no})`, `
          <h3>Personal Details</h3>
          <p><strong>Full Name:</strong> ${student.full_name}</p>
          <p><strong>Admission Number:</strong> ${student.admission_no}</p>
          <p><strong>Course:</strong> ${student.course_name}</p>
          <p><strong>National ID:</strong> ${student.national_id}</p>
          <p><strong>County of Residence:</strong> ${student.county}</p>
          <p><strong>Parent / Guardian:</strong> ${student.guardian_name} (${student.guardian_phone})</p>
        `);
      });

      document.querySelectorAll('.doc-btn').forEach(b => {
        b.addEventListener('click', (e) => {
          showToast(`Opening ${e.target.getAttribute('data-doc')} preview...`, 'info');
        });
      });
    }
  });
}

function openStudentModal(existingStudent = null) {
  const isEdit = !!existingStudent;
  createModal({
    title: isEdit ? `Edit Student: ${existingStudent.admission_no}` : `➕ Admit New Student`,
    bodyHTML: `
      <form id="student-form">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input type="text" class="form-control" id="std-fullname" value="${existingStudent?.full_name || ''}" required placeholder="e.g. Mary Wanjiku Kinuthia" />
          </div>
          <div class="form-group">
            <label class="form-label">Admission Number</label>
            <input type="text" class="form-control" id="std-admno" value="${existingStudent?.admission_no || ''}" placeholder="Auto-generated if empty" />
          </div>
          <div class="form-group">
            <label class="form-label">Gender *</label>
            <select class="form-control" id="std-gender" required>
              <option value="Female" ${existingStudent?.gender === 'Female' ? 'selected' : ''}>Female</option>
              <option value="Male" ${existingStudent?.gender === 'Male' ? 'selected' : ''}>Male</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">National ID Number *</label>
            <input type="text" class="form-control" id="std-idno" value="${existingStudent?.national_id || ''}" required placeholder="e.g. 38192049" />
          </div>
          <div class="form-group">
            <label class="form-label">Phone Number *</label>
            <input type="text" class="form-control" id="std-phone" value="${existingStudent?.phone || ''}" required placeholder="+254 7..." />
          </div>
          <div class="form-group">
            <label class="form-label">Email Address *</label>
            <input type="email" class="form-control" id="std-email" value="${existingStudent?.email || ''}" required placeholder="student@mercylifecollege.ac.ke" />
          </div>
          <div class="form-group">
            <label class="form-label">Course / Program *</label>
            <select class="form-control" id="std-course" required>
              ${allCourses.map(c => `
                <option value="${c.id}" ${existingStudent?.course_id === c.id ? 'selected' : ''}>${c.code} - ${c.name}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">County *</label>
            <input type="text" class="form-control" id="std-county" value="${existingStudent?.county || 'Kiambu'}" required placeholder="e.g. Kiambu, Nairobi" />
          </div>
          <div class="form-group">
            <label class="form-label">Guardian / Parent Name</label>
            <input type="text" class="form-control" id="std-guardian" value="${existingStudent?.guardian_name || ''}" placeholder="Parent Name" />
          </div>
          <div class="form-group">
            <label class="form-label">Guardian Phone</label>
            <input type="text" class="form-control" id="std-guardianphone" value="${existingStudent?.guardian_phone || ''}" placeholder="+254 7..." />
          </div>
          <div class="form-group">
            <label class="form-label">KCSE Mean Grade</label>
            <input type="text" class="form-control" id="std-kcse" value="${existingStudent?.kcse_grade || 'C Plain'}" placeholder="e.g. C+" />
          </div>
          <div class="form-group">
            <label class="form-label">Passport Photo URL</label>
            <input type="text" class="form-control" id="std-photo" value="${existingStudent?.passport_photo_url || ''}" placeholder="Image Link" />
          </div>
        </div>
      </form>
    `,
    footerHTML: `
      <button class="btn btn-secondary" id="cancel-std-form">Cancel</button>
      <button class="btn btn-primary" id="save-std-form">${isEdit ? '💾 Update Record' : '✅ Submit Admission'}</button>
    `,
    onOpen: (closeModal) => {
      document.getElementById('cancel-std-form')?.addEventListener('click', closeModal);
      document.getElementById('save-std-form')?.addEventListener('click', async () => {
        const form = document.getElementById('student-form');
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        const selectedCourse = allCourses.find(c => c.id === document.getElementById('std-course').value);

        const newStudentData = {
          full_name: document.getElementById('std-fullname').value,
          admission_no: document.getElementById('std-admno').value || `MTC/2026/0${Math.floor(100 + Math.random() * 900)}`,
          gender: document.getElementById('std-gender').value,
          national_id: document.getElementById('std-idno').value,
          phone: document.getElementById('std-phone').value,
          email: document.getElementById('std-email').value,
          course_id: selectedCourse?.id,
          course_name: selectedCourse?.name,
          county: document.getElementById('std-county').value,
          guardian_name: document.getElementById('std-guardian').value,
          guardian_phone: document.getElementById('std-guardianphone').value,
          kcse_grade: document.getElementById('std-kcse').value,
          passport_photo_url: document.getElementById('std-photo').value || null,
          status: 'active'
        };

        try {
          if (isEdit && existingStudent?.id) {
            await dbService.updateStudent(existingStudent.id, newStudentData);
            showToast('Student record updated.');
          } else {
            await dbService.addStudent(newStudentData);
            showToast(`Student ${newStudentData.full_name} admitted successfully.`);
          }
          closeModal();
          await loadStudents();
        } catch (err) {
          console.error(err);
          showToast(err.message || 'Could not save student. Data was NOT saved.', 'error');
        }
      });
    }
  });
}
