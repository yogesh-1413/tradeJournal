import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Helper to get configuration from either localStorage or environment variables
export function getFirebaseConfig() {
  const localConfigStr = localStorage.getItem("firebase_config");
  if (localConfigStr) {
    try {
      const parsed = JSON.parse(localConfigStr);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse local firebase config", e);
    }
  }

  // Fallback to Vite env variables
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  };
}

export function isFirebaseConfigured() {
  const config = getFirebaseConfig();
  return !!(config.apiKey && config.projectId);
}

export let app = null;
export let auth = null;
export let db = null;

export function initFirebase() {
  if (!isFirebaseConfigured()) {
    return null;
  }
  
  const config = getFirebaseConfig();
  
  try {
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.error("Firebase initialization failed", err);
  }
  
  return { app, auth, db };
}

// Try to initialize immediately if config exists
if (isFirebaseConfigured()) {
  initFirebase();
}
