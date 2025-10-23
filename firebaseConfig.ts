// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// User's Firebase configuration using Vite's standard environment variables for security.
const firebaseConfig = {
  // Use // @ts-ignore to bypass TypeScript errors in environments where Vite's
  // client types might not be automatically recognized. This allows Vite's static
  // replacement of environment variables to work correctly at build time.
  // @ts-ignore
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "flameup-9943c.firebaseapp.com",
  projectId: "flameup-9943c",
  storageBucket: "flameup-9943c.appspot.com",
  messagingSenderId: "761875503649",
  appId: "1:761875503649:web:1fd92a97ef5d3b02a62160",
  measurementId: "G-L9F6XNW862"
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseInitializationError: string | null = null;

if (!firebaseConfig.apiKey) {
    firebaseInitializationError = 'Configuration error: The Firebase API key is missing. Please ensure the VITE_API_KEY environment variable is set correctly.';
} else {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        if (error instanceof Error && error.message.includes('auth/api-key-not-valid')) {
            firebaseInitializationError = 'Configuration error: The Firebase API key is invalid. Please ensure the VITE_API_KEY environment variable is set correctly.';
        } else if (error instanceof Error) {
             firebaseInitializationError = `Firebase initialization failed: ${error.message}. Check your project configuration.`;
        } else {
             firebaseInitializationError = 'An unknown error occurred during Firebase initialization.';
        }
    }
}


// Export the services you need
export { auth, db, firebaseInitializationError };