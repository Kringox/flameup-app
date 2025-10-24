import React from 'react';

interface PrivacyInfoScreenProps {
  onClose: () => void;
}

const PrivacyInfoScreen: React.FC<PrivacyInfoScreenProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 bg-gray-100 z-[80] flex flex-col">
      <header className="flex items-center p-4 border-b bg-white">
        <button onClick={onClose} className="w-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-center flex-1">Privacy Information</h1>
        <div className="w-8"></div>
      </header>
      <main className="flex-1 p-6 overflow-y-auto">
        <h2 className="text-lg font-bold mb-2">Our Commitment to Your Privacy</h2>
        <p className="text-gray-700 mb-4">
          At FlameUp, we take your privacy seriously. This document provides a summary of our practices. For full details, please read our complete Privacy Policy.
        </p>

        <h3 className="text-md font-semibold mb-1">Data We Collect</h3>
        <p className="text-gray-700 mb-4">
          We collect information you provide directly to us, such as when you create an account, fill out your profile, and communicate with other users. This includes your name, email, photos, and bio.
        </p>

        <h3 className="text-md font-semibold mb-1">How We Use Your Data</h3>
        <p className="text-gray-700 mb-4">
          Your data is used to operate and improve the FlameUp service, to help you connect with other users, and to personalize your experience. We do not sell your personal data to third parties.
        </p>

        <h3 className="text-md font-semibold mb-1">Your Choices</h3>
        <p className="text-gray-700">
          You can review and update your profile information at any time through the "Edit Profile" screen. You also have the right to delete your account, which will permanently remove your data from our systems.
        </p>
      </main>
    </div>
  );
};

export default PrivacyInfoScreen;
