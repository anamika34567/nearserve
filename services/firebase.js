import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyD0gK746_0cE4HJ9YHOJ-uDRXpuQwB70Ro",
  authDomain: "serviceconnect-d4193.firebaseapp.com",
  projectId: "serviceconnect-d4193",
  storageBucket: "serviceconnect-d4193.firebasestorage.app",
  messagingSenderId: "117710260418",
  appId: "1:117710260418:web:997bd4b02613e6612ed35b",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export default app;
