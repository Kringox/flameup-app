import React, { useState } from 'react';
import { User } from '../types.ts';
import CoinIcon from './icons/CoinIcon.tsx';

interface Gift {
    name: string;
    icon: string;
    cost: number;
}

const GIFTS: Gift[] = [
    { name: 'Rose', icon: '🌹', cost: 10 },
    { name: 'Teddy Bear', icon: '🧸', cost: 50 },
    { name: 'Diamond', icon: '💎', cost: 100 },
    { name: 'Heart', icon: '❤️‍🔥', cost: 25 },
];

interface GiftModalProps {
    onClose: () => void;
    currentUser: User;
    onSendGift: (gift: Gift) => void;
}

const GiftModal: React.FC<GiftModalProps> = ({ onClose, currentUser, onSendGift }) => {
    const [selectedGift, setSelectedGift] = useState<Gift | null>(null);

    const handleSend = () => {
        if (selectedGift) {
            onSendGift(selectedGift);
        }
    };

    return (
        <div className="absolute inset-0 bg-black/70 flex justify-center items-center z-[100]" onClick={onClose}>
            <div className="bg-white rounded-lg w-11/12 max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-center">Send a Gift</h2>
                <p className="text-center text-gray-500 text-sm mt-1">Your balance: {currentUser.coins} coins</p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                    {GIFTS.map(gift => (
                        <button 
                            key={gift.name} 
                            onClick={() => setSelectedGift(gift)}
                            className={`p-4 border-2 rounded-lg text-center ${selectedGift?.name === gift.name ? 'border-flame-orange' : 'border-gray-200'}`}
                        >
                            <span className="text-4xl">{gift.icon}</span>
                            <p className="font-semibold">{gift.name}</p>
                            <div className="flex items-center justify-center text-sm text-gray-600">
                                <CoinIcon className="w-4 h-4 mr-1 text-yellow-500" />
                                <span>{gift.cost}</span>
                            </div>
                        </button>
                    ))}
                </div>
                <button 
                    onClick={handleSend}
                    disabled={!selectedGift || currentUser.coins < (selectedGift?.cost || 0)}
                    className="w-full mt-6 py-3 bg-flame-orange text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {currentUser.coins < (selectedGift?.cost || 0) ? 'Not enough coins' : 'Send Gift'}
                </button>
            </div>
        </div>
    );
};

export default GiftModal;
