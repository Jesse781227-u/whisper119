import { getApp, getApps, initializeApp } from "firebase/app"
import {
  getAuth,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Detect any missing values in a clear, actionable way.
const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key)

// Warn in development when env vars are missing, but do NOT throw at module
// load time. A top-level throw propagates through React's module system and
// gets caught by the nearest error boundary (AppErrorBoundary) before any
// component even mounts — bypassing all the null guards in auth-provider and
// Admin that already handle the firebaseConfigured === false case gracefully.
if (missing.length > 0) {
  console.warn(
    `[Whisper 119] Firebase config is incomplete. Missing: ${missing.join(", ")}. ` +
    `Check your VITE_FIREBASE_* environment variables. Firebase features will be disabled.`
  )
}

export const firebaseConfigured = missing.length === 0

const app = firebaseConfigured ? (getApps().length ? getApp() : initializeApp(config)) : null
export const firebaseAuth: Auth | null = app ? getAuth(app) : null
export const googleProvider = firebaseAuth ? new GoogleAuthProvider() : null
export const firebaseDb: Firestore | null = app ? getFirestore(app) : null