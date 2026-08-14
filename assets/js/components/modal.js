// =========================================================
// UNIVERSAL MODAL COMPONENT (VANILLA JS MODULE)
// =========================================================

export function createModal({ title, bodyHTML, footerHTML, onOpen }) {
  let modalOverlay = document.getElementById('global-modal-overlay');

  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'global-modal-overlay';
    modalOverlay.className = 'modal-overlay';
    document.body.appendChild(modalOverlay);
  }

  modalOverlay.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="card-title" style="margin:0;">${title}</h3>
        <button class="modal-close-btn" id="modal-close-x">&times;</button>
      </div>
      <div class="modal-body">
        ${bodyHTML}
      </div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>
  `;

  const closeModal = () => {
    modalOverlay.classList.remove('open');
  };

  document.getElementById('modal-close-x')?.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  modalOverlay.classList.add('open');

  if (typeof onOpen === 'function') {
    onOpen(closeModal);
  }

  return { closeModal };
}
