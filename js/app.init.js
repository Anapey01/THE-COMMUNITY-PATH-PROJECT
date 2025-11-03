// js/app.init.js
// Handles initialization & routing
import { initFirebase } from './app.firebase.js';
import { injectFeedbackUI } from './app.feedback.js';
import { renderApp, renderOnboardingStep, handleNext, handleBack, updateNavigation } from './app.chat.js'; // Rendering shared with chat for onboarding

let appContainer, appFooter, nextButton, backButton, currentStepSpan; // Main App DOM

export function initApp() {
  console.log("Initializing hybrid app...");

  // Find MAIN app elements
  appContainer = document.getElementById('app-container');
  appFooter = document.getElementById('app-footer');
  nextButton = document.getElementById('next-button');
  backButton = document.getElementById('back-button');
  currentStepSpan = document.getElementById('current-step');
  if (!appContainer || !nextButton || !backButton || !currentStepSpan) {
    console.error("Failed to find required app DOM elements!");
    appContainer.innerHTML = "<p class='text-red-500'>Error: Application failed to load. Please refresh.</p>";
    return;
  }

  // --- Inject the Feedback Button & Modal UI ---
  injectFeedbackUI();

  // --- END ---
  console.log("Attaching onboarding listeners");
  nextButton.addEventListener('click', handleNext);
  backButton.addEventListener('click', handleBack);

  // [ROBUST FLOW]
  initFirebase()
    .catch((error) => {
        console.error("A critical error occurred during Firebase init:", error);
        // We ensure a fallback session exists even if Firebase fails
        if (!window.session) {
            window.session = { ...newSessionState };
        }
    })
    .finally(() => {
        // This will ALWAYS run, even if Firebase fails
        renderApp();
    });
}

// Expose DOM globals for other modules if needed (e.g., for rendering)
window.appDOM = { appContainer, appFooter, nextButton, backButton, currentStepSpan };

// Export rendering functions for use in main
export { renderApp, renderOnboardingStep, handleNext, handleBack, updateNavigation };