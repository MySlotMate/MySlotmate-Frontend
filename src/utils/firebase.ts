// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA0XV4iYT8uAb9R0eyiSXC0_1hJ8P5CSLU",
  authDomain: "myslotmate-25994.firebaseapp.com",
  projectId: "myslotmate-25994",
  storageBucket: "myslotmate-25994.firebasestorage.app",
  messagingSenderId: "728491994800",
  appId: "1:728491994800:web:2082cf8ee638189b059575",
  measurementId: "G-3H7F86DQGQ",
};
// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
void setPersistence(auth, browserLocalPersistence);

export { app, auth };
