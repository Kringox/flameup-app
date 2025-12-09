import React from 'react';

interface LegalScreenProps {
  docType: string;
  title: string;
  onClose: () => void;
}

const PrivacyPolicyContent: React.FC = () => (
  <div className="space-y-4">
    <h2 className="text-lg font-bold">1. Information We Collect</h2>
    <p>We collect information you provide directly to us, such as when you create an account, fill out a profile, and communicate with other users. This may include your name, email address, phone number, photos, and any other information you choose to provide.</p>
    <h2 className="text-lg font-bold">2. How We Use Information</h2>
    <p>We use the information we collect to operate, maintain, and provide the features and functionality of the Service, to communicate with you, to monitor and improve our Service, and to help users connect with each other.</p>
    <h2 className="text-lg font-bold">3. Sharing of Information</h2>
    <p>We do not share your personal information with third parties except as described in this Privacy Policy. We may share information with vendors, consultants, and other service providers who need access to such information to carry out work on our behalf.</p>
  </div>
);

const TermsOfServiceContent: React.FC = () => (
  <div className="space-y-4">
    <h2 className="text-lg font-bold">1. Acceptance of Terms</h2>
    <p>By accessing or using the FlameUp application ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, then you may not access the Service.</p>
    <h2 className="text-lg font-bold">2. User Conduct</h2>
    <p>You are solely responsible for your interactions with other users. You agree to act responsibly and respectfully when you use the Service. You agree not to post unauthorized commercial communications (such as spam) on FlameUp.</p>
    <h2 className="text-lg font-bold">3. Termination</h2>
    <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
  </div>
);

const ImprintContent: React.FC = () => (
  <div className="space-y-4">
    <h2 className="text-lg font-bold">Impressum (Legal Notice)</h2>
    <p>
      FlameUp Demo Inc.<br />
      123 Matchmaker Lane<br />
      10115 Berlin<br />
      Germany
    </p>
    <p>
      <strong>Represented by:</strong><br />
      John Doe, CEO
    </p>
    <p>
      <strong>Contact:</strong><br />
      Email: contact@flameup.app
    </p>
    <p>
      <strong>Disclaimer:</strong> This is a demonstration application. The information provided is for placeholder purposes only.
    </p>
  </div>
);


const LegalScreen: React.FC<LegalScreenProps> = ({ docType, title, onClose }) => {
  const renderContent = () => {
    switch (docType) {
      case 'privacy':
        return <PrivacyPolicyContent />;
      case 'terms':
        return <TermsOfServiceContent />;
      case 'imprint':
        return <ImprintContent />;
      default:
        return <p>Content not found.</p>;
    }
  };

  return (
    <div className="absolute inset-0 bg-gray-100 dark:bg-black z-[70] flex flex-col animate-slide-in">
        <style>{`.animate-slide-in { animation: slideInFromRight 0.3s ease-out; } @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        <header className="flex items-center p-4 border-b dark:border-gray-800 bg-white dark:bg-zinc-900">
            <button onClick={onClose} className="w-8 text-dark-gray dark:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-xl font-bold text-center flex-1 text-dark-gray dark:text-gray-200">{title}</h1>
            <div className="w-8"></div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto text-dark-gray dark:text-gray-300">
            {renderContent()}
        </main>
    </div>
  );
};

export default LegalScreen;