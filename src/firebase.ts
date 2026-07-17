import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'

/**
 * Public Firebase web-app configuration, sourced from Vite env vars so values
 * can be rotated without a code change. These are client identifiers, not
 * secrets — security comes from Firebase project rules, not from hiding them.
 * @type {{apiKey: string, authDomain: string, projectId: string, messagingSenderId: string, appId: string}}
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/**
 * Whether every required config value is present — lets callers degrade
 * gracefully (hide the notifications UI) instead of crashing when env vars
 * are missing in a preview build.
 * @returns {boolean} true when the Firebase config is complete
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.apiKey !== 'your-web-api-key' &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId &&
      firebaseConfig.appId !== 'your-web-app-id',
  )
}

/**
 * Lazily initialize (or reuse) the Firebase app singleton. Safe to call any
 * number of times — React StrictMode double-mounts included.
 * @returns {FirebaseApp} the shared Firebase app instance
 */
export function getFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
}
