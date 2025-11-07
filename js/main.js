// js/main.js

// 🌍 Global Session
window.session = null;

// --- CORE (must load first) ---
import "./app.utils.js";

// ⚠️ Optional Firebase (safe fallback)
try {
  await import("./app.firebase.js");
} catch {
  console.warn("app.firebase.js not found — skipping Firebase setup");
}

// --- FEATURES ---
import "./app.feedback.js";
import "./app.profile.js";

// --- UI & LOGIC ---
import { initApp } from "./app.init.js";  // ✅ Import explicitly
import "./app.chat.js";

// --- START APP ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 App initialized successfully");
  initApp();  // ✅ This now exists properly
});
