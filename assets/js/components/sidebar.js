// =========================================================
// SIDEBAR COMPONENT (VANILLA JS MODULE)
// =========================================================
import { getCurrentUser } from '../auth.js';
import { getSchoolInfo } from '../config.js';

export async function renderSidebar(activePage = 'dashboard') {
  const user = await getCurrentUser();
  const school = getSchoolInfo();
  const sidebarContainer = document.getElementById('sidebar-container');
  if (!sidebarContainer) return;
  if (!user) return;

  const initial = school.name ? school.name.trim().charAt(0) : 'M';
  const nameParts = school.name ? school.name.split(' ') : ['MERCYLIFE', 'Training College'];
  const firstWord = nameParts[0] || 'COLLEGE';
  const restOfName = nameParts.slice(1).join(' ') || 'Institution';

  const isStudent = user?.role === 'student';
  const isLecturer = user?.role === 'lecturer';
  const isFinance = user?.role === 'finance_officer';
  const isLibrarian = user?.role === 'librarian';

  sidebarContainer.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          ${school.logoUrl ? `<img src="${school.logoUrl}" style="width:100%; height:100%; object-fit:contain; border-radius:4px;" alt="Logo" />` : initial}
        </div>
        <div class="sidebar-brand">
          <span class="brand-name" title="${school.name}">${firstWord}</span>
          <span class="brand-sub" title="${school.tagline}">${restOfName}</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-title">Main Portal</div>
        <a href="dashboard.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
          <span class="nav-icon">📊</span> Dashboard
        </a>

        ${!isStudent && !isLibrarian ? `
          <div class="nav-section-title">Academic & Admissions</div>
          <a href="students.html" class="nav-item ${activePage === 'students' ? 'active' : ''}">
            <span class="nav-icon">🎓</span> Student Records
          </a>
          <a href="courses.html" class="nav-item ${activePage === 'courses' ? 'active' : ''}">
            <span class="nav-icon">📚</span> Courses & Units
          </a>
          <a href="attendance.html" class="nav-item ${activePage === 'attendance' ? 'active' : ''}">
            <span class="nav-icon">📅</span> Class Attendance
          </a>
          <a href="results.html" class="nav-item ${activePage === 'results' ? 'active' : ''}">
            <span class="nav-icon">📝</span> Exams & Results
          </a>
        ` : ''}

        ${isStudent ? `
          <div class="nav-section-title">Student Portal</div>
          <a href="students.html" class="nav-item ${activePage === 'students' ? 'active' : ''}">
            <span class="nav-icon">👤</span> My Profile
          </a>
          <a href="finance.html" class="nav-item ${activePage === 'finance' ? 'active' : ''}">
            <span class="nav-icon">💳</span> Fee Statement
          </a>
          <a href="results.html" class="nav-item ${activePage === 'results' ? 'active' : ''}">
            <span class="nav-icon">📜</span> Academic Transcript
          </a>
          <a href="attendance.html" class="nav-item ${activePage === 'attendance' ? 'active' : ''}">
            <span class="nav-icon">📅</span> My Attendance
          </a>
          <a href="clinical.html" class="nav-item ${activePage === 'clinical' ? 'active' : ''}">
            <span class="nav-icon">🏥</span> Clinical Attachments
          </a>
          <a href="assignments.html" class="nav-item ${activePage === 'assignments' ? 'active' : ''}">
            <span class="nav-icon">📤</span> Assignments
          </a>
        ` : ''}

        ${!isStudent ? `
          <div class="nav-section-title">Clinical & Operations</div>
          <a href="clinical.html" class="nav-item ${activePage === 'clinical' ? 'active' : ''}">
            <span class="nav-icon">🏥</span> Clinical Rotations
          </a>
          <a href="library.html" class="nav-item ${activePage === 'library' ? 'active' : ''}">
            <span class="nav-icon">📖</span> Library System
          </a>
        ` : ''}

        ${!isStudent && (user.role === 'administrator' || user.role === 'principal' || isFinance) ? `
          <div class="nav-section-title">Finance & Billing</div>
          <a href="finance.html" class="nav-item ${activePage === 'finance' ? 'active' : ''}">
            <span class="nav-icon">💰</span> Accounting & Fees
          </a>
        ` : ''}

        <div class="nav-section-title">Services & Tools</div>
        <a href="messaging.html" class="nav-item ${activePage === 'messaging' ? 'active' : ''}">
          <span class="nav-icon">📢</span> Notices & Messages
        </a>
        <a href="assignments.html" class="nav-item ${activePage === 'assignments' ? 'active' : ''}">
          <span class="nav-icon">📁</span> Course Resources
        </a>
        <a href="certificates.html" class="nav-item ${activePage === 'certificates' ? 'active' : ''}">
          <span class="nav-icon">🖨️</span> Documents & Certs
        </a>

        ${user.role === 'administrator' || user.role === 'principal' ? `
          <div class="nav-section-title">System Admin</div>
          <a href="reports.html" class="nav-item ${activePage === 'reports' ? 'active' : ''}">
            <span class="nav-icon">📈</span> Analytics & Reports
          </a>
          <a href="settings.html" class="nav-item ${activePage === 'settings' ? 'active' : ''}">
            <span class="nav-icon">⚙️</span> System Settings
          </a>
        ` : ''}
      </nav>

      <div style="padding: 1rem; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.75rem; text-align: center; color: #A7F3D0;">
        ${school.owner || 'Partnered Institution'}<br/>v2.5 College ERP System
      </div>
    </aside>
  `;
}
