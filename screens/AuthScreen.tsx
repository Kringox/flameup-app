import React, { useState } from 'react';
import FlameIcon from '../components/icons/FlameIcon';
import { auth } from '../firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  AuthError
} from 'firebase/auth';

const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFirebaseError = (err: AuthError) => {
    console.error("Firebase Auth Error:", err); // Keep detailed log for developers
    switch (err.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        setError('Invalid email or password.');
        break;
      case 'auth/email-already-in-use':
        setError('An account with this email already exists.');
        break;
      case 'auth/weak-password':
        setError('Password should be at least 6 characters.');
        break;
      case 'auth/api-key-not-valid':
        setError('Configuration error: The API key is invalid. Please check your environment variables and ensure the correct Firebase API key is provided.');
        break;
      default:
        setError('An unexpected error occurred. Please try again.');
        break;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
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
          <FlameIcon isGradient={true} className="w-16 h-16" />
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-flame-orange to-flame-red mt-2">
            FlameUp
          </h1>
          <p className="text-gray-500 mt-1">Find your spark.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex border-b mb-6">
            <button 
              onClick={() => { setIsLogin(true); setError(''); }} 
              className={`flex-1 py-2 text-center font-semibold transition-colors ${isLogin ? 'text-flame-orange border-b-2 border-flame-orange' : 'text-gray-500'}`}
            >
              Login
            </button>
            <button 
              onClick={() => { setIsLogin(false); setError(''); }} 
              className={`flex-1 py-2 text-center font-semibold transition-colors ${!isLogin ? 'text-flame-orange border-b-2 border-flame-orange' : 'text-gray-500'}`}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {!isLogin && (
                <input 
                  type="password" 
                  placeholder="Confirm Password" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              )}
            </div>
            
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-3 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-lg shadow-lg transform hover:scale-105 transition-transform disabled:opacity-75"
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Log In' : 'Create Account')}
            </button>

            {isLogin && (
              <a href="#" className="block text-center text-sm text-gray-500 mt-4 hover:text-flame-orange">
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
            <button className="w-full flex items-center justify-center py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" className="w-5 h-5 mr-3" alt="Google" />
              <span className="font-semibold text-gray-700">Continue with Google</span>
            </button>
             <button className="w-full flex items-center justify-center py-3 border bg-[#1877F2] text-white rounded-lg hover:bg-[#166eeb] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0 0 3.603 0 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/></svg>
              <span className="font-semibold">Continue with Facebook</span>
            </button>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-400 mt-6">
          By continuing, you agree to our <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>.
        </p>
        <p className="text-center text-xs text-gray-400 mt-2">v1.5 - Config Fix</p>
      </div>
    </div>
  );
};

export default AuthScreen;