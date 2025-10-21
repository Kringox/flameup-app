
import React from 'react';
import { Tab } from '../types';
import HomeIcon from './icons/HomeIcon';
import FlameIcon from './icons/FlameIcon';
import ChatIcon from './icons/ChatIcon';
import UserIcon from './icons/UserIcon';

interface BottomNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const NavItem: React.FC<{
  label: Tab;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => {
  const activeClass = 'text-flame-orange';
  const inactiveClass = 'text-gray-400';
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center w-full h-full transition-colors duration-200"
    >
      <div className={`w-8 h-8 ${isActive ? activeClass : inactiveClass}`}>{icon}</div>
      <span className={`text-xs mt-1 ${isActive ? activeClass : inactiveClass}`}>{label}</span>
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex justify-around items-center shadow-lg z-50">
      <NavItem
        label={Tab.Home}
        icon={<HomeIcon />}
        isActive={activeTab === Tab.Home}
        onClick={() => setActiveTab(Tab.Home)}
      />
      <NavItem
        label={Tab.Swipe}
        icon={<FlameIcon isGradient={activeTab === Tab.Swipe} />}
        isActive={activeTab === Tab.Swipe}
        onClick={() => setActiveTab(Tab.Swipe)}
      />
      <NavItem
        label={Tab.Chat}
        icon={<ChatIcon />}
        isActive={activeTab === Tab.Chat}
        onClick={() => setActiveTab(Tab.Chat)}
      />
      <NavItem
        label={Tab.Profile}
        icon={<UserIcon />}
        isActive={activeTab === Tab.Profile}
        onClick={() => setActiveTab(Tab.Profile)}
      />
    </nav>
  );
};

export default BottomNav;
