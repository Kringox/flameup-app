import React, { useState } from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';
import { auth } from '../firebaseConfig';
// FIX: Added file extensions to screen imports
import ManageSubscriptionScreen from './ManageSubscriptionScreen.tsx';
import WalletScreen from './WalletScreen.tsx';
import BestFriendsScreen from './BestFriendsScreen.tsx';
import AchievementsScreen from './AchievementsScreen.tsx';
import DeleteAccountModal from '../components/DeleteAccountModal.tsx';
import { signOut } from 'firebase/auth';

interface SettingsScreenProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (user: User) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, onClose, onUpdateUser }) => {
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
            default:
                return null;
        }
    };
    
    if (activeSubScreen) {
        return renderSubScreen();
    }

    return (
        <div className="absolute inset-0 bg-gray-100 z-[60] flex flex-col animate-slide-in">
             <style>{`.animate-slide-in { animation: slideInFromRight 0.3s ease-out; } @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            
             {isDeleteModalOpen && <DeleteAccountModal onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} />}

            <header className="flex items-center p-4 border-b bg-white">
                 <button onClick={onClose} className="w-8">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-center flex-1">Settings</h1>
                <div className="w-8"></div>
            </header>

            <main className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                    <button onClick={() => setActiveSubScreen('subscription')} className="w-full text-left p-4 bg-white rounded-lg shadow-sm">Manage Subscription</button>
                    <button onClick={() => setActiveSubScreen('wallet')} className="w-full text-left p-4 bg-white rounded-lg shadow-sm">My Wallet</button>
                     <button onClick={() => setActiveSubScreen('achievements')} className="w-full text-left p-4 bg-white rounded-lg shadow-sm">Achievements</button>
                    <button onClick={() => setActiveSubScreen('friends')} className="w-full text-left p-4 bg-white rounded-lg shadow-sm">Best Friends</button>
                    <button className="w-full text-left p-4 bg-white rounded-lg shadow-sm">Privacy Policy</button>
                    <button onClick={handleLogout} className="w-full text-left p-4 bg-white rounded-lg shadow-sm font-semibold text-flame-orange">Log Out</button>
                    <button onClick={() => setIsDeleteModalOpen(true)} className="w-full text-left p-4 bg-white rounded-lg shadow-sm font-semibold text-error-red">Delete Account</button>
                </div>
            </main>
        </div>
    );
};

export default SettingsScreen;
