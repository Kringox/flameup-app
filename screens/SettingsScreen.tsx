import React, { useState } from 'react';

interface SettingsScreenProps {
  onClose: () => void;
  onLogout: () => void;
}

const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h2 className="text-sm font-semibold text-gray-500 uppercase px-4 mb-2">{title}</h2>
    <div className="bg-white border-t border-b border-gray-200">
      {children}
    </div>
  </div>
);

const SettingsItem: React.FC<{ onClick?: () => void; children: React.ReactNode; isButton?: boolean }> = ({ onClick, children, isButton = false }) => {
  const baseClasses = "flex items-center justify-between p-4 text-left w-full";
  const interactiveClasses = "active:bg-gray-100";
  const buttonClasses = isButton ? `${baseClasses} ${interactiveClasses}` : baseClasses;
  
  return (
    <button onClick={onClick} className={`${buttonClasses} border-t border-gray-200 first:border-t-0`}>
        {children}
    </button>
  );
};


const ToggleSwitch: React.FC<{ enabled: boolean; onToggle: (enabled: boolean) => void }> = ({ enabled, onToggle }) => {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 ease-in-out focus:outline-none ${enabled ? 'bg-flame-orange' : 'bg-gray-300'}`}
    >
      <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ease-in-out ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
};

const ChevronRightIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);


const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose, onLogout }) => {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center p-4 border-b border-gray-200 bg-white flex-shrink-0 sticky top-0">
        <button onClick={onClose} className="text-lg text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-dark-gray text-center flex-1">Settings</h1>
        <div className="w-6"></div> {/* Spacer for centering title */}
      </header>
      
      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto pt-6">
        <SettingsSection title="Account">
          <SettingsItem isButton>
            <span className="text-lg">Account Details</span>
            <ChevronRightIcon />
          </SettingsItem>
          <SettingsItem isButton>
            <span className="text-lg">Payment Methods</span>
            <ChevronRightIcon />
          </SettingsItem>
        </SettingsSection>

        <SettingsSection title="Preferences">
            <SettingsItem>
                <span className="text-lg">Notifications</span>
                <ToggleSwitch enabled={notificationsEnabled} onToggle={setNotificationsEnabled} />
            </SettingsItem>
             <SettingsItem isButton>
                <span className="text-lg">Privacy</span>
                <ChevronRightIcon />
            </SettingsItem>
        </SettingsSection>

        <SettingsSection title="Subscription">
            <SettingsItem isButton>
                <div className="flex items-center">
                    <span className="text-lg">Manage FlameUp+</span>
                    <span className="ml-2 text-xs font-bold bg-premium-gold text-white px-2 py-0.5 rounded-full">PREMIUM</span>
                </div>
                <ChevronRightIcon />
{/* FIX: Correctly closed the SettingsItem tag to fix the JSX syntax error. */}
            </SettingsItem>
        </SettingsSection>

        <div className="p-4">
            <button onClick={onLogout} className="w-full text-center text-error-red font-semibold py-3 bg-white border border-gray-200 rounded-lg active:bg-gray-100">
                Log Out
            </button>
        </div>
      </div>
    </div>
  );
};

// FIX: Added missing default export.
export default SettingsScreen;
