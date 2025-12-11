
import React, { useState } from 'react';
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
    const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');
    const [isProcessing, setIsProcessing] = useState(false);
    const [subscribed, setSubscribed] = useState(false);

    const handleUpgrade = () => {
        setIsProcessing(true);
        // Simulate payment process
        setTimeout(() => {
            setIsProcessing(false);
            setSubscribed(true);
            alert("Welcome to FlameUp+! Your subscription is active.");
        }, 2000);
    };

    const handleCancel = () => {
        if(window.confirm("Are you sure you want to cancel your FlameUp+ subscription? You will lose all benefits at the end of the billing period.")) {
            setSubscribed(false);
            alert("Subscription cancelled.");
        }
    }

    if (subscribed) {
        return (
            <div className="absolute inset-0 bg-black z-[80] flex flex-col animate-slide-in">
                <header className="flex items-center p-4 border-b border-zinc-800 bg-zinc-900">
                    <button onClick={onClose} className="w-8 text-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-xl font-bold text-center flex-1 text-gray-200">FlameUp+ Active</h1>
                    <div className="w-8"></div>
                </header>
                <main className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                    <SparklesIcon className="w-24 h-24 text-premium-gold mb-6 animate-pulse" />
                    <h2 className="text-3xl font-bold text-white mb-2">You are a Premium Member!</h2>
                    <p className="text-gray-400 mb-8">Enjoy unlimited swipes, superlikes, and more.</p>
                    
                    <button onClick={handleCancel} className="text-red-500 font-bold underline mt-8">
                        Cancel Subscription
                    </button>
                </main>
            </div>
        )
    }

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

                <div className="bg-zinc-900 rounded-xl p-6 space-y-4 text-left border border-zinc-800 mb-8">
                    <BenefitItem>{t('benefitUnlimitedSwipes')}</BenefitItem>
                    <BenefitItem>{t('benefitTenSuperLikes')}</BenefitItem>
                    <BenefitItem>{t('benefitSeeLikes')}</BenefitItem>
                    <BenefitItem>{t('benefitAdvancedFilters')}</BenefitItem>
                    <BenefitItem>{t('benefitInsights')}</BenefitItem>
                </div>

                <div className="flex gap-4 mb-8">
                    <button 
                        onClick={() => setPlan('monthly')}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${plan === 'monthly' ? 'border-flame-orange bg-flame-orange/10' : 'border-zinc-700 bg-zinc-800 opacity-60'}`}
                    >
                        <p className="text-gray-400 text-sm">Monthly</p>
                        <p className="text-xl font-bold text-white">€9.99</p>
                    </button>
                    <button 
                        onClick={() => setPlan('yearly')}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all relative ${plan === 'yearly' ? 'border-flame-orange bg-flame-orange/10' : 'border-zinc-700 bg-zinc-800 opacity-60'}`}
                    >
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-flame-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-full">BEST VALUE</div>
                        <p className="text-gray-400 text-sm">Yearly</p>
                        <p className="text-xl font-bold text-white">€99.99</p>
                        <p className="text-xs text-green-400">Save 20%</p>
                    </button>
                </div>

                <button 
                    onClick={handleUpgrade}
                    disabled={isProcessing}
                    className="w-full py-4 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-xl shadow-lg text-lg disabled:opacity-50"
                >
                    {isProcessing ? 'Processing...' : t('upgradeNow')}
                </button>
                <p className="text-xs text-gray-500 mt-4">Recurring billing. Cancel anytime.</p>
            </main>
        </div>
    );
};

export default FlameUpPlusScreen;
