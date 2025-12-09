import React, { useState } from 'react';
import { User } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useI18n } from '../contexts/I18nContext.ts';
import CreditCardIcon from './icons/CreditCardIcon.tsx';
import PayPalIcon from './icons/PayPalIcon.tsx';

interface BuyCoinsModalProps {
    onClose: () => void;
    currentUser: User;
    onUpdateUser: (user: User) => void;
}

const coinPackages = [
    { coins: 100, price: 1.99, popular: false },
    { coins: 550, price: 9.99, popular: true },
    { coins: 1200, price: 19.99, popular: false },
];

type CoinPackage = typeof coinPackages[0];

const BuyCoinsModal: React.FC<BuyCoinsModalProps> = ({ onClose, currentUser, onUpdateUser }) => {
    const { t } = useI18n();
    const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleBuy = async () => {
        if (!db || !selectedPackage || isProcessing) return;
        setIsProcessing(true);
        
        const newCoinTotal = (Number(currentUser.coins) || 0) + selectedPackage.coins;
        try {
            await updateDoc(doc(db, 'users', currentUser.id), { coins: increment(selectedPackage.coins) });
            onUpdateUser({ ...currentUser, coins: newCoinTotal });
            onClose();
        } catch (error) {
            console.error("Error purchasing coins:", error);
            alert("Purchase failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const renderPackageSelection = () => (
        <>
            <h2 className="text-xl font-bold text-center dark:text-gray-200">{t('buyMoreCoins')}</h2>
            <div className="space-y-3 mt-4">
                {coinPackages.map(pkg => (
                    <button 
                        key={pkg.coins} 
                        onClick={() => setSelectedPackage(pkg)} 
                        className="w-full flex justify-between items-center p-4 border rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 relative overflow-hidden"
                    >
                        {pkg.popular && <div className="absolute top-0 right-4 bg-flame-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-b-md">POPULAR</div>}
                        <span className="font-bold text-lg dark:text-gray-200">{pkg.coins} Coins</span>
                        <span className="bg-flame-orange text-white font-semibold py-1 px-3 rounded-full">${pkg.price.toFixed(2)}</span>
                    </button>
                ))}
            </div>
        </>
    );

    const renderPaymentSelection = () => (
        <>
            <button onClick={() => setSelectedPackage(null)} className="absolute top-4 left-4 text-gray-500">&larr; Back</button>
            <h2 className="text-xl font-bold text-center dark:text-gray-200">{t('selectPaymentMethod')}</h2>
            <div className="my-4 p-3 bg-gray-100 dark:bg-zinc-700 rounded-lg text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('youArePaying')}</p>
                <p className="text-2xl font-bold text-dark-gray dark:text-gray-200">${selectedPackage?.price.toFixed(2)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">for {selectedPackage?.coins} Coins</p>
            </div>
            <div className="space-y-3">
                <button className="w-full flex items-center p-3 border rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700">
                    <CreditCardIcon className="w-6 h-6 mr-3" />
                    <span className="font-semibold dark:text-gray-200">{t('creditCard')}</span>
                </button>
                <button className="w-full flex items-center p-3 border rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700">
                    <PayPalIcon className="w-6 h-6 mr-3" />
                    <span className="font-semibold dark:text-gray-200">{t('payPal')}</span>
                </button>
                <button className="w-full flex items-center p-3 border rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700">
                    <span className="w-6 h-6 mr-3 text-sm font-bold">🇪🇺</span>
                    <span className="font-semibold dark:text-gray-200">{t('sepaDirectDebit')}</span>
                </button>
            </div>
             <button 
                onClick={handleBuy}
                disabled={isProcessing}
                className="w-full mt-6 py-3 bg-flame-orange text-white font-bold rounded-lg disabled:opacity-50"
            >
                {isProcessing ? 'Processing...' : `${t('payNow')} ($${selectedPackage?.price.toFixed(2)})`}
            </button>
        </>
    );

    return (
        <div className="absolute inset-0 bg-black/70 flex justify-center items-center z-[100]" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-800 rounded-lg w-11/12 max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
                {selectedPackage ? renderPaymentSelection() : renderPackageSelection()}
            </div>
        </div>
    );
};

export default BuyCoinsModal;