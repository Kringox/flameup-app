
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { doc, updateDoc, Timestamp, increment } from 'firebase/firestore';
import FlameIcon from './icons/FlameIcon.tsx';
import StarIcon from './icons/StarIcon.tsx';
import { hapticFeedback } from '../utils/haptics.ts';
import { useI18n } from '../contexts/I18nContext.ts';

interface DailyBonusWheelProps {
    currentUser: User;
    onClose: () => void;
    onUpdateUser: (user: User) => void;
}

type PrizeType = 'coin' | 'superlike';

interface Prize {
    id: number;
    type: PrizeType;
    amount: number;
    label: string;
    color: string;
    weight: number; // Higher weight = higher chance
}

const PRIZES: Prize[] = [
    { id: 0, type: 'coin', amount: 1, label: '+1 Coin', color: '#FFD700', weight: 40 },
    { id: 1, type: 'coin', amount: 2, label: '+2 Coins', color: '#FFA500', weight: 30 },
    { id: 2, type: 'superlike', amount: 1, label: '1x Free Super', color: '#3B82F6', weight: 15 },
    { id: 3, type: 'coin', amount: 5, label: '+5 Coins', color: '#FF4500', weight: 10 },
    { id: 4, type: 'superlike', amount: 2, label: '2x Free Super', color: '#8B5CF6', weight: 4 },
    { id: 5, type: 'coin', amount: 15, label: '+15 JACKPOT', color: '#FF0000', weight: 1 },
];

const DailyBonusWheel: React.FC<DailyBonusWheelProps> = ({ currentUser, onClose, onUpdateUser }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [prize, setPrize] = useState<Prize | null>(null);
    const [canSpin, setCanSpin] = useState(true);
    const { t } = useI18n();
    
    // Check if user already claimed today (extra safety)
    useEffect(() => {
        if (currentUser.lastDailyBonus) {
            const lastBonus = currentUser.lastDailyBonus.toDate().getTime();
            const now = Date.now();
            if (now - lastBonus < 24 * 60 * 60 * 1000) {
                setCanSpin(false);
            }
        }
    }, [currentUser.lastDailyBonus]);

    const getWeightedRandomPrize = () => {
        const totalWeight = PRIZES.reduce((sum, p) => sum + p.weight, 0);
        let random = Math.random() * totalWeight;
        for (const p of PRIZES) {
            if (random < p.weight) return p;
            random -= p.weight;
        }
        return PRIZES[0];
    };

    const spinWheel = async () => {
        if (isSpinning || !canSpin || !db) return;
        
        setIsSpinning(true);
        hapticFeedback('medium');

        const selectedPrize = getWeightedRandomPrize();
        const segmentAngle = 360 / PRIZES.length;
        
        const baseSpins = 360 * 5;
        const prizeAngle = selectedPrize.id * segmentAngle;
        const randomOffset = Math.floor(Math.random() * (segmentAngle - 10)) + 5; 
        const targetRotation = baseSpins + (360 - prizeAngle) + randomOffset;

        setRotation(targetRotation);

        // Wait for animation to finish (3s)
        setTimeout(async () => {
            setPrize(selectedPrize);
            setIsSpinning(false);
            setCanSpin(false);
            hapticFeedback('success');

            try {
                const userRef = doc(db, 'users', currentUser.id);
                const updateData: any = {
                    lastDailyBonus: Timestamp.now()
                };

                if (selectedPrize.type === 'coin') {
                    updateData.coins = increment(selectedPrize.amount);
                } else {
                    updateData.freeSuperLikes = increment(selectedPrize.amount);
                }

                await updateDoc(userRef, updateData);

                const updatedUser = {
                    ...currentUser,
                    lastDailyBonus: Timestamp.now(),
                    coins: selectedPrize.type === 'coin' ? (currentUser.coins || 0) + selectedPrize.amount : currentUser.coins,
                    freeSuperLikes: selectedPrize.type === 'superlike' ? (currentUser.freeSuperLikes || 0) + selectedPrize.amount : currentUser.freeSuperLikes,
                };
                onUpdateUser(updatedUser);

            } catch (error) {
                console.error("Error saving bonus:", error);
            }

        }, 3000);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm relative overflow-hidden flex flex-col items-center shadow-2xl border border-flame-orange/30">
                
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-flame-orange to-flame-red mb-2">{t('dailyBonusTitle')}</h2>
                <p className="text-gray-500 text-sm mb-6 dark:text-gray-400">{t('spinTheWheel')}</p>

                {/* Wheel Container */}
                <div className="relative w-64 h-64 mb-8">
                    {/* Pointer */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 text-flame-red filter drop-shadow-lg">
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21L1 2h22L12 21z" />
                        </svg>
                    </div>

                    {/* The Wheel */}
                    <div 
                        className="w-full h-full rounded-full border-4 border-white dark:border-zinc-700 shadow-xl overflow-hidden relative"
                        style={{ 
                            transform: `rotate(${rotation}deg)`, 
                            transition: 'transform 3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
                        }}
                    >
                        {/* Render Segments via Conic Gradient for background colors */}
                        <div 
                            className="absolute inset-0 w-full h-full rounded-full"
                            style={{
                                background: `conic-gradient(
                                    ${PRIZES.map((p, i) => `${p.color} ${i * 60}deg ${(i + 1) * 60}deg`).join(', ')}
                                )`
                            }}
                        />
                        
                        {/* Render Labels/Icons */}
                        {PRIZES.map((p, i) => {
                            const angle = i * 60 + 30; // Center of segment
                            return (
                                <div 
                                    key={p.id}
                                    className="absolute top-1/2 left-1/2 w-full h-full origin-top-left flex justify-center pt-4"
                                    style={{ transform: `rotate(${angle}deg) translate(-50%, -50%)` }}
                                >
                                    <div className="flex flex-col items-center" style={{ transform: 'translateY(-35px)' }}>
                                        <span className="text-white font-bold text-xs drop-shadow-md">{p.label}</span>
                                        {p.type === 'coin' ? (
                                            <FlameIcon className="w-5 h-5 text-white drop-shadow-md mt-1" fill="currentColor" />
                                        ) : (
                                            <StarIcon className="w-5 h-5 text-white drop-shadow-md mt-1" fill="currentColor" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Center Knob */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white dark:bg-zinc-800 rounded-full shadow-inner border-2 border-gray-200 dark:border-zinc-600 flex items-center justify-center z-10">
                        <span className="font-bold text-lg">🎁</span>
                    </div>
                </div>

                {/* Action Area */}
                {!prize ? (
                    <button 
                        onClick={spinWheel} 
                        disabled={isSpinning || !canSpin}
                        className={`w-full py-3 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-95 ${!canSpin ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-flame-orange to-flame-red text-white hover:shadow-xl'}`}
                    >
                        {isSpinning ? t('spinning') : (!canSpin ? t('comeBackTomorrow') : t('spinNow'))}
                    </button>
                ) : (
                    <div className="text-center animate-scale-up">
                        <p className="text-lg font-bold dark:text-white">{t('youWon')}</p>
                        <div className="text-3xl font-black text-flame-orange my-2 flex items-center justify-center gap-2">
                            {prize.label}
                            {prize.type === 'coin' ? <FlameIcon isGradient className="w-8 h-8" /> : <StarIcon className="w-8 h-8 text-blue-500" />}
                        </div>
                        <button onClick={onClose} className="mt-4 px-8 py-2 bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-white font-bold rounded-full">
                            {t('awesome')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DailyBonusWheel;