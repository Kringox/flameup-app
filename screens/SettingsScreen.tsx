import React, { useState } from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';
import { auth } from '../firebaseConfig.ts';
// FIX: Added file extensions to screen imports
import ManageSubscriptionScreen from './ManageSubscriptionScreen.tsx';
import WalletScreen from './WalletScreen.tsx';
import BestFriendsScreen from './BestFriendsScreen.tsx';
import AchievementsScreen from './AchievementsScreen.tsx';
import DeleteAccountModal from '../components/DeleteAccountModal.tsx';
import SecuritySettingsScreen from './SecuritySettingsScreen.tsx';
import { signOut } from 'firebase/auth';
import SunIcon from '../components/icons/SunIcon.tsx';
import MoonIcon from '../components/icons/MoonIcon.tsx';
import DesktopIcon from '../components/icons/DesktopIcon.tsx';
import ShieldCheckIcon from '../components/icons/ShieldCheckIcon.tsx';
// FIX: Import missing UsersIcon component
import UsersIcon from '../components/icons/UsersIcon.tsx';

type Theme = 'light' | 'dark' | 'system';

interface SettingsScreenProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (user: User) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const SettingsItem: React.FC<{ onClick: () => void, children: React.ReactNode, isDestructive?: boolean }> = ({ onClick, children, isDestructive }) => (
    <button 
        onClick={onClick} 
        className={`w-full text-left p-4 bg-white dark:bg-zinc-800 rounded-lg shadow-sm font-semibold transition-colors ${isDestructive ? 'text-error-red' : 'text-dark-gray dark:text-gray-200'}`}
    >
        {children}
    </button>
);

const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, onClose, onUpdateUser, theme, setTheme }) => {
    const [activeSubScreen, setActiveSubScreen] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleLogout = () => {
        if (!auth) return;
        signOut(auth).catch(error => console.error("Error signing out: ", error));
    };

    const handleDeleteConfirm = () => {
        console.log("Account deletion initiated for user:", user.id);
        // Here you would call a backend function to delete user data
        handleLogout();
    };

    const renderSubScreen = () => {
        switch(activeSubScreen) {
            case 'subscription':
                return <ManageSubscriptionScreen user={user} onClose={() => setActiveSubScreen(null)} />;
            case 'wallet':
                return <WalletScreen user={user} onClose={() => setActiveSubScreen(null)} onUpdateUser={onUpdateUser} />;
            case 'friends':
                return <BestFriendsScreen user={user} onClose={() => setActiveSubScreen(null)} />;
             case 'achievements':
                return <AchievementsScreen user={user} onClose={() => setActiveSubScreen(null)} />;
            case 'security':
                return <SecuritySettingsScreen onClose={() => setActiveSubScreen(null)} />;
            default:
                return null;
        }
    };
    
    if (activeSubScreen) {
        return renderSubScreen();
    }

    return (
        <div className="absolute inset-0 bg-gray-100 dark:bg-black z-[60] flex flex-col animate-slide-in">
             <style>{`.animate-slide-in { animation: slideInFromRight 0.3s ease-out; } @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            
             {isDeleteModalOpen && <DeleteAccountModal onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} />}

            <header className="flex items-center p-4 border-b dark:border-gray-800 bg-white dark:bg-zinc-900">
                 <button onClick={onClose} className="w-8 text-dark-gray dark:text-gray-200">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-center flex-1 text-dark-gray dark:text-gray-200">Settings</h1>
                <div className="w-8"></div>
            </header>

            <main className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                    <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Appearance</h2>
                        <div className="flex bg-gray-200 dark:bg-zinc-700 rounded-lg p-1">
                            {(['light', 'dark', 'system'] as Theme[]).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTheme(t)}
                                    className={`flex-1 py-2 text-sm font-semibold rounded-md capitalize flex items-center justify-center transition-colors ${theme === t ? 'bg-white dark:bg-zinc-900 shadow text-flame-orange' : 'text-gray-600 dark:text-gray-300'}`}
                                >
                                    {t === 'light' && <SunIcon className="w-4 h-4 mr-1.5" />}
                                    {t === 'dark' && <MoonIcon className="w-4 h-4 mr-1.5" />}
                                    {t === 'system' && <DesktopIcon className="w-4 h-4 mr-1.5" />}
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <SettingsItem onClick={() => setActiveSubScreen('subscription')}>Manage Subscription</SettingsItem>
                    <SettingsItem onClick={() => setActiveSubScreen('wallet')}>My Wallet</SettingsItem>
                    <SettingsItem onClick={() => setActiveSubScreen('achievements')}>Achievements</SettingsItem>
                    <SettingsItem onClick={() => setActiveSubScreen('friends')}>Best Friends</SettingsItem>
                    
                    <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                         <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Account & Security</h2>
                         <div className="space-y-2">
                            <button onClick={() => setActiveSubScreen('security')} className="w-full text-left font-semibold text-dark-gray dark:text-gray-200 flex items-center py-2">
                                <ShieldCheckIcon className="w-5 h-5 mr-3 text-gray-500" />
                                Security Settings
                            </button>
                            <button className="w-full text-left font-semibold text-dark-gray dark:text-gray-200 flex items-center py-2">
                                <UsersIcon className="w-5 h-5 mr-3 text-gray-500" />
                                Privacy Policy
                            </button>
                         </div>
                    </div>
                    
                    <SettingsItem onClick={handleLogout} isDestructive>Log Out</SettingsItem>
                    <SettingsItem onClick={() => setIsDeleteModalOpen(true)} isDestructive>Delete Account</SettingsItem>
                </div>
            </main>
        </div>
    );
};

export default SettingsScreen;