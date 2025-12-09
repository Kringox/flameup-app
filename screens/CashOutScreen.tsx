
import React, { useState } from 'react';
import { User } from '../types.ts';
import FlameIcon from '../components/icons/FlameIcon.tsx';

interface CashOutScreenProps {
  user: User;
  onClose: () => void;
}

const MIN_CASHOUT = 1000; // Minimum 1000 coins to cash out
const FEE_PERCENTAGE = 0.03; // 3% fee

const CashOutScreen: React.FC<CashOutScreenProps> = ({ user, onClose }) => {
    const [amount, setAmount] = useState('');
    const currentCoins = Number(user.coins) || 0;

    const amountNum = parseInt(amount) || 0;
    const fee = Math.ceil(amountNum * FEE_PERCENTAGE);
    const amountReceived = amountNum - fee;
    const canCashOut = amountNum >= MIN_CASHOUT && amountNum <= currentCoins;

    const handleSubmit = () => {
        alert('Cash out functionality is not yet implemented. This is a placeholder.');
        onClose();
    };

    return (
        <div className="absolute inset-0 bg-gray-100 dark:bg-black z-[90] flex flex-col">
            <header className="flex items-center p-4 border-b dark:border-gray-800 bg-white dark:bg-zinc-900">
                <button onClick={onClose} className="w-8 text-dark-gray dark:text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-center flex-1 text-dark-gray dark:text-gray-200">Cash Out</h1>
                <div className="w-8"></div>
            </header>
            <main className="flex-1 p-4">
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 text-center shadow mb-6">
                    <p className="text-gray-500 dark:text-gray-400">Available to Cash Out</p>
                    <div className="flex items-center justify-center mt-2 text-dark-gray dark:text-gray-200">
                        <FlameIcon isGradient className="w-8 h-8" />
                        <span className="text-4xl font-bold ml-2">{currentCoins}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">(≈ €{(currentCoins / 100).toFixed(2)})</p>
                </div>

                <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
                    <label htmlFor="cashout-amount" className="font-semibold text-gray-600 dark:text-gray-300">Amount to Cash Out</label>
                    <div className="relative mt-2">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FlameIcon className="w-5 h-5 text-gray-400"/>
                        </div>
                        <input
                            id="cashout-amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={`Min ${MIN_CASHOUT}`}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-dark-gray dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange"
                        />
                    </div>
                    
                    {amountNum > 0 && (
                        <div className="text-sm mt-4 space-y-1 text-gray-600 dark:text-gray-400">
                            <div className="flex justify-between"><span>Fee (3%):</span><span>- {fee} Coins</span></div>
                            <div className="flex justify-between font-bold border-t pt-1 border-gray-200 dark:border-zinc-700"><span>You'll Receive:</span><span>€{(amountReceived/100).toFixed(2)}</span></div>
                        </div>
                    )}
                </div>

                 <p className="text-xs text-gray-500 mt-4 text-center">
                    Minimum cash out is {MIN_CASHOUT} coins. A 3% transaction fee applies. Payouts are processed via Stripe. You may be required to complete identity verification (KYC).
                </p>

                <button 
                    onClick={handleSubmit} 
                    disabled={!canCashOut}
                    className="w-full mt-6 py-4 bg-flame-orange text-white rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Request Cash Out
                </button>
            </main>
        </div>
    );
};

export default CashOutScreen;
