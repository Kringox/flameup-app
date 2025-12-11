
// Import the functions you need from the SDKs you need
import * as firebaseApp from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import * as firebaseFirestore from "firebase/firestore";

let app: firebaseApp.FirebaseApp | null = null;
let auth: firebaseAuth.Auth | null = null;
let db: firebaseFirestore.Firestore | null = null;
let firebaseInitializationError: string | null = null;

try {
  // This is the required method for Vite-based environments like Vercel.
  const apiKey = (import.meta as any).env.VITE_API_KEY;

  if (!apiKey) {
    // This error will appear if the VITE_API_KEY is not set in the Vercel environment.
    firebaseInitializationError = 'Configuration error: The Firebase API key is missing. Please ensure the VITE_API_KEY environment variable is set correctly.';
  } else {
    const firebaseConfig = {
      apiKey: apiKey,
      authDomain: "flameup-9943c.firebaseapp.com",
      projectId: "flameup-9943c",
      storageBucket: "flameup-9943c.appspot.com",
      messagingSenderId: "761875503649",
      appId: "1:761875503649:web:1fd92a97ef5d3b02a62160",
      measurementId: "G-L9F6XNW862"
    };

    app = firebaseApp.initializeApp(firebaseConfig);
    auth = firebaseAuth.getAuth(app);
    db = firebaseFirestore.getFirestore(app);
  }
} catch (e) {
  // This catch block handles the error when 'import.meta.env' is not available,
  // which is expected in this non-Vite preview environment.
  firebaseInitializationError = 'Configuration error: This preview environment cannot access Vite variables (VITE_API_KEY). Your app should work correctly when deployed to Vercel.';
  console.error("Could not initialize Firebase, likely due to environment limitations:", e);
}


// Export the services you need
export { auth, db, firebaseInitializationError };
