// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// User's Firebase configuration using environment variables for security
const firebaseConfig = {
  apiKey: process.env.API_KEY,
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

// Only initialize Firebase if the API key is provided
// This prevents the app from crashing with a blank screen on a missing key
if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    console.error("CRITICAL: Firebase API Key is not configured. The app will not function.");
}


// Export the services you need
export { auth, db };