import React, { useState } from 'react';
import { User } from '../types';
import CrownIcon from '../components/icons/CrownIcon';
import ReceiptIcon from '../components/icons/ReceiptIcon';

interface ManageSubscriptionScreenProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (updatedUser: User) => void;
}

const SettingsItem: React.FC<{ onClick?: () => void; children: React.ReactNode; isButton?: boolean }> = ({ onClick, children, isButton = false }) => {
  const baseClasses = "flex items-center justify-between p-4 text-left w-full";
  const interactiveClasses = "active:bg-gray-100";
  const buttonClasses = isButton ? `${baseClasses} ${interactiveClasses}` : baseClasses;
  
  return isButton ? <button onClick={onClick} className={`${buttonClasses} border-t border-gray-200 first:border-t-0`}>{children}</button> : <div className={`${buttonClasses} border-t border-gray-200 first:border-t-0`}>{children}</div>
};

const ChevronRightIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);


const ManageSubscriptionScreen: React.FC<ManageSubscriptionScreenProps> = ({ user, onClose, onUpdateUser }) => {
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>(user.isPremium ? 'yearly' : 'monthly');

    const handleSubscribe = () => {
        // Mock subscription logic
        alert(`Subscribed to ${selectedPlan} plan!`);
        onUpdateUser({ ...user, isPremium: true });
    };

    const handleCancel = () => {
        if (window.confirm("Are you sure you want to cancel your FlameUp+ subscription?")) {
            alert("Your subscription has been cancelled.");
            onUpdateUser({ ...user, isPremium: false });
        }
    };


    return (
      <div className="absolute inset-0 bg-gray-100 z-[80] flex flex-col animate-slide-in">
        <style>{`.animate-slide-in { animation: slideInFromRight 0.3s ease-out; } @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        {/* Header */}
        <header className="flex items-center p-4 border-b border-gray-200 bg-white flex-shrink-0 sticky top-0">
          <button onClick={onClose} className="text-lg text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-bold text-dark-gray text-center flex-1">FlameUp+</h1>
          <div className="w-6"></div> {/* Spacer for centering title */}
        </header>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
            <div className="bg-gradient-to-r from-yellow-300 to-orange-400 p-6 rounded-2xl text-white text-center shadow-lg">
                <CrownIcon className="w-12 h-12 mx-auto" />
                <h2 className="text-2xl font-bold mt-2">Unlock Premium Features</h2>
                <p className="mt-1">Unlimited Swipes, Profile Visitors, Custom Themes & More!</p>
            </div>

            {user.isPremium ? (
                <div className="mt-6 bg-white p-4 rounded-lg border">
                    <h3 className="font-bold text-lg text-center text-success-green">Subscription Active</h3>
                    <p className="text-center text-gray-600 mt-1">Your plan renews on <strong>Dec 31, 2024</strong>.</p>
                    <button onClick={handleCancel} className="w-full mt-4 py-2 text-center text-error-red font-semibold bg-red-50 border border-red-200 rounded-lg active:bg-red-100">
                        Cancel Subscription
                    </button>
                </div>
            ) : (
                <div className="mt-6">
                    <h3 className="font-bold text-lg text-center mb-4">Choose Your Plan</h3>
                    <div className="flex space-x-2">
                        <button onClick={() => setSelectedPlan('monthly')} className={`flex-1 p-4 border-2 rounded-lg text-center transition-all ${selectedPlan === 'monthly' ? 'border-flame-orange bg-flame-orange/10' : 'border-gray-300'}`}>
                            <p className="font-bold text-lg">9,99€</p>
                            <p className="text-sm text-gray-600">Per Month</p>
                        </button>
                        <button onClick={() => setSelectedPlan('yearly')} className={`relative flex-1 p-4 border-2 rounded-lg text-center transition-all ${selectedPlan === 'yearly' ? 'border-flame-orange bg-flame-orange/10' : 'border-gray-300'}`}>
                             <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-flame-orange text-white text-xs font-bold px-2 py-0.5 rounded-full">SAVE 17%</span>
                            <p className="font-bold text-lg">99,99€</p>
                            <p className="text-sm text-gray-600">Per Year</p>
                        </button>
                    </div>
                     <button onClick={handleSubscribe} className="w-full mt-4 py-3 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-full shadow-lg">
                        Activate FlameUp+
                    </button>
                </div>
            )}

            <div className="mt-8 bg-white rounded-lg border border-gray-200 overflow-hidden">
                <SettingsItem isButton>
                    <div className="flex items-center">
                        <ReceiptIcon className="w-5 h-5 mr-3 text-gray-500"/>
                        <span className="text-lg">Payment History</span>
                    </div>
                    <ChevronRightIcon />
                </SettingsItem>
            </div>
        </div>
      </div>
    );
};

export default ManageSubscriptionScreen;