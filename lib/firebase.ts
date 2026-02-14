import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCYKm-R7A-7zEubTVPqqYg__mzcAriha4M",
  authDomain: "gaitguard-42c48.firebaseapp.com",
  projectId: "gaitguard-42c48",
  storageBucket: "gaitguard-42c48.firebasestorage.app",
  messagingSenderId: "1079630271946",
  appId: "1:1079630271946:web:81113b93f72d2792dfeb33",
  measurementId: "G-E5D7Z4J2P0",
};

// Avoid re-initializing on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics only runs in the browser
export const analytics =
  typeof window !== "undefined" ? isSupported().then((yes) => (yes ? getAnalytics(app) : null)) : null;

export default app;
