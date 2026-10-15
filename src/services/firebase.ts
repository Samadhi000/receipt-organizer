import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import * as fbAuth from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './firebaseConfig';

// Initialize the app once (Fast Refresh can re-run this module).
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// --- Firestore -------------------------------------------------------------
// Force long-polling: React Native lacks the streaming transport Firestore
// prefers in browsers, so the default can hang.
let firestore: Firestore;
try {
  firestore = initializeFirestore(app, { experimentalForceLongPolling: true });
} catch {
  firestore = getFirestore(app);
}
export const db = firestore;

// --- Auth ------------------------------------------------------------------
// Persist the session in AsyncStorage so the user stays signed in across
// restarts and offline (only the first sign-in/sign-up needs a network).
// getReactNativePersistence ships in Firebase's RN build; accessed defensively
// because the web type definitions don't expose it.
const getRNPersistence = (fbAuth as any).getReactNativePersistence as
  | ((s: unknown) => unknown)
  | undefined;

let authInstance: fbAuth.Auth;
try {
  authInstance = getRNPersistence
    ? fbAuth.initializeAuth(app, { persistence: getRNPersistence(AsyncStorage) as any })
    : fbAuth.initializeAuth(app);
} catch {
  authInstance = fbAuth.getAuth(app);
}
export const auth = authInstance;

// True once the placeholder config has been replaced with real values.
export function isFirebaseConfigured(): boolean {
  return !!firebaseConfig.projectId && !firebaseConfig.projectId.startsWith('REPLACE');
}
