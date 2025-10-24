import React from 'react';
import CoinIcon from '../components/icons/CoinIcon';

interface TransactionHistoryScreenProps {
  onClose: () => void;
}

// Mock data for demonstration
const mockTransactions = [
  { id: 1, type: 'purchase', amount: 550, description: 'Coin Package Purchase', date: '2023-10-26' },
  { id: 2, type: 'bonus', amount: 50, description: 'Daily Bonus', date: '2023-10-26' },
  { id: 3, type: 'gift_sent', amount: -100, description: 'Gift to Jessica', date: '2023-10-25' },
  { id: 4, type: 'bonus', amount: 50, description: 'Daily Bonus', date: '2023-10-25' },
];

const TransactionHistoryScreen: React.FC<TransactionHistoryScreenProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 bg-gray-100 z-[80] flex flex-col">
      <header className="flex items-center p-4 border-b bg-white">
        <button onClick={onClose} className="w-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-center flex-1">Transaction History</h1>
        <div className="w-8"></div>
      </header>
      <main className="flex-1 p-2 overflow-y-auto">
        {mockTransactions.length > 0 ? (
          mockTransactions.map(tx => (
            <div key={tx.id} className="flex items-center p-3 bg-white rounded-lg mb-2 shadow-sm">
              <div className="flex-1">
                <p className="font-semibold">{tx.description}</p>
                <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
              </div>
              <div className={`flex items-center font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-gray-700'}`}>
                <span>{tx.amount > 0 ? '+' : ''}{tx.amount}</span>
                <CoinIcon className="w-4 h-4 ml-1" />
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 mt-8">No transactions yet.</p>
        )}
      </main>
    </div>
  );
};

export default TransactionHistoryScreen;
