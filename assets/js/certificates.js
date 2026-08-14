// =========================================================
// CERTIFICATES & OFFICIAL DOCUMENTS MODULE (VANILLA JS MODULE)
// =========================================================
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { dbService } from './supabase.js';
import { getCurrentUser, enforcePageAccess } from './auth.js';
import { printDocument, formatDate } from './utils.js';
import { getSchoolInfo } from './config.js';

let students = [];

document.addEventListener('DOMContentLoaded', async () => {
  await enforcePageAccess();
  await renderSidebar('certificates');
  await renderNavbar('Official College Document Generator');

  students = await dbService.getStudents();
  setupDocumentGenerator();
});

function setupDocumentGenerator() {
  const container = document.getElementById('certs-container');
  if (!container) return;

  const school = getSchoolInfo();

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">🖨️ Select Document Type & Student</h3>
          <span class="card-subtitle">Generate official letters, certificates, & transcripts branded for <strong>${school.name}</strong></span>
        </div>
      </div>
      
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.25rem;">
        <div class="form-group">
          <label class="form-label">Select Student *</label>
          <select class="form-control" id="doc-student-select">
            ${students.map(s => `<option value="${s.id}">${s.admission_no} - ${s.full_name} (${s.course_name})</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Document Template *</label>
          <select class="form-control" id="doc-type-select">
            <option value="admission">Official Admission Letter</option>
            <option value="transcript">Official Academic Transcript</option>
            <option value="recommendation">Dean / Principal's Recommendation Letter</option>
            <option value="completion">Course Completion Certificate</option>
          </select>
        </div>
      </div>

      <div style="margin-top:1.25rem; display:flex; justify-content:flex-end;">
        <button class="btn btn-primary" id="generate-doc-btn">📜 Generate & Print Document</button>
      </div>
    </div>
  `;

  document.getElementById('generate-doc-btn')?.addEventListener('click', () => {
    const studentId = document.getElementById('doc-student-select').value;
    const docType = document.getElementById('doc-type-select').value;
    const student = students.find(s => s.id === studentId) || students[0];
    const currentSchool = getSchoolInfo();

    const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    if (docType === 'admission') {
      printDocument(`OFFICIAL ADMISSION LETTER - ${student.full_name}`, `
        <div style="line-height:1.7; color:#1e293b;">
          <div style="display:flex; justify-content:space-between; margin-bottom:1.5rem; border-bottom:1px solid #e2e8f0; padding-bottom:0.75rem;">
            <div>
              <strong>Date:</strong> ${todayStr}<br/>
              <strong>Ref:</strong> ${currentSchool.name.replace(/[^A-Z]/g, '')}/ADM/2026/${student.admission_no.split('/').pop() || '01'}
            </div>
            <div style="text-align:right;">
              <strong>To Candidate:</strong> ${student.full_name}<br/>
              National ID: ${student.national_id || 'N/A'}<br/>
              Phone: ${student.phone}
            </div>
          </div>

          <h3 style="color:#064e3b; text-transform:uppercase; letter-spacing:0.02em; border-left:4px solid #059669; padding-left:10px; margin-bottom:1rem;">
            RE: OFFER OF ADMISSION TO ${student.course_name.toUpperCase()}
          </h3>

          <p>We are pleased to inform you that following your academic evaluation (KCSE Mean Grade: ${student.kcse_grade || 'C Plain'}), you have been granted admission to <strong>${currentSchool.name}</strong> ${currentSchool.owner ? `(In affiliation with ${currentSchool.owner})` : ''}.</p>

          <table style="margin: 1.25rem 0;">
            <tr><th style="width:30%;">Admission Number</th><td><strong>${student.admission_no}</strong></td></tr>
            <tr><th>Program Enrolled</th><td>${student.course_name}</td></tr>
            <tr><th>Reporting Date</th><td>1st September 2026 (08:00 AM)</td></tr>
            <tr><th>Campus Location</th><td>${currentSchool.address}</td></tr>
            <tr><th>Accrediting Board</th><td>${currentSchool.examBoard}</td></tr>
          </table>

          <p>Please note that you are required to report with original copies of your KCSE Certificate, National Identification Document, 2 passport-size photographs, and medical clearance certificates.</p>

          <div style="margin-top:2.5rem; display:flex; justify-content:space-between;">
            <div>
              <br/>____________________________________<br/>
              <strong>${currentSchool.principal}</strong><br/>
              <span style="font-size:11px; color:#64748b;">${currentSchool.principalTitle}</span><br/>
              <em>${currentSchool.name}</em>
            </div>
            <div style="text-align:right;">
              <br/>____________________________________<br/>
              <strong>${currentSchool.registrar}</strong><br/>
              <span style="font-size:11px; color:#64748b;">${currentSchool.registrarTitle}</span><br/>
              <em>Admissions & Registry Office</em>
            </div>
          </div>
        </div>
      `);
    } else if (docType === 'transcript') {
      printDocument(`OFFICIAL ACADEMIC TRANSCRIPT - ${student.full_name}`, `
        <div style="line-height:1.6;">
          <table style="margin-bottom:1.5rem; background:#f8fafc;">
            <tr>
              <td><strong>Student Name:</strong> ${student.full_name}</td>
              <td><strong>Admission No:</strong> ${student.admission_no}</td>
            </tr>
            <tr>
              <td><strong>Course:</strong> ${student.course_name}</td>
              <td><strong>Academic Year:</strong> 2026/2027</td>
            </tr>
            <tr>
              <td><strong>National ID:</strong> ${student.national_id || 'N/A'}</td>
              <td><strong>Licensing Board:</strong> ${currentSchool.examBoard}</td>
            </tr>
          </table>

          <h4 style="color:#064e3b; margin-bottom:0.5rem; border-bottom:1px solid #059669; padding-bottom:4px;">SEMESTER 1 ACADEMIC COURSEWORK & MARKS</h4>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Course Unit Title</th>
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
                <td>25</td>
                <td>58</td>
                <td><strong>83</strong></td>
                <td><span style="color:#059669; font-weight:700;">A</span></td>
                <td>Distinction</td>
              </tr>
              <tr>
                <td>PHY-102</td>
                <td>Medical Physiology & Pathology</td>
                <td>22</td>
                <td>51</td>
                <td><strong>73</strong></td>
                <td><span style="color:#059669; font-weight:700;">B</span></td>
                <td>Credit Pass</td>
              </tr>
              <tr>
                <td>FAR-103</td>
                <td>Pharmacology & Therapeutics</td>
                <td>20</td>
                <td>48</td>
                <td><strong>68</strong></td>
                <td><span style="color:#059669; font-weight:700;">B</span></td>
                <td>Credit Pass</td>
              </tr>
              <tr>
                <td>NUR-201</td>
                <td>Fundamentals of Nursing Practice</td>
                <td>26</td>
                <td>61</td>
                <td><strong>87</strong></td>
                <td><span style="color:#059669; font-weight:700;">A</span></td>
                <td>Distinction</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top:1.5rem; background:#ecfdf5; padding:1rem; border-radius:6px; border:1px solid #a7f3d0;">
            <strong>CUMULATIVE PERFORMANCE SUMMARY:</strong><br/>
            Mean Score: 77.75% &bull; GPA: 3.75 &bull; Overall Recommendation: <strong>PASS WITH DISTINCTION</strong>
          </div>

          <div style="margin-top:2.5rem; display:flex; justify-content:space-between;">
            <div>
              <br/>____________________________________<br/>
              <strong>${currentSchool.registrar}</strong><br/>
              <span style="font-size:11px; color:#64748b;">${currentSchool.registrarTitle}</span>
            </div>
            <div style="text-align:right;">
              <br/>____________________________________<br/>
              <strong>${currentSchool.principal}</strong><br/>
              <span style="font-size:11px; color:#64748b;">${currentSchool.principalTitle}</span>
            </div>
          </div>
        </div>
      `);
    } else if (docType === 'completion') {
      printDocument(`CERTIFICATE OF COMPLETION - ${student.full_name}`, `
        <div style="text-align:center; padding:2rem; border:6px double #059669; background:#fafafa; border-radius:8px; margin-top:1rem;">
          <h1 style="color:#064e3b; font-size:26px; font-weight:900; letter-spacing:0.04em; margin-bottom:4px;">${currentSchool.name.toUpperCase()}</h1>
          <p style="font-size:13px; color:#059669; font-weight:600; margin-top:0;">${currentSchool.tagline} ${currentSchool.owner ? `| ${currentSchool.owner}` : ''}</p>
          <hr style="border:0; border-top:1px solid #059669; width:60%; margin:1.5rem auto;" />

          <p style="font-size:14px; letter-spacing:0.1em; color:#475569; margin-bottom:1rem;">THIS IS TO CERTIFY THAT</p>
          <h2 style="color:#064e3b; font-size:24px; text-decoration:underline; font-weight:800; margin-bottom:1rem;">${student.full_name.toUpperCase()}</h2>
          <p style="font-size:13px; max-width:550px; margin:0 auto 1.5rem auto; line-height:1.6;">
            having completed the prescribed course of study and clinical practicum, and having passed all requisite academic examinations, is hereby awarded this Certificate in
          </p>

          <h2 style="color:#059669; font-size:20px; text-transform:uppercase; background:#ecfdf5; display:inline-block; padding:8px 20px; border-radius:4px; border:1px solid #a7f3d0; margin-bottom:1.5rem;">
            ${student.course_name.toUpperCase()}
          </h2>

          <p style="font-size:12px; color:#64748b;">Given under our hand and official seal on this day ${todayStr}.</p>

          <div style="display:flex; justify-content:space-around; margin-top:3rem;">
            <div>
              <br/>___________________________________<br/>
              <strong>${currentSchool.principal}</strong><br/>
              <span style="font-size:11px; color:#64748b;">${currentSchool.principalTitle}</span>
            </div>
            <div>
              <br/>___________________________________<br/>
              <strong>${currentSchool.registrar}</strong><br/>
              <span style="font-size:11px; color:#64748b;">${currentSchool.registrarTitle}</span>
            </div>
          </div>
        </div>
      `);
    } else {
      printDocument(`RECOMMENDATION LETTER - ${student.full_name}`, `
        <div style="line-height:1.7;">
          <p><strong>Date:</strong> ${todayStr}</p>
          <p><strong>TO WHOM IT MAY CONCERN</strong></p>
          <br/>
          <h4 style="color:#064e3b;">SUBJECT: CONFIRMATION AND RECOMMENDATION FOR ${student.full_name.toUpperCase()} (${student.admission_no})</h4>
          <p>This is to confirm that <strong>${student.full_name}</strong> is a registered student at <strong>${currentSchool.name}</strong> pursuing <strong>${student.course_name}</strong>.</p>
          <p>During their period of training, ${student.full_name} has demonstrated exemplary dedication, high ethical standards, and outstanding practical skills in clinical attachments and academic coursework.</p>
          <p>We unreservedly recommend ${student.full_name} for internships, attachments, research opportunities, or employment.</p>
          <br/><br/>
          <p>Yours Sincerely,<br/>
          <strong>${currentSchool.principal}</strong><br/>
          ${currentSchool.principalTitle}<br/>
          ${currentSchool.name}<br/>
          Email: ${currentSchool.email} | Phone: ${currentSchool.phone}
          </p>
        </div>
      `);
    }
  });
}

