import React, { useState } from 'react';
import { auth } from '../firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  AuthError
} from 'firebase/auth';

interface AuthScreenProps {
  preloadedError?: string;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ preloadedError }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(preloadedError || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleFirebaseError = (err: AuthError) => {
    console.error("Firebase Auth Error:", err); // Keep detailed log for developers
    switch (err.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        setError('Invalid email or password. Please check your credentials and try again.');
        break;
      case 'auth/invalid-email':
        setError('The email address is not valid. Please enter a correct email.');
        break;
      case 'auth/email-already-in-use':
        setError('An account with this email already exists. Please try to log in.');
        break;
      case 'auth/weak-password':
        setError('Password is too weak. It should be at least 6 characters long.');
        break;
      case 'auth/operation-not-allowed':
        setError('Email/Password sign-in is not enabled. Please enable it in your Firebase project console.');
        break;
      case 'auth/api-key-not-valid':
        setError('Configuration error: The Firebase API key is invalid. Please ensure the VITE_API_KEY environment variable is set correctly.');
        break;
      default:
        setError(`An unexpected error occurred: ${err.code}. Please try again.`);
        break;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preloadedError) return; // Don't submit if there's an init error

    setError('');
    setIsLoading(true);

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (!auth) {
        setError(preloadedError || 'Firebase is not configured correctly.');
        setIsLoading(false);
        return;
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // On success, the onAuthStateChanged listener in App.tsx will handle navigation.
    } catch (err) {
      handleFirebaseError(err as AuthError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center bg-gray-100 p-4">
      <div className="w-full max-w-sm mx-auto">
        <div className="flex flex-col items-center mb-8">
          <img src="/assets/logo-complete.png" alt="FlameUp Logo" className="w-48 h-auto" />
          <p className="text-gray-500 mt-1">Find your spark.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex border-b mb-6">
            <button 
              onClick={() => { if (!preloadedError) { setIsLogin(true); setError(''); } }} 
              className={`flex-1 py-2 text-center font-semibold transition-colors ${isLogin ? 'text-flame-orange border-b-2 border-flame-orange' : 'text-gray-500'} ${preloadedError ? 'cursor-not-allowed' : ''}`}
            >
              Login
            </button>
            <button 
              onClick={() => { if (!preloadedError) { setIsLogin(false); setError(''); } }} 
              className={`flex-1 py-2 text-center font-semibold transition-colors ${!isLogin ? 'text-flame-orange border-b-2 border-flame-orange' : 'text-gray-500'} ${preloadedError ? 'cursor-not-allowed' : ''}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <p className="text-error-red text-sm text-center mb-4">{error}</p>}
            <div className="space-y-4">
              <input 
                type="email" 
                placeholder="Email Address" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange disabled:bg-gray-200" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!preloadedError}
              />
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange disabled:bg-gray-200" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!!preloadedError}
              />
              {!isLogin && (
                <input 
                  type="password" 
                  placeholder="Confirm Password" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange disabled:bg-gray-200"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={!!preloadedError}
                />
              )}
            </div>
            
            <button 
              type="submit"
              disabled={isLoading || !!preloadedError}
              className="w-full mt-6 py-3 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-lg shadow-lg transform hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Log In' : 'Create Account')}
            </button>

            {isLogin && (
              <a href="#" className={`block text-center text-sm text-gray-500 mt-4 hover:text-flame-orange ${preloadedError ? 'pointer-events-none' : ''}`}>
                Forgot Password?
              </a>
            )}
          </form>

          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <div className="space-y-3">
            <button disabled={!!preloadedError} className="w-full flex items-center justify-center py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" className="w-5 h-5 mr-3" alt="Google" />
              <span className="font-semibold text-gray-700">Continue with Google</span>
            </button>
             <button disabled={!!preloadedError} className="w-full flex items-center justify-center py-3 border bg-[#1877F2] text-white rounded-lg hover:bg-[#166eeb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0 0 3.603 0 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/></svg>
              <span className="font-semibold">Continue with Facebook</span>
            </button>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-400 mt-6">
          By continuing, you agree to our <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>.
        </p>
        <p className="text-center text-xs text-gray-400 mt-2">v2.0 - Match & Gifting Update</p>
      </div>
    </div>
  );
};

export default AuthScreen;