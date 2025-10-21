// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// User's actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBVCiqergILFNRfNpAyW3Cf0NOlIsvIdj0",
  authDomain: "flameup-9943c.firebaseapp.com",
  projectId: "flameup-9943c",
  storageBucket: "flameup-9943c.firebasestorage.app",
  messagingSenderId: "761875503649",
  appId: "1:761875503649:web:1fd92a97ef5d3b02a62160",
  measurementId: "G-L9F6XNW862"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services you need
export const auth = getAuth(app);
export const db = getFirestore(app);
