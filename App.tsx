import React, { useState } from 'react';
import BottomNav from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import SwipeScreen from './screens/SwipeScreen';
import ChatScreen from './screens/ChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import AuthScreen from './screens/AuthScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import { Tab, User } from './types';
import { MOCK_CURRENT_USER } from './constants';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Home);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setProfileComplete(false);
    setCurrentUser(null);
    setActiveTab(Tab.Home); // Reset to default tab on logout
  };
  
  const handleAuthSuccess = (action: 'login' | 'signup') => {
    setIsLoggedIn(true);
    if (action === 'login') {
      // Existing users are assumed to have a complete profile
      setCurrentUser(MOCK_CURRENT_USER);
      setProfileComplete(true);
      setActiveTab(Tab.Home);
    } else {
      // New users need to set up their profile
      setCurrentUser(null);
      setProfileComplete(false);
    }
  };

  const handleProfileSetupComplete = (newUser: User) => {
    setCurrentUser(newUser);
    setProfileComplete(true);
    setActiveTab(Tab.Home);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  if (!isLoggedIn) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  if (!profileComplete) {
    return <ProfileSetupScreen onComplete={handleProfileSetupComplete} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case Tab.Home:
        return <HomeScreen />;
      case Tab.Swipe:
        return <SwipeScreen />;
      case Tab.Chat:
        return <ChatScreen />;
      case Tab.Profile:
        return currentUser ? <ProfileScreen user={currentUser} onLogout={handleLogout} onUpdateUser={handleUpdateUser} /> : null;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col font-sans bg-gray-50 text-dark-gray overflow-hidden antialiased">
      <main className="flex-1 overflow-y-auto pb-16">
        {renderContent()}
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default App;