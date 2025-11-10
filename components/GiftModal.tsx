import React, { useState } from 'react';
// FIX: Import User and Gift types from the central types file.
import { User, Gift } from '../types.ts';
import FlameIcon from './icons/FlameIcon.tsx';
// FIX: Import I18nKey for type-safe translation key mapping.
import { useI18n, I18nKey } from '../contexts/I18nContext.ts';

// FIX: Remove local Gift interface definition as it's now imported.

// FIX: Use 'as const' to infer literal types for gift names, making the dynamic translation key type-safe.
const GIFTS = [
    { name: 'Rose', icon: '🌹', cost: 10 },
    { name: 'Teddy Bear', icon: '🧸', cost: 50 },
    { name: 'Diamond', icon: '💎', cost: 100 },
    { name: 'Heart', icon: '❤️‍🔥', cost: 25 },
] as const;

// FIX: Create a type-safe map from gift names to translation keys to resolve the TypeScript error.
const giftTranslationMap: Record<(typeof GIFTS)[number]['name'], I18nKey> = {
    'Rose': 'gift_rose',
    'Teddy Bear': 'gift_teddybear',
    'Diamond': 'gift_diamond',
    'Heart': 'gift_heart',
};

interface GiftModalProps {
    onClose: () => void;
    currentUser: User;
    onSendGift: (gift: Gift) => void;
}

const GiftModal: React.FC<GiftModalProps> = ({ onClose, currentUser, onSendGift }) => {
    const [selectedGift, setSelectedGift] = useState<(typeof GIFTS)[number] | null>(null);
    const { t } = useI18n();

    const handleSend = () => {
        if (selectedGift) {
            onSendGift(selectedGift);
        }
    };
    
    const currentCoins = Number(currentUser.coins) || 0;
    const selectedCost = selectedGift?.cost ?? 0;
    const canAfford = currentCoins >= selectedCost;

    return (
        <div className="absolute inset-0 bg-black/70 flex justify-center items-center z-[100]" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-800 rounded-lg w-11/12 max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-center dark:text-gray-200">{t('sendGiftTitle')}</h2>
                <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-1">{t('yourBalance')}: {currentCoins} {t('coins')}</p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                    {GIFTS.map(gift => (
                        <button 
                            key={gift.name} 
                            onClick={() => setSelectedGift(gift)}
                            className={`p-4 border-2 rounded-lg text-center bg-gray-50 dark:bg-zinc-700 ${selectedGift?.name === gift.name ? 'border-flame-orange' : 'border-gray-200 dark:border-zinc-600'}`}
                        >
                            <span className="text-4xl">{gift.icon}</span>
                            <p className="font-semibold dark:text-gray-200">{t(giftTranslationMap[gift.name])}</p>
                            <div className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400">
                                <FlameIcon isGradient className="w-4 h-4 mr-1" />
                                <span>{gift.cost}</span>
                            </div>
                        </button>
                    ))}
                </div>
                <button 
                    onClick={handleSend}
                    disabled={!selectedGift || !canAfford}
                    className="w-full mt-6 py-3 bg-flame-orange text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {!canAfford && selectedGift ? t('notEnoughCoins') : t('sendGiftButton')}
                </button>
            </div>
        </div>
    );
};

export default GiftModal;