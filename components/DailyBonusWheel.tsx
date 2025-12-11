
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
    { id: 0, type: 'coin', amount: 10, label: '+10 Coins', color: '#FFD700', weight: 40 },
    { id: 1, type: 'coin', amount: 25, label: '+25 Coins', color: '#FFA500', weight: 30 },
    { id: 2, type: 'superlike', amount: 1, label: '1x Superlike', color: '#3B82F6', weight: 15 },
    { id: 3, type: 'coin', amount: 50, label: '+50 Coins', color: '#FF4500', weight: 10 },
    { id: 4, type: 'superlike', amount: 3, label: '3x Superlike', color: '#8B5CF6', weight: 4 },
    { id: 5, type: 'coin', amount: 500, label: 'JACKPOT', color: '#EF4444', weight: 1 },
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
        
        // Spin multiple times
        const baseSpins = 360 * 8;
        const prizeAngle = selectedPrize.id * segmentAngle;
        // Adjust for pointer at top (rotate backwards)
        const targetRotation = baseSpins + (360 - prizeAngle) + (segmentAngle / 2); // Center on segment

        setRotation(targetRotation);

        // Wait for animation to finish (4s)
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

        }, 4000);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[150] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 w-full max-w-sm relative overflow-hidden flex flex-col items-center shadow-2xl border-2 border-flame-orange/50">
                
                {/* Decorative Lights */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 mb-2 drop-shadow-md uppercase tracking-wider">{t('dailyBonusTitle')}</h2>
                <p className="text-gray-400 text-sm mb-8">{t('spinTheWheel')}</p>

                {/* Wheel Container */}
                <div className="relative w-72 h-72 mb-10">
                    {/* Pointer */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 text-white filter drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-flame-red">
                            <path d="M12 22L1 2h22L12 22z" />
                        </svg>
                    </div>

                    {/* The Wheel */}
                    <div 
                        className="w-full h-full rounded-full border-8 border-gray-800 shadow-[0_0_20px_rgba(255,107,53,0.3)] overflow-hidden relative"
                        style={{ 
                            transform: `rotate(${rotation}deg)`, 
                            transition: 'transform 4s cubic-bezier(0.15, 0.9, 0.3, 1)' 
                        }}
                    >
                        {/* Segments */}
                        <div 
                            className="absolute inset-0 w-full h-full rounded-full"
                            style={{
                                background: `conic-gradient(
                                    ${PRIZES.map((p, i) => `${p.color} ${i * 60}deg ${(i + 1) * 60}deg`).join(', ')}
                                )`
                            }}
                        />
                        
                        {/* Divider Lines & Icons */}
                        {PRIZES.map((p, i) => {
                            const angle = i * 60 + 30; // Center of segment
                            return (
                                <div 
                                    key={p.id}
                                    className="absolute top-1/2 left-1/2 w-full h-full origin-top-left flex justify-center pt-2"
                                    style={{ transform: `rotate(${angle}deg) translate(-50%, -50%)` }}
                                >
                                    <div className="flex flex-col items-center" style={{ transform: 'translateY(-60px)' }}>
                                        <span className="text-black font-extrabold text-xs drop-shadow-sm bg-white/30 px-1 rounded">{p.label}</span>
                                        {p.type === 'coin' ? (
                                            <FlameIcon className="w-6 h-6 text-black drop-shadow-sm mt-1" fill="currentColor" />
                                        ) : (
                                            <StarIcon className="w-6 h-6 text-white drop-shadow-md mt-1" fill="currentColor" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Center Knob */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-br from-gray-700 to-black rounded-full shadow-inner border-4 border-gray-600 flex items-center justify-center z-10">
                        <span className="text-2xl">🎰</span>
                    </div>
                </div>

                {/* Action Area */}
                {!prize ? (
                    <button 
                        onClick={spinWheel} 
                        disabled={isSpinning || !canSpin}
                        className={`w-full py-4 rounded-xl font-bold text-xl shadow-lg transition-all transform active:scale-95 ${!canSpin ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-flame-orange via-red-500 to-flame-red text-white hover:shadow-flame-orange/50 hover:scale-105'}`}
                    >
                        {isSpinning ? t('spinning') : (!canSpin ? t('comeBackTomorrow') : t('spinNow'))}
                    </button>
                ) : (
                    <div className="text-center animate-scale-up w-full">
                        <p className="text-xl font-bold text-white mb-2">{t('youWon')}</p>
                        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 my-4 flex items-center justify-center gap-3">
                            {prize.label}
                        </div>
                        <button onClick={onClose} className="w-full mt-2 px-8 py-3 bg-white text-black font-bold rounded-xl shadow-lg hover:bg-gray-200 transition-colors">
                            {t('awesome')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DailyBonusWheel;
