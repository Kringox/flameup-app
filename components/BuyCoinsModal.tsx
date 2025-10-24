import React from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';
// FIX: Added file extension to firebaseConfig import
import { db } from '../firebaseConfig.ts';
import { doc, updateDoc } from 'firebase/firestore';

interface BuyCoinsModalProps {
    onClose: () => void;
    currentUser: User;
    onUpdateUser: (user: User) => void;
}

const coinPackages = [
    { coins: 100, price: 1.99 },
    { coins: 550, price: 9.99 },
    { coins: 1200, price: 19.99 },
];

const BuyCoinsModal: React.FC<BuyCoinsModalProps> = ({ onClose, currentUser, onUpdateUser }) => {
    
    const handleBuy = async (coins: number) => {
        if (!db) return;
        const newCoinTotal = currentUser.coins + coins;
        await updateDoc(doc(db, 'users', currentUser.id), { coins: newCoinTotal });
        onUpdateUser({ ...currentUser, coins: newCoinTotal });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[100]" onClick={onClose}>
            <div className="bg-white rounded-lg w-11/12 max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-center">Buy Coins</h2>
                <div className="space-y-3 mt-4">
                    {coinPackages.map(pkg => (
                        <button key={pkg.coins} onClick={() => handleBuy(pkg.coins)} className="w-full flex justify-between items-center p-4 border rounded-lg hover:bg-gray-100">
                            <span className="font-bold text-lg">{pkg.coins} Coins</span>
                            <span className="bg-flame-orange text-white font-semibold py-1 px-3 rounded-full">${pkg.price}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BuyCoinsModal;
