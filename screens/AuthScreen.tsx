
import React, { useState } from 'react';
import { auth } from '../firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  AuthError,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import FlameIcon from '../components/icons/FlameIcon.tsx';

interface AuthScreenProps {
  preloadedError?: string;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ preloadedError }) => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(preloadedError || '');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // FIX: Cast error to 'any' to access the 'code' property, which is present on Firebase auth errors but may not be correctly typed.
  const handleFirebaseError = (err: any) => {
    console.error("Firebase Auth Error:", err);
    switch (err.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        setError('Invalid email or password.');
        break;
      case 'auth/invalid-email':
        setError('Invalid email address.');
        break;
      case 'auth/email-already-in-use':
        setError('Account already exists. Try logging in.');
        break;
      case 'auth/weak-password':
        setError('Password should be at least 6 characters.');
        break;
      default:
        setError('An error occurred. Please try again.');
        break;
    }
  }

  const handleAuthAction = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (view === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (!auth) {
        setError(preloadedError || 'Firebase not configured.');
        setIsLoading(false);
        return;
    }

    try {
      // Set persistence before signing in
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

      if (view === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      handleFirebaseError(err as AuthError);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
        setError("Please enter your email address.");
        return;
    }
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!auth) {
        setError(preloadedError || 'Firebase not configured.');
        setIsLoading(false);
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        setSuccess("Password reset email sent! Check your inbox.");
    } catch(err) {
        handleFirebaseError(err as AuthError);
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (preloadedError) return;

    if (view === 'forgot') {
        handlePasswordReset();
    } else {
        handleAuthAction();
    }
  }

  const switchView = (newView: 'login' | 'signup' | 'forgot') => {
    if (preloadedError) return;
    setView(newView);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  }

  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-flame-orange/20 rounded-full blur-[120px] pointer-events-none opacity-60 animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-flame-red/20 rounded-full blur-[120px] pointer-events-none opacity-60 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-sm mx-auto z-10 p-4">
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
             <div className="absolute inset-0 bg-flame-orange/30 rounded-full blur-xl animate-pulse"></div>
             <FlameIcon isGradient className="w-20 h-20 drop-shadow-[0_0_15px_rgba(255,107,53,0.6)]" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-1">FLAMEUP</h1>
          <p className="text-gray-400 font-medium tracking-wide text-sm">Find your spark.</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 animate-slide-in-right">
          {view !== 'forgot' && (
            <div className="flex p-1 bg-black/20 rounded-xl mb-6">
                <button 
                onClick={() => switchView('login')} 
                className={`flex-1 py-2.5 text-center text-sm font-bold rounded-lg transition-all duration-300 ${view === 'login' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                Login
                </button>
                <button 
                onClick={() => switchView('signup')} 
                className={`flex-1 py-2.5 text-center text-sm font-bold rounded-lg transition-all duration-300 ${view === 'signup' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                Sign Up
                </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-xs p-3 rounded-lg text-center font-medium">{error}</div>}
            {success && <div className="bg-green-500/20 border border-green-500/50 text-green-200 text-xs p-3 rounded-lg text-center font-medium">{success}</div>}
            
            <div className="space-y-3">
              <input 
                type="email" 
                placeholder="Email" 
                className="w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flame-orange/50 focus:border-transparent transition-all"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!preloadedError}
              />
              {view !== 'forgot' && (
                <input 
                    type="password" 
                    placeholder="Password" 
                    className="w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flame-orange/50 focus:border-transparent transition-all"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={!!preloadedError}
                />
              )}
              {view === 'signup' && (
                <input 
                  type="password" 
                  placeholder="Confirm Password" 
                  className="w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flame-orange/50 focus:border-transparent transition-all"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={!!preloadedError}
                />
              )}
            </div>

            {view !== 'forgot' && (
                <div className="flex items-center mt-2 px-1">
                    <input
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-500 text-flame-orange focus:ring-flame-orange bg-black/20 cursor-pointer"
                    />
                    <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-400 cursor-pointer select-none">
                        Stay signed in
                    </label>
                </div>
            )}
            
            <button 
              type="submit"
              disabled={isLoading || !!preloadedError}
              className="w-full mt-4 py-3.5 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold text-lg rounded-xl shadow-[0_10px_20px_-10px_rgba(255,107,53,0.5)] hover:shadow-[0_15px_25px_-10px_rgba(255,107,53,0.6)] transform hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                  <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                  </span>
              ) : (view === 'login' ? 'Log In' : (view === 'signup' ? 'Create Account' : 'Send Reset Link'))}
            </button>

            {view === 'login' && (
              <button type="button" onClick={() => switchView('forgot')} className="w-full text-center text-xs text-gray-400 mt-4 hover:text-white transition-colors">
                Forgot Password?
              </button>
            )}
            {view === 'forgot' && (
              <button type="button" onClick={() => switchView('login')} className="w-full text-center text-xs text-gray-400 mt-4 hover:text-white transition-colors">
                Back to Login
              </button>
            )}
          </form>
        </div>
        
        <p className="text-center text-[10px] text-gray-600 mt-8 font-medium uppercase tracking-widest">
          FlameUp © 2024
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
