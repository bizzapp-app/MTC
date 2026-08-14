// =========================================================
// DASHBOARD MODULE (VANILLA JS MODULE)
// =========================================================
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { dbService } from './supabase.js';
import { getCurrentUser, enforcePageAccess } from './auth.js';
import { formatCurrency, getStatusBadge } from './utils.js';
import { showToast } from './components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  await enforcePageAccess();
  let stats = { studentCount: 0, courseCount: 0, outstandingFees: 0, collectedFees: 0, activeStudents: 0 };
  try {
    stats = await dbService.getDashboardStats();
  } catch (e) {
    console.error(e);
    showToast?.(e.message || "Dashboard data failed to load", "error");
  }
  await renderSidebar('dashboard');
  
  const user = await getCurrentUser();
  await renderNavbar(`Welcome back, ${(user?.full_name || 'User').split(' ')[0]}!`);

  await loadDashboardData();
});

async function loadDashboardData() {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  let students = [], courses = [], invoices = [], payments = [], clinicals = [], announcements = [];
  try {
    [students, courses, invoices, payments, clinicals, announcements] = await Promise.all([
      dbService.getStudents(),
      dbService.getCourses(),
      dbService.getInvoices(),
      dbService.getPayments(),
      dbService.getClinicalAttachments(),
      dbService.getAnnouncements()
    ]);
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Could not load dashboard data from Supabase', 'error');
  }

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
  const totalBalance = invoices.reduce((sum, i) => sum + Number(i.balance), 0);
  const defaultersCount = invoices.filter(i => Number(i.balance) > 0).length;

  container.innerHTML = `
    <!-- Top Metrics Cards -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon-box metric-icon-green">🎓</div>
        <div class="metric-details">
          <span class="metric-value">${students.length}</span>
          <span class="metric-label">Enrolled Students</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon-box metric-icon-blue">📚</div>
        <div class="metric-details">
          <span class="metric-value">${courses.length}</span>
          <span class="metric-label">Active Medical Courses</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon-box metric-icon-purple">💰</div>
        <div class="metric-details">
          <span class="metric-value">${formatCurrency(totalRevenue)}</span>
          <span class="metric-label">Total Fee Collections</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon-box metric-icon-amber">⚠️</div>
        <div class="metric-details">
          <span class="metric-value">${formatCurrency(totalBalance)}</span>
          <span class="metric-label">Fee Balances (${defaultersCount} Students)</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon-box metric-icon-red">🏥</div>
        <div class="metric-details">
          <span class="metric-value">${clinicals.length}</span>
          <span class="metric-label">Mercylite Hospital Rotations</span>
        </div>
      </div>
    </div>

    <!-- Quick Action Bar -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header" style="border:none; margin:0; padding-bottom:0.5rem;">
        <h3 class="card-title">⚡ Quick ERP Actions</h3>
      </div>
      <div class="quick-actions-bar" style="padding-top:0.5rem;">
        <a href="students.html?action=new" class="btn btn-primary">➕ Admit New Student</a>
        <a href="finance.html?action=pay" class="btn btn-secondary">💳 Record Fee Receipt</a>
        <a href="results.html" class="btn btn-secondary">📝 Enter Exam Marks</a>
        <a href="attendance.html" class="btn btn-secondary">📅 Mark Attendance</a>
        <a href="messaging.html" class="btn btn-outline">📢 Post Notice</a>
      </div>
    </div>

    <!-- Main Content Layout -->
    <div class="dashboard-charts-grid">
      <!-- Left Column: Admissions & Timetable -->
      <div>
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">📋 Recent Admissions</h3>
              <span class="card-subtitle">Latest student enrollments across programs</span>
            </div>
            <a href="students.html" class="btn btn-sm btn-outline">View All Students</a>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Admission No</th>
                  <th>Student Name</th>
                  <th>Course</th>
                  <th>County</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${students.slice(0, 5).map(s => `
                  <tr>
                    <td><strong>${s.admission_no}</strong></td>
                    <td>
                      <div style="display:flex; align-items:center; gap:0.5rem;">
                        <img src="${s.passport_photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;" />
                        <span>${s.full_name}</span>
                      </div>
                    </td>
                    <td>${s.course_name}</td>
                    <td>${s.county}</td>
                    <td>${getStatusBadge(s.status)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Timetable Today -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📅 Today's Clinical & Lecture Schedule</h3>
            <span class="badge-pill badge-primary">Mercylite Main Campus</span>
          </div>
          <div class="timeline-feed">
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div>
                <strong>08:30 AM - 10:30 AM</strong>: Human Anatomy & Histology Lab (Anatomy Lab 2)
                <div style="font-size:0.8rem; color:var(--text-muted);">Lecturer: Dr. Evans Mburu | Diploma Clinical Medicine</div>
              </div>
            </div>
            <div class="timeline-item">
              <div class="timeline-dot" style="background-color:#15803D;"></div>
              <div>
                <strong>11:00 AM - 01:00 PM</strong>: Fundamentals of Nursing Practice (Skills Lab 1)
                <div style="font-size:0.8rem; color:var(--text-muted);">Lecturer: Sr. Grace Wanjiku | KRCHN Nursing Year 1</div>
              </div>
            </div>
            <div class="timeline-item">
              <div class="timeline-dot" style="background-color:#0369A1;"></div>
              <div>
                <strong>02:00 PM - 04:30 PM</strong>: Emergency Ward Rotation (Mercylite Hospital)
                <div style="font-size:0.8rem; color:var(--text-muted);">Supervisor: Dr. Harrison Kamau | Clinical Medicine Year 2</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Announcements & Distribution -->
      <div>
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📢 Notice Board</h3>
            <a href="messaging.html" class="btn btn-sm btn-outline">All Notices</a>
          </div>
          <div style="display:flex; flex-direction:column; gap:1rem;">
            ${announcements.slice(0, 3).map(a => `
              <div style="padding:0.75rem; background:var(--bg-hover); border-radius:var(--radius-md); border-left:4px solid var(--color-primary);">
                <div style="font-weight:700; font-size:0.9rem;">${a.title}</div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">${a.content}</div>
                <div style="font-size:0.7rem; color:var(--color-primary); margin-top:0.4rem; font-weight:600;">📅 ${a.date} • ${a.author}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Course Capacity Bar -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📊 Enrollment breakdown</h3>
          </div>
          <div style="display:flex; flex-direction:column; gap:0.85rem;">
            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600;">
                <span>Diploma Clinical Medicine</span>
                <span>45%</span>
              </div>
              <div style="height:8px; background:var(--border-color); border-radius:4px; overflow:hidden; margin-top:4px;">
                <div style="width:45%; height:100%; background:var(--color-primary);"></div>
              </div>
            </div>
            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600;">
                <span>Diploma KRCHN Nursing</span>
                <span>35%</span>
              </div>
              <div style="height:8px; background:var(--border-color); border-radius:4px; overflow:hidden; margin-top:4px;">
                <div style="width:35%; height:100%; background:#15803D;"></div>
              </div>
            </div>
            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600;">
                <span>Medical Lab Tech</span>
                <span>20%</span>
              </div>
              <div style="height:8px; background:var(--border-color); border-radius:4px; overflow:hidden; margin-top:4px;">
                <div style="width:20%; height:100%; background:#0369A1;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
