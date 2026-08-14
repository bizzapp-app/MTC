// =========================================================
// EXAMINATIONS & RESULTS MODULE (VANILLA JS MODULE)
// =========================================================
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { dbService } from './supabase.js';
import { getCurrentUser, enforcePageAccess } from './auth.js';
import { getStatusBadge, printDocument } from './utils.js';
import { createModal } from './components/modal.js';
import { showToast } from './components/toast.js';

let results = [];
let students = [];
let courses = [];

document.addEventListener('DOMContentLoaded', async () => {
  await enforcePageAccess();
  await renderSidebar('results');
  await renderNavbar('Exams & Academic Results');

  students = await dbService.getStudents();
  courses = await dbService.getCourses();
  await loadResults();

  document.getElementById('add-result-btn')?.addEventListener('click', () => {
    openMarksEntryModal();
  });
});

async function loadResults() {
  results = await dbService.getExamResults();
  renderResultsTable();
}

function renderResultsTable() {
  const tbody = document.getElementById('results-tbody');
  if (!tbody) return;

  tbody.innerHTML = results.map(r => `
    <tr>
      <td><strong>${r.student_name}</strong></td>
      <td><span class="badge-pill badge-primary">${r.unit_code}</span> ${r.unit_name}</td>
      <td>${r.cat_marks} / 30</td>
      <td>${r.exam_marks} / 70</td>
      <td><strong>${r.total_marks} / 100</strong></td>
      <td>
        <span class="badge-pill ${r.grade === 'A' || r.grade === 'B' ? 'badge-success' : r.grade === 'C' ? 'badge-primary' : 'badge-danger'}">
          GRADE ${r.grade}
        </span>
      </td>
      <td>${r.remarks}</td>
      <td>
        <button class="btn btn-sm btn-outline transcript-btn" data-name="${r.student_name}">📜 Result Slip</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.transcript-btn').forEach(b => {
    b.addEventListener('click', (e) => {
      const studentName = e.currentTarget.getAttribute('data-name');
      printResultSlip(studentName);
    });
  });
}

function calculateGrade(total) {
  if (total >= 75) return { grade: 'A', remarks: 'Distinction' };
  if (total >= 65) return { grade: 'B', remarks: 'Credit' };
  if (total >= 50) return { grade: 'C', remarks: 'Pass' };
  if (total >= 40) return { grade: 'D', remarks: 'Subsidiary Pass' };
  return { grade: 'F', remarks: 'Fail' };
}

function openMarksEntryModal() {
  createModal({
    title: "📝 Record Student Exam Marks",
    bodyHTML: `
      <form id="results-form">
        <div class="form-group">
          <label class="form-label">Select Student *</label>
          <select class="form-control" id="res-student" required>
            ${students.map(s => `<option value="${s.id}">${s.admission_no} - ${s.full_name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Unit Code & Name *</label>
          <select class="form-control" id="res-unit" required>
            <option value="ANA-101|Human Anatomy & Histology I">ANA-101 - Human Anatomy & Histology I</option>
            <option value="PHY-102|Medical Physiology">PHY-102 - Medical Physiology</option>
            <option value="FAR-103|Pharmacology & Therapeutics">FAR-103 - Pharmacology & Therapeutics</option>
            <option value="NUR-201|Fundamentals of Nursing Practice">NUR-201 - Fundamentals of Nursing Practice</option>
            <option value="MLT-501|Clinical Chemistry & Hematology">MLT-501 - Clinical Chemistry & Hematology</option>
          </select>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <div class="form-group">
            <label class="form-label">Continuous Assessment (CAT) / 30 *</label>
            <input type="number" class="form-control" id="res-cat" max="30" min="0" required placeholder="0 - 30" />
          </div>
          <div class="form-group">
            <label class="form-label">Final Main Exam / 70 *</label>
            <input type="number" class="form-control" id="res-exam" max="70" min="0" required placeholder="0 - 70" />
          </div>
        </div>
      </form>
    `,
    footerHTML: `
      <button class="btn btn-secondary" id="cancel-res">Cancel</button>
      <button class="btn btn-primary" id="save-res">Compute Grade & Save</button>
    `,
    onOpen: (closeModal) => {
      document.getElementById('cancel-res')?.addEventListener('click', closeModal);
      document.getElementById('save-res')?.addEventListener('click', async () => {
        const studentId = document.getElementById('res-student').value;
        const studentObj = students.find(s => s.id === studentId);
        const [unitCode, unitName] = document.getElementById('res-unit').value.split('|');

        const catMarks = Number(document.getElementById('res-cat').value);
        const examMarks = Number(document.getElementById('res-exam').value);
        const totalMarks = catMarks + examMarks;

        const { grade, remarks } = calculateGrade(totalMarks);

        await dbService.addExamResult({
          student_id: studentId,
          student_name: studentObj?.full_name || 'Student',
          unit_code: unitCode,
          unit_name: unitName,
          cat_marks: catMarks,
          exam_marks: examMarks,
          total_marks: totalMarks,
          grade: grade,
          remarks: remarks,
          semester: "Semester 1"
        });

        showToast(`Result recorded: Total ${totalMarks}% (Grade ${grade})`);
        closeModal();
        await loadResults();
      });
    }
  });
}

function printResultSlip(studentName) {
  printDocument(`OFFICIAL ACADEMIC RESULT SLIP - ${studentName}`, `
    <h3 style="text-align:center; color:#0F5132; margin-top:0;">ACADEMIC EXAMINATION RESULT SLIP</h3>
    <p><strong>Student Name:</strong> ${studentName}</p>
    <p><strong>Program:</strong> Diploma in Clinical Medicine & Surgery</p>
    <p><strong>Academic Year:</strong> 2026/2027 (Semester 1)</p>
    
    <table>
      <thead>
        <tr>
          <th>Unit Code</th>
          <th>Unit Name</th>
          <th>CAT (/30)</th>
          <th>Exam (/70)</th>
          <th>Total (/100)</th>
          <th>Grade</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>ANA-101</td>
          <td>Human Anatomy & Histology I</td>
          <td>24</td>
          <td>56</td>
          <td>80</td>
          <td><strong>A</strong></td>
          <td>Distinction</td>
        </tr>
        <tr>
          <td>PHY-102</td>
          <td>Medical Physiology</td>
          <td>21</td>
          <td>48</td>
          <td>69</td>
          <td><strong>B</strong></td>
          <td>Credit</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top:2rem; font-weight:bold;">
      Semester Mean Grade: B (Credit Pass)<br/>
      Recommendation: Proceed to Semester 2 Clinical Rotations
    </div>
  `);
}
