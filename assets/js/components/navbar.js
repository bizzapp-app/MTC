// =========================================================
// NAVBAR COMPONENT (VANILLA JS MODULE)
// =========================================================
import { getCurrentUser, logout } from '../auth.js';
import { CONFIG } from '../config.js';

export async function renderNavbar(title = "Dashboard") {
  const user = await getCurrentUser();
  const navbarContainer = document.getElementById('navbar-container');
  if (!navbarContainer) return;
  if (!user) return;

  navbarContainer.innerHTML = `
    <header class="topbar">
      <div class="topbar-left">
        <button id="sidebar-toggle" class="toggle-sidebar-btn" title="Toggle Sidebar">☰</button>
        <h1 class="page-title">${title}</h1>
      </div>

      <div class="topbar-right">
        <span class="badge-pill badge-primary">
          <span>📅</span> ${CONFIG.CURRENT_ACADEMIC_YEAR} (${CONFIG.CURRENT_SEMESTER})
        </span>

        <button id="theme-toggle-btn" class="btn btn-secondary btn-sm" title="Toggle Light/Dark Theme">
          🌙
        </button>

        <div class="user-menu" id="user-profile-trigger">
          <div class="user-avatar">${user.full_name ? user.full_name.charAt(0) : 'U'}</div>
          <div class="user-info">
            <span class="user-name">${user.full_name}</span>
            <span class="user-role">${String(user.role || '').replace(/_/g, ' ')}</span>
          </div>
        </div>

        <button id="logout-btn" class="btn btn-outline btn-sm" style="color: #DC2626; border-color: #FCA5A5;" title="Log Out">
          🚪 Exit
        </button>
      </div>
    </header>
  `;

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logout();
  });

  const themeBtn = document.getElementById('theme-toggle-btn');
  themeBtn?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME_MODE, isDark ? 'dark' : 'light');
    themeBtn.textContent = isDark ? '☀️' : '🌙';
  });

  if (localStorage.getItem(CONFIG.STORAGE_KEYS.THEME_MODE) === 'dark') {
    document.body.classList.add('dark-mode');
    if (themeBtn) themeBtn.textContent = '☀️';
  }
}
