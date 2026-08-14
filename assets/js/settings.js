// =========================================================
// SYSTEM SETTINGS & SUPABASE CONFIG MODULE (VANILLA JS MODULE)
// =========================================================
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { CONFIG, getSupabaseCredentials, getSchoolInfo, saveSchoolInfo } from './config.js';
import { getCurrentUser, enforcePageAccess, getAllSystemUsers, createUserAccount, updateUserAccount, deleteUserAccount, getCustomUsers, isDemoUsersDisabled, setDemoUsersDisabled } from './auth.js';
import { showToast } from './components/toast.js';
import { printDocument } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  await enforcePageAccess(['administrator', 'principal']);
  await renderSidebar('settings');
  await renderNavbar('System Settings & Credentials');

  setupSystemModeControls();
  await setupUserAccountsManager();
  setupSchoolProfileSettings();
  setupSupabaseSettings();
});

function setupSystemModeControls() {
  // Demo mode controls removed from production UI.
}

function setupSchoolProfileSettings() {
  const school = getSchoolInfo();

  const nameInput = document.getElementById('school-name');
  const taglineInput = document.getElementById('school-tagline');
  const ownerInput = document.getElementById('school-owner');
  const examboardInput = document.getElementById('school-examboard');
  const emailInput = document.getElementById('school-email');
  const phoneInput = document.getElementById('school-phone');
  const addressInput = document.getElementById('school-address');
  const poboxInput = document.getElementById('school-pobox');
  const websiteInput = document.getElementById('school-website');
  const currencyInput = document.getElementById('school-currency');
  const principalInput = document.getElementById('school-principal');
  const principalTitleInput = document.getElementById('school-principal-title');
  const registrarInput = document.getElementById('school-registrar');
  const logoInput = document.getElementById('school-logo');

  function populateForm(data) {
    if (nameInput) nameInput.value = data.name || '';
    if (taglineInput) taglineInput.value = data.tagline || '';
    if (ownerInput) ownerInput.value = data.owner || '';
    if (examboardInput) examboardInput.value = data.examBoard || '';
    if (emailInput) emailInput.value = data.email || '';
    if (phoneInput) phoneInput.value = data.phone || '';
    if (addressInput) addressInput.value = data.address || '';
    if (poboxInput) poboxInput.value = data.poBox || '';
    if (websiteInput) websiteInput.value = data.website || '';
    if (currencyInput) currencyInput.value = data.currency || 'KSh';
    if (principalInput) principalInput.value = data.principal || '';
    if (principalTitleInput) principalTitleInput.value = data.principalTitle || '';
    if (registrarInput) registrarInput.value = data.registrar || '';
    if (logoInput) logoInput.value = data.logoUrl || '';

    updateLiveHeaderPreview();
  }

  function getFormData() {
    return {
      name: nameInput?.value.trim() || CONFIG.COLLEGE_NAME,
      tagline: taglineInput?.value.trim() || CONFIG.MOTO,
      owner: ownerInput?.value.trim() || CONFIG.OWNER,
      examBoard: examboardInput?.value.trim() || 'Nursing Council of Kenya / TVETA',
      email: emailInput?.value.trim() || CONFIG.EMAIL,
      phone: phoneInput?.value.trim() || CONFIG.PHONE,
      address: addressInput?.value.trim() || CONFIG.LOCATION,
      poBox: poboxInput?.value.trim() || 'P.O. Box 12345-00100, Nairobi',
      website: websiteInput?.value.trim() || CONFIG.WEBSITE,
      currency: currencyInput?.value.trim() || 'KSh',
      principal: principalInput?.value.trim() || 'Prof. Catherine Muthoni',
      principalTitle: principalTitleInput?.value.trim() || 'College Principal',
      registrar: registrarInput?.value.trim() || 'Dr. Samuel Maina',
      logoUrl: logoInput?.value.trim() || ''
    };
  }

  function updateLiveHeaderPreview() {
    const previewContainer = document.getElementById('school-header-preview');
    if (!previewContainer) return;

    const data = getFormData();
    const logoHtml = data.logoUrl
      ? `<img src="${data.logoUrl}" style="max-height:50px; margin-bottom:6px;" alt="Logo" />`
      : `<div style="display:inline-block; width:45px; height:45px; background:var(--color-primary); color:white; font-size:22px; font-weight:800; line-height:45px; border-radius:8px; margin-bottom:6px;">${data.name.charAt(0)}</div>`;

    previewContainer.innerHTML = `
      ${logoHtml}
      <h3 style="color:var(--color-primary-dark); text-transform:uppercase; margin:0; font-size:1.15rem; font-weight:800;">${data.name}</h3>
      <div style="color:var(--color-primary); font-size:0.8rem; font-weight:600;">${data.tagline} ${data.owner ? `| ${data.owner}` : ''}</div>
      <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
        ${data.address} &bull; ${data.poBox} | Tel: ${data.phone} | Email: ${data.email}
      </div>
      <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px; font-style:italic;">
        Licensing & Exam Board: ${data.examBoard} &bull; Currency: <strong>${data.currency}</strong>
      </div>
    `;
  }

  // Initial load
  populateForm(school);

  // Live preview on input change
  document.querySelectorAll('#school-profile-form input').forEach(input => {
    input.addEventListener('input', updateLiveHeaderPreview);
  });

  // Save School Settings
  document.getElementById('save-school-info-btn')?.addEventListener('click', async () => {
    const data = getFormData();
    saveSchoolInfo(data);
    await renderSidebar('settings');
    showToast('✅ Institution profile updated successfully! All documents now use these details.');
  });

  // Reset to Defaults
  document.getElementById('reset-school-defaults-btn')?.addEventListener('click', async () => {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.SCHOOL_INFO);
    const defaults = getSchoolInfo();
    populateForm(defaults);
    await renderSidebar('settings');
    showToast('Institution settings reset to default college profile.');
  });

  // Test Print Header
  document.getElementById('preview-doc-header-btn')?.addEventListener('click', () => {
    printDocument('OFFICIAL SAMPLE REPORT / STATEMENT', `
      <div style="padding: 1.5rem; text-align:center;">
        <h4 style="color:#064e3b; margin-bottom:0.5rem;">Sample Institution Branded Document</h4>
        <p style="font-size:13px; color:#475569;">
          This sample demonstrates how your saved institution profile (Name, Logo, Slogan, Contact Info, Principal & Registrar credentials) automatically brands all generated receipts, fee statements, transcripts, certificates, and executive reports across the ERP!
        </p>
      </div>
    `);
  });
}

function setupSupabaseSettings() {
  const { url, anonKey } = getSupabaseCredentials();
  const urlInput = document.getElementById('supabase-url-input');
  const keyInput = document.getElementById('supabase-key-input');
  if (urlInput) {
    urlInput.value = url || '';
    urlInput.readOnly = true;
  }
  if (keyInput) {
    keyInput.value = anonKey ? (anonKey.slice(0, 12) + '…') : '';
    keyInput.readOnly = true;
  }
  document.getElementById('save-supabase-config-btn')?.addEventListener('click', () => {
    showToast('Supabase URL and anon key are set via environment variables (VITE_SUPABASE_*), not localStorage.', 'error');
  });
}

async function setupUserAccountsManager() {
  const tableBody = document.getElementById('users-table-body');
  if (!tableBody) return;

  async function renderUsersTable() {
    let allUsers = [];
    try {
      allUsers = await getAllSystemUsers();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not load users from database', 'error');
      allUsers = [];
    }
    
    // Update Stat Badges
    const totalUsersEl = document.getElementById('stat-total-users');
    const staffUsersEl = document.getElementById('stat-staff-users');
    const studentUsersEl = document.getElementById('stat-student-users');
    const activeUsersEl = document.getElementById('stat-active-users');

    if (totalUsersEl) totalUsersEl.textContent = allUsers.length;
    if (staffUsersEl) staffUsersEl.textContent = allUsers.filter(u => u.role !== 'student').length;
    if (studentUsersEl) studentUsersEl.textContent = allUsers.filter(u => u.role === 'student').length;
    if (activeUsersEl) activeUsersEl.textContent = allUsers.filter(u => u.status !== 'suspended').length;

    tableBody.innerHTML = allUsers.map(user => {
      const isDemo = user.is_demo;
      const isSuspended = user.status === 'suspended';
      const roleBadgeClass = user.role === 'administrator' ? 'badge-primary' :
                             user.role === 'student' ? 'badge-info' :
                             user.role === 'finance_officer' ? 'badge-warning' : 'badge-success';

      return `
        <tr>
          <td>
            <strong>${user.full_name}</strong>
            ${isDemo ? '<span class="badge badge-primary" style="font-size:0.6rem; margin-left:6px;">Default Template</span>' : '<span class="badge badge-success" style="font-size:0.6rem; margin-left:6px;">Custom Account</span>'}
          </td>
          <td><code>${user.email}</code></td>
          <td><span class="badge ${roleBadgeClass}">${user.role.replace('_', ' ').toUpperCase()}</span></td>
          <td style="font-size:0.8rem; color:var(--text-muted);">${user.title || 'N/A'}</td>
          <td>
            ${isSuspended 
              ? '<span class="badge badge-danger">SUSPENDED</span>' 
              : '<span class="badge badge-success">ACTIVE</span>'}
          </td>
          <td style="text-align:right;">
            ${isDemo ? `
              <span style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">System Built-in</span>
            ` : `
              <button class="btn btn-sm btn-secondary edit-user-btn" data-id="${user.id}">✏️ Edit</button>
              <button class="btn btn-sm ${isSuspended ? 'btn-primary' : 'btn-outline'} toggle-status-btn" data-id="${user.id}" data-status="${user.status}">
                ${isSuspended ? '🔓 Activate' : '⛔ Suspend'}
              </button>
              <button class="btn btn-sm btn-outline delete-user-btn" style="color:var(--color-danger);" data-id="${user.id}">🗑️</button>
            `}
          </td>
        </tr>
      `;
    }).join('');

    // Attach Event Handlers
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        await openEditUserModal(id);
      });
    });

    document.querySelectorAll('.toggle-status-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const currentStatus = e.currentTarget.getAttribute('data-status');
        const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
        try {
          await updateUserAccount(id, { status: newStatus });
          showToast(`User account status updated to ${newStatus.toUpperCase()}`);
          await renderUsersTable();
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error');
        }
      });
    });

    document.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Are you sure you want to permanently delete this user account?')) {
          try {
            await deleteUserAccount(id);
            showToast('User account suspended');
            await renderUsersTable();
          } catch (err) {
            showToast(`Delete failed: ${err.message}`, 'error');
          }
        }
      });
    });
  }

  // Modal Controls
  const modal = document.getElementById('user-modal');
  const openModalBtn = document.getElementById('open-create-user-modal-btn');
  const closeModalBtn = document.getElementById('close-user-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-user-modal-btn');
  const saveUserBtn = document.getElementById('save-user-account-btn');
  const userForm = document.getElementById('user-account-form');

  function openCreateModal() {
    userForm.reset();
    document.getElementById('user-account-id').value = '';
    document.getElementById('user-modal-title').textContent = '➕ Create New Portal User Account';
    modal?.classList.add('open');
  }

  async function openEditUserModal(userId) {
    let target = null;
    try {
      const users = await getAllSystemUsers();
      target = users.find(u => u.id === userId);
    } catch (err) {
      showToast(err.message || 'Could not load user', 'error');
      return;
    }
    if (!target) return;

    document.getElementById('user-account-id').value = target.id;
    document.getElementById('user-fullname-input').value = target.full_name;
    document.getElementById('user-email-input').value = target.email;
    document.getElementById('user-role-select').value = target.role;
    document.getElementById('user-title-input').value = target.title || '';
    document.getElementById('user-phone-input').value = target.phone || '';
    document.getElementById('user-password-input').value = '';
    document.getElementById('user-status-select').value = target.status || 'active';

    document.getElementById('user-modal-title').textContent = `Edit User Account: ${target.full_name}`;
    modal?.classList.add('open');
  }

  function closeModal() {
    modal?.classList.remove('open');
  }

  openModalBtn?.addEventListener('click', openCreateModal);
  closeModalBtn?.addEventListener('click', closeModal);
  cancelModalBtn?.addEventListener('click', closeModal);

  saveUserBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const id = document.getElementById('user-account-id').value;
    const fullName = document.getElementById('user-fullname-input').value.trim();
    const email = document.getElementById('user-email-input').value.trim();
    const role = document.getElementById('user-role-select').value;
    const title = document.getElementById('user-title-input').value.trim();
    const phone = document.getElementById('user-phone-input').value.trim();
    const password = document.getElementById('user-password-input').value.trim();
    const status = document.getElementById('user-status-select').value;

    if (!fullName || !email) {
      showToast('Full name and email are required.', 'error');
      return;
    }
    if (!id && !password) {
      showToast('Password is required when creating a new user.', 'error');
      return;
    }

    try {
      if (id) {
        // Edit existing user
        await updateUserAccount(id, {
          full_name: fullName,
          email,
          role,
          title,
          phone,
          password,
          status
        });
        showToast(`✅ User account for ${fullName} updated successfully!`);
      } else {
        // Create new user
        await createUserAccount({
          full_name: fullName,
          email,
          role,
          title,
          phone,
          password,
          status
        });
        showToast(`🎉 User account created for ${fullName}! They can now log in with email: ${email}`);
      }

      closeModal();
      await renderUsersTable();
    } catch (err) {
      showToast(`Action failed: ${err.message}`, 'error');
    }
  });

  // Initial table render
  await renderUsersTable();
}

