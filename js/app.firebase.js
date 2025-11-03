// js/app.firebase.js
// Firebase setup, online save/load
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables MUST be used as mandated by the environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
let app;
let db;
let auth;
let userId;

// Import session state from utils
import { newSessionState } from './app.utils.js';

export async function initializeFirebase() {
  // Default state is defined globally as newSessionState
  try {
    if (Object.keys(firebaseConfig).length) {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);
     
      await setPersistence(auth, browserLocalPersistence);
      if (initialAuthToken) {
        await signInWithCustomToken(auth, initialAuthToken);
      } else {
        await signInAnonymously(auth);
      }
      userId = auth.currentUser.uid;
      console.log("Firebase initialized successfully");
      const sessionRef = doc(db, 'sessions', userId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        window.session = { ...newSessionState,
          ...data,
          memory: { ...newSessionState.memory,
            ...(data.memory || {})
          },
          chat_history: data.chat_history || [] // [NEW] Load chat history
        };
        // [FIX] If user quit during onboarding, restart onboarding
        if (window.session.current_step_index < 0) {
            window.session.current_step_index = -4; // Restart at name capture
        }
        console.log("Loaded existing session from step:", window.session.current_step_index);
      } else {
        // No session found, use the brand new state
        window.session = { ...newSessionState }; // Use a copy
        window.session.created_at = new Date().toISOString();
        const mentorNames = ["Kofi", "Yaw", "Sam", "Ama", "Adwoa"];
        window.session.mentor_name = mentorNames[Math.floor(Math.random() * mentorNames.length)];
        console.log("No existing session, starting new one.");
      }
    } else {
      // Standalone mode
      console.log("Firebase config not provided, running in standalone mode");
      window.session = { ...newSessionState }; // Use a copy
      window.session.created_at = new Date().toISOString();
      const mentorNames = ["Kofi", "Yaw", "Sam", "Ama", "Adwoa"];
      window.session.mentor_name = mentorNames[Math.floor(Math.random() * mentorNames.length)];
    }
  } catch (error) {
    // Error mode
    console.error("Firebase initialization or sign-in failed:", error);
    window.session = { ...newSessionState }; // CRITICAL: Ensure session exists
  }
}

export async function saveSession() {
  if (db && userId) {
    try {
      const sessionRef = doc(db, 'sessions', userId);
      window.session.updated_at = new Date().toISOString();
      // [NEW] Save chat history to Firebase
      await setDoc(sessionRef, window.session, {
        merge: true
      });
      console.log("Session saved. Step:", window.session.current_step_index);
    } catch (error) {
      console.error("Error saving session:", error);
    }
  }
}