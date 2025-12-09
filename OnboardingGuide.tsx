// FIX: Create content for missing file
import React, { useState } from 'react';
import HomeIcon from './icons/HomeIcon.tsx';
import FlameIcon from './icons/FlameIcon.tsx';
import ChatIcon from './icons/ChatIcon.tsx';

interface OnboardingGuideProps {
  onFinish: () => void;
}

const steps = [
  {
    icon: <FlameIcon className="w-16 h-16 text-flame-orange" />,
    title: 'Discover People',
    // FIX: Corrected invalid escape sequence for apostrophe. Replaced single quotes with double quotes.
    text: "Swipe right to like someone, or swipe left to pass. It's a match if they like you back!",
  },
  {
    icon: <HomeIcon className="w-16 h-16 text-gray-700" />,
    // FIX: Corrected invalid escape sequence for apostrophe. Replaced single quotes with double quotes.
    title: "See What's New",
    text: 'Check out the Home feed for posts and stories from people you follow.',
  },
  {
    icon: <ChatIcon className="w-16 h-16 text-blue-500" />,
    title: 'Start Chatting',
    text: 'Once you match with someone, you can start a conversation in the Chat tab.',
  },
];

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onFinish }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const isLastStep = stepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onFinish();
    } else {
      setStepIndex(stepIndex + 1);
    }
  };

  const currentStep = steps[stepIndex];

  return (
    <div className="absolute inset-0 bg-black/80 z-[100] flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-8 text-center flex flex-col items-center">
        {currentStep.icon}
        <h2 className="text-2xl font-bold mt-6">{currentStep.title}</h2>
        <p className="text-gray-600 mt-2">{currentStep.text}</p>
        <div className="flex mt-8 space-x-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${index === stepIndex ? 'bg-flame-orange' : 'bg-gray-300'}`}
            />
          ))}
        </div>
        <button
          onClick={handleNext}
          className="w-full mt-8 py-3 bg-flame-orange text-white font-bold rounded-lg"
        >
          {isLastStep ? 'Get Started' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default OnboardingGuide;