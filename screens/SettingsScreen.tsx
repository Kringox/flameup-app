import React, { useState, useEffect } from 'react';
import { User, AppTint } from '../types.ts';
import { auth, db } from '../firebaseConfig.ts';
import ManageSubscriptionScreen from './ManageSubscriptionScreen.tsx';
import WalletScreen from './WalletScreen.tsx';
import BestFriendsScreen from './BestFriendsScreen.tsx';
import AchievementsScreen from './AchievementsScreen.tsx';
import DeleteAccountModal from '../components/DeleteAccountModal.tsx';
import SecuritySettingsScreen from './SecuritySettingsScreen.tsx';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import ShieldCheckIcon from '../components/icons/ShieldCheckIcon.tsx';
import UsersIcon from '../components/icons/UsersIcon.tsx';
import { useI18n } from '../contexts/I18nContext.ts';
import PrivacySettingsScreen from './PrivacySettingsScreen.tsx';
import DailyBonusWheel from '../components/DailyBonusWheel.tsx';

type Language = 'en' | 'de';

interface SettingsScreenProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (user: User) => void;
  localTint: AppTint;
  setLocalTint: (tint: AppTint) => void;
}

const SettingsItem: React.FC<{ onClick: () => void, children: React.ReactNode, isDestructive?: boolean }> = ({ onClick, children, isDestructive }) => (
    <button 
        onClick={onClick} 
        className={`w-full text-left p-4 bg-zinc-900 rounded-lg shadow-sm font-semibold transition-colors border border-zinc-800 ${isDestructive ? 'text-error-red' : 'text-gray-200'}`}
    >
        {children}
    </button>
);

const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, onClose, onUpdateUser, localTint, setLocalTint }) => {
    const [activeSubScreen, setActiveSubScreen] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [showDailyBonus, setShowDailyBonus] = useState(false);
    const [bonusAvailable, setBonusAvailable] = useState(false);
    const { t } = useI18n();

    useEffect(() => {
        if (!user.lastDailyBonus) {
            setBonusAvailable(true);
        } else {
            const last = user.lastDailyBonus.toDate().getTime();
            const now = Date.now();
            setBonusAvailable(now - last > 24 * 60 * 60 * 1000);
        }
    }, [user.lastDailyBonus]);

    const handleLogout = () => {
        if (!auth) return;
        signOut(auth).catch(error => console.error("Error signing out: ", error));
    };

    const handleDeleteConfirm = () => {
        handleLogout();
    };

    const handleLanguageChange = async (lang: Language) => {
        if (!db) return;
        try {
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, { language: lang });
            onUpdateUser({ ...user, language: lang });
        } catch (error) {
            console.error("Error updating language:", error);
        }
    };

    const renderSubScreen = () => {
        switch(activeSubScreen) {
            case 'subscription': return <ManageSubscriptionScreen user={user} onClose={() => setActiveSubScreen(null)} />;
            case 'wallet': return <WalletScreen user={user} onClose={() => setActiveSubScreen(null)} onUpdateUser={onUpdateUser} />;
            case 'friends': return <BestFriendsScreen user={user} onClose={() => setActiveSubScreen(null)} />;
             case 'achievements': return <AchievementsScreen user={user} onClose={() => setActiveSubScreen(null)} />;
            case 'security': return <SecuritySettingsScreen onClose={() => setActiveSubScreen(null)} />;
            case 'privacy': return <PrivacySettingsScreen user={user} onUpdateUser={onUpdateUser} onClose={() => setActiveSubScreen(null)} />;
            default: return null;
        }
    };
    
    if (activeSubScreen) {
        return renderSubScreen();
    }

    return (
        <div className="absolute inset-0 bg-black z-[60] flex flex-col animate-slide-in">
             <style>{`.animate-slide-in { animation: slideInFromRight 0.3s ease-out; } @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            
             {isDeleteModalOpen && <DeleteAccountModal onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} />}
             {showDailyBonus && <DailyBonusWheel currentUser={user} onClose={() => setShowDailyBonus(false)} onUpdateUser={onUpdateUser} />}

            <header className="flex items-center p-4 border-b border-zinc-800 bg-zinc-900">
                 <button onClick={onClose} className="w-8 text-gray-200">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-center flex-1 text-gray-200">{t('settingsTitle')}</h1>
                <div className="w-8"></div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 bg-black">
                <div className="space-y-4">
                    
                    <button 
                        onClick={() => setShowDailyBonus(true)}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-zinc-800 to-black text-white rounded-xl shadow-lg border border-zinc-700 relative overflow-hidden group"
                    >
                        <div className="flex items-center relative z-10">
                            <div className="p-2 bg-white/10 rounded-full mr-3">
                                <span className="text-xl">🎁</span>
                            </div>
                            <div className="text-left">
                                <p className="font-bold">{t('dailyRewards')}</p>
                                <p className="text-xs text-gray-400">{bonusAvailable ? t('readyToClaim') : t('comeBackLater')}</p>
                            </div>
                        </div>
                        {bonusAvailable && <span className="relative z-10 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>}
                    </button>

                    <div className="p-4 bg-zinc-900 rounded-lg shadow-sm border border-zinc-800">
                        <h2 className="text-sm font-semibold text-gray-400 mb-3">{t('language')}</h2>
                        <div className="flex bg-zinc-800 rounded-lg p-1">
                            {(['de', 'en'] as Language[]).map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => handleLanguageChange(lang)}
                                    className={`flex-1 py-2 text-sm font-semibold rounded-md capitalize transition-colors ${(user.language || 'en') === lang ? 'bg-zinc-700 text-flame-orange shadow' : 'text-gray-400'}`}
                                >
                                    {lang === 'de' ? 'Deutsch' : 'English'}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <SettingsItem onClick={() => setActiveSubScreen('subscription')}>{t('manageSubscription')}</SettingsItem>
                    <SettingsItem onClick={() => setActiveSubScreen('wallet')}>{t('myWallet')}</SettingsItem>
                    <SettingsItem onClick={() => setActiveSubScreen('achievements')}>{t('achievements')}</SettingsItem>
                    <SettingsItem onClick={() => setActiveSubScreen('friends')}>{t('bestFriends')}</SettingsItem>
                    
                    <div className="p-4 bg-zinc-900 rounded-lg shadow-sm border border-zinc-800">
                         <h2 className="text-sm font-semibold text-gray-400 mb-2">{t('accountAndSecurity')}</h2>
                         <div className="space-y-2">
                            <button onClick={() => setActiveSubScreen('security')} className="w-full text-left font-semibold text-gray-200 flex items-center py-2">
                                <ShieldCheckIcon className="w-5 h-5 mr-3 text-gray-500" />
                                {t('securitySettings')}
                            </button>
                             <button onClick={() => setActiveSubScreen('privacy')} className="w-full text-left font-semibold text-gray-200 flex items-center py-2">
                                <ShieldCheckIcon className="w-5 h-5 mr-3 text-gray-500" />
                                {t('privacySettingsTitle')}
                            </button>
                            <button className="w-full text-left font-semibold text-gray-200 flex items-center py-2">
                                <UsersIcon className="w-5 h-5 mr-3 text-gray-500" />
                                {t('privacyPolicy')}
                            </button>
                         </div>
                    </div>
                    
                    <SettingsItem onClick={handleLogout} isDestructive>{t('logOut')}</SettingsItem>
                    <SettingsItem onClick={() => setIsDeleteModalOpen(true)} isDestructive>{t('deleteAccount')}</SettingsItem>
                </div>
            </main>
        </div>
    );
};

export default SettingsScreen;