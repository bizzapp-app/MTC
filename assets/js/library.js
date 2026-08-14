// =========================================================
// LIBRARY MANAGEMENT MODULE (VANILLA JS MODULE)
// =========================================================
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { dbService } from './supabase.js';
import { getCurrentUser, enforcePageAccess } from './auth.js';
import { getStatusBadge } from './utils.js';
import { showToast } from './components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  await enforcePageAccess();
  await renderSidebar('library');
  await renderNavbar('Medical Library & Book Repository');

  await loadBooks();
});

async function loadBooks() {
  const books = await dbService.getBooks();
  const tbody = document.getElementById('books-tbody');
  if (!tbody) return;

  tbody.innerHTML = books.map(b => `
    <tr>
      <td><strong>${b.title}</strong></td>
      <td>${b.author}</td>
      <td><span class="badge-pill badge-primary">${b.category}</span></td>
      <td>${b.available_quantity ?? 0} / ${b.quantity ?? 0} Available</td>
      <td>
        <button class="btn btn-sm btn-primary issue-book-btn" data-id="${b.id}" data-title="${b.title}">📖 Issue Book</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.issue-book-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const title = e.currentTarget.getAttribute('data-title');
      showToast(`Book "${title}" issued to student. Return due in 14 days.`);
    });
  });
}
