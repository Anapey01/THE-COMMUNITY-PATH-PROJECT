// js/app.feedback.js
// Feedback modal logic

export function injectFeedbackUI() {
    const template = document.getElementById('template-feedback-modal');
    if (!template) return;
   
    const modalHTML = template.content.cloneNode(true);
    document.body.appendChild(modalHTML);
    const modal = document.getElementById('feedback-modal-overlay');
    const openBtn = document.getElementById('open-feedback-btn');
    const closeBtn = document.getElementById('close-feedback-modal');
   
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (modal) modal.style.display = "block";
        });
    }
   
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (modal) modal.style.display = "none";
        });
    }
   
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        });
    }
}