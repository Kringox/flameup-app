import React from 'react';
import { isWebAuthnSupported } from '../utils/webauthnUtils.ts';
import FingerprintIcon from '../components/icons/FingerprintIcon.tsx';

interface SecuritySettingsScreenProps {
  onClose: () => void;
}

const SecuritySettingsScreen: React.FC<SecuritySettingsScreenProps> = ({ onClose }) => {
  const webAuthnSupported = isWebAuthnSupported();

  return (
    <div className="absolute inset-0 bg-gray-100 dark:bg-black z-[80] flex flex-col animate-slide-in">
      <style>{`.animate-slide-in { animation: slideInFromRight 0.3s ease-out; } @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
      <header className="flex items-center p-4 border-b dark:border-gray-800 bg-white dark:bg-zinc-900">
        <button onClick={onClose} className="w-8 text-dark-gray dark:text-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-center flex-1 text-dark-gray dark:text-gray-200">Security</h1>
        <div className="w-8"></div>
      </header>
      <main className="flex-1 p-4">
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-bold mb-4 dark:text-gray-200">Login Methods</h2>
            
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <FingerprintIcon className="w-6 h-6 mr-3 text-gray-500"/>
                    <div>
                        <p className="font-semibold dark:text-gray-200">Biometric Login</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {webAuthnSupported ? 'Use Face ID or Touch ID to log in.' : 'Not supported on this device.'}
                        </p>
                    </div>
                </div>
                 <button 
                    disabled={!webAuthnSupported} 
                    className="px-4 py-1.5 bg-flame-orange text-white text-sm font-semibold rounded-full disabled:bg-gray-300 dark:disabled:bg-zinc-600 disabled:cursor-not-allowed"
                >
                    Set Up
                </button>
            </div>
        </div>
      </main>
    </div>
  );
};

export default SecuritySettingsScreen;
