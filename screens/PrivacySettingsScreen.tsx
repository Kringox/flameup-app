import React, { useState } from 'react';
import { User } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { doc, updateDoc } from 'firebase/firestore';
import { useI18n } from '../contexts/I18nContext.ts';
import SparklesIcon from '../components/icons/SparklesIcon.tsx';

interface PrivacySettingsScreenProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (user: User) => void;
}

const PrivacyToggle: React.FC<{ label: string; enabled: boolean; onToggle: (enabled: boolean) => void; isPremiumFeature?: boolean; isPremiumUser?: boolean; }> = ({ label, enabled, onToggle, isPremiumFeature = false, isPremiumUser = false }) => {
    const canToggle = !isPremiumFeature || isPremiumUser;
    
    return (
        <div className="flex items-center justify-between py-3">
            <div className="flex items-center">
                 <span className={`font-semibold ${!canToggle ? 'text-gray-400 dark:text-gray-500' : 'text-dark-gray dark:text-gray-200'}`}>{label}</span>
                 {isPremiumFeature && !isPremiumUser && (
                     <span className="ml-2 flex items-center text-xs font-semibold bg-premium-gold/20 text-premium-gold px-2 py-0.5 rounded-full">
                         <SparklesIcon className="w-3 h-3 mr-1" />
                         Premium
                     </span>
                 )}
            </div>
            <button
                onClick={() => canToggle && onToggle(!enabled)}
                disabled={!canToggle}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-flame-orange' : 'bg-gray-300 dark:bg-zinc-600'} ${!canToggle ? 'cursor-not-allowed' : ''}`}
            >
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );
};

const PrivacySettingsScreen: React.FC<PrivacySettingsScreenProps> = ({ user, onClose, onUpdateUser }) => {
  const { t } = useI18n();
  const [settings, setSettings] = useState(user.privacySettings || {
      showTyping: true,
      sendReadReceipts: true,
      showLastOnline: true,
  });

  const handleToggle = async (key: keyof typeof settings, value: boolean) => {
    if (!db) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { privacySettings: newSettings });
        onUpdateUser({ ...user, privacySettings: newSettings });
    } catch (error) {
        console.error("Error updating privacy settings:", error);
        // Revert on error
        setSettings(settings);
    }
  };

  return (
    <div className="absolute inset-0 bg-gray-100 dark:bg-black z-[80] flex flex-col animate-slide-in">
      <header className="flex items-center p-4 border-b dark:border-gray-800 bg-white dark:bg-zinc-900">
        <button onClick={onClose} className="w-8 text-dark-gray dark:text-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-center flex-1 text-dark-gray dark:text-gray-200">{t('privacySettingsTitle')}</h1>
        <div className="w-8"></div>
      </header>
      <main className="flex-1 p-4">
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm divide-y dark:divide-zinc-700">
            <PrivacyToggle 
                label={t('showTypingIndicator')}
                enabled={settings.showTyping}
                onToggle={(val) => handleToggle('showTyping', val)}
                isPremiumFeature={true}
                isPremiumUser={user.isPremium}
            />
            <PrivacyToggle 
                label={t('sendReadReceipts')}
                enabled={settings.sendReadReceipts}
                onToggle={(val) => handleToggle('sendReadReceipts', val)}
                isPremiumFeature={true}
                isPremiumUser={user.isPremium}
            />
            <PrivacyToggle 
                label={t('showLastOnline')}
                enabled={settings.showLastOnline}
                onToggle={(val) => handleToggle('showLastOnline', val)}
            />
        </div>
      </main>
    </div>
  );
};

export default PrivacySettingsScreen;
