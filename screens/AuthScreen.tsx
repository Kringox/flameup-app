import React, { useState } from 'react';
import FlameIcon from '../components/icons/FlameIcon';

interface AuthScreenProps {
  onAuthSuccess: (action: 'login' | 'signup') => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAuthSuccess(isLogin ? 'login' : 'signup');
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
              onClick={() => setIsLogin(true)} 
              className={`flex-1 py-2 text-center font-semibold transition-colors ${isLogin ? 'text-flame-orange border-b-2 border-flame-orange' : 'text-gray-500'}`}
            >
              Login
            </button>
            <button 
              onClick={() => setIsLogin(false)} 
              className={`flex-1 py-2 text-center font-semibold transition-colors ${!isLogin ? 'text-flame-orange border-b-2 border-flame-orange' : 'text-gray-500'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <input 
                type="email" 
                placeholder="Email Address" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange" 
                required
              />
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange" 
                required
              />
              {!isLogin && (
                <input 
                  type="password" 
                  placeholder="Confirm Password" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange"
                  required
                />
              )}
            </div>
            
            <button 
              type="submit"
              className="w-full mt-6 py-3 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-lg shadow-lg transform hover:scale-105 transition-transform"
            >
              {isLogin ? 'Log In' : 'Create Account'}
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
            {/* Social Login Buttons - Add onClick handlers for real implementation */}
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
      </div>
    </div>
  );
};

export default AuthScreen;