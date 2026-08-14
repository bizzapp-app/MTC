// =========================================================
// NOTICEBOARD & MESSAGING MODULE (VANILLA JS MODULE)
// =========================================================
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { dbService } from './supabase.js';
import { getCurrentUser, enforcePageAccess } from './auth.js';
import { createModal } from './components/modal.js';
import { showToast } from './components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  await enforcePageAccess();
  await renderSidebar('messaging');
  await renderNavbar('Notice Board & Messaging');

  await loadAnnouncements();

  document.getElementById('post-notice-btn')?.addEventListener('click', () => {
    openNoticeModal();
  });
});

async function loadAnnouncements() {
  const notices = await dbService.getAnnouncements();
  const container = document.getElementById('notices-container');
  if (!container) return;

  container.innerHTML = notices.map(n => `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
        <span class="badge-pill badge-primary">${n.category}</span>
        <span style="font-size:0.8rem; color:var(--text-muted);">📅 ${n.created_at ? new Date(n.created_at).toLocaleDateString() : ''} • By ${n.created_by || 'Admin'}</span>
      </div>
      <h3 class="card-title" style="margin-bottom:0.35rem;">${n.title}</h3>
      <p style="font-size:0.9rem; color:var(--text-main); line-height:1.6;">${n.content}</p>
    </div>
  `).join('');
}

function openNoticeModal() {
  createModal({
    title: "📢 Post Announcement to Notice Board",
    bodyHTML: `
      <form id="notice-form">
        <div class="form-group">
          <label class="form-label">Notice Title *</label>
          <input type="text" class="form-control" id="anc-title" required placeholder="e.g. Clinical Rotation Schedule Change" />
        </div>
        <div class="form-group">
          <label class="form-label">Category *</label>
          <select class="form-control" id="anc-cat" required>
            <option value="Academic">Academic</option>
            <option value="Clinical">Clinical</option>
            <option value="Finance">Finance</option>
            <option value="Events">Events</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Notice Message Content *</label>
          <textarea class="form-control" id="anc-content" rows="4" required placeholder="Type full notice text here..."></textarea>
        </div>
      </form>
    `,
    footerHTML: `
      <button class="btn btn-secondary" id="cancel-anc">Cancel</button>
      <button class="btn btn-primary" id="save-anc">Publish Notice</button>
    `,
    onOpen: (closeModal) => {
      document.getElementById('cancel-anc')?.addEventListener('click', closeModal);
      document.getElementById('save-anc')?.addEventListener('click', async () => {
        await dbService.addAnnouncement({
          title: document.getElementById('anc-title').value,
          category: document.getElementById('anc-cat').value,
          content: document.getElementById('anc-content').value,
          created_by: (await getCurrentUser())?.full_name || 'Admin'
        });

        showToast('Announcement published to campus notice board.');
        closeModal();
        await loadAnnouncements();
      });
    }
  });
}
