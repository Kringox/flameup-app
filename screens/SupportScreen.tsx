import React from 'react';
import XIcon from '../components/icons/XIcon.tsx';

interface SupportScreenProps {
  onClose: () => void;
}

const FAQItem: React.FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => (
    <details className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 group">
        <summary className="font-semibold text-gray-200 cursor-pointer list-none flex justify-between items-center">
            {question}
            <span className="transform transition-transform group-open:rotate-45">+</span>
        </summary>
        <div className="mt-2 text-gray-400 text-sm">
            {children}
        </div>
    </details>
);

const SupportScreen: React.FC<SupportScreenProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 bg-black z-[80] flex flex-col animate-slide-in">
        <header className="flex items-center p-4 border-b border-zinc-800 bg-zinc-900">
            <button onClick={onClose} className="w-8 text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-xl font-bold text-center flex-1 text-gray-200">Support Center</h1>
            <div className="w-8"></div>
        </header>
        <main className="flex-1 p-4 overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">Frequently Asked Questions</h2>
            <div className="space-y-2">
                <FAQItem question="How do I buy coins?">
                    <p>You can purchase FlameCoins from your Wallet. Tap your profile, then "Wallet", and select "Buy More Coins".</p>
                </FAQItem>
                <FAQItem question="What is a Superlike?">
                    <p>A Superlike is a special like that notifies the user immediately. You get a limited number for free, and can purchase more in the wallet.</p>
                </FAQItem>
                 <FAQItem question="How do I delete my account?">
                    <p>You can delete your account by going to Settings {'>'} Delete Account. Please be aware that this action is permanent and cannot be undone.</p>
                </FAQItem>
            </div>

            <div className="mt-8 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                <h2 className="text-lg font-bold text-white mb-2">Need more help?</h2>
                <p className="text-sm text-gray-400 mb-4">If you can't find the answer you're looking for, our support team is here to help.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button className="flex-1 py-3 bg-flame-orange text-white font-bold rounded-lg">Submit a Ticket</button>
                    <a href="mailto:support@flameup.app" className="flex-1 text-center py-3 bg-zinc-700 text-white font-bold rounded-lg">Email Us</a>
                </div>
            </div>
        </main>
    </div>
  );
};

export default SupportScreen;