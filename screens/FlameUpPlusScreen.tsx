import React from 'react';
import { useI18n } from '../contexts/I18nContext.ts';
import SparklesIcon from '../components/icons/SparklesIcon.tsx';
import CheckmarkIcon from '../components/icons/CheckmarkIcon.tsx';

interface FlameUpPlusScreenProps {
  onClose: () => void;
}

const BenefitItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center">
        <CheckmarkIcon className="w-5 h-5 text-green-400 mr-3" />
        <span className="text-gray-300">{children}</span>
    </div>
);

const FlameUpPlusScreen: React.FC<FlameUpPlusScreenProps> = ({ onClose }) => {
    const { t } = useI18n();

    return (
        <div className="absolute inset-0 bg-black z-[80] flex flex-col animate-slide-in">
            <header className="flex items-center p-4 border-b border-zinc-800 bg-zinc-900">
                <button onClick={onClose} className="w-8 text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-center flex-1 text-gray-200">{t('flameUpPlus')}</h1>
                <div className="w-8"></div>
            </header>
            <main className="flex-1 p-6 overflow-y-auto text-center">
                <SparklesIcon className="w-16 h-16 text-premium-gold mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">{t('flameUpPlusTitle')}</h2>
                <p className="text-gray-400 mb-8">{t('flameUpPlusDescription')}</p>

                <div className="bg-zinc-900 rounded-xl p-6 space-y-4 text-left border border-zinc-800">
                    <BenefitItem>{t('benefitUnlimitedSwipes')}</BenefitItem>
                    <BenefitItem>{t('benefitTenSuperLikes')}</BenefitItem>
                    <BenefitItem>{t('benefitSeeLikes')}</BenefitItem>
                    <BenefitItem>{t('benefitAdvancedFilters')}</BenefitItem>
                    <BenefitItem>{t('benefitInsights')}</BenefitItem>
                </div>

                <button className="w-full mt-8 py-4 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-xl shadow-lg text-lg">
                    {t('upgradeNow')}
                </button>
            </main>
        </div>
    );
};

export default FlameUpPlusScreen;
