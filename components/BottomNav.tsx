
import React from 'react';
import { Tab } from '../types.ts';
import HomeIcon from './icons/HomeIcon.tsx';
import FlameIcon from './icons/FlameIcon.tsx';
import ChatIcon from './icons/ChatIcon.tsx';
import UserIcon from './icons/UserIcon.tsx';
import PlusIcon from './icons/PlusIcon.tsx';
import { useI18n } from '../contexts/I18nContext.ts';

interface BottomNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onOpenCreate: () => void;
  hasUnreadMessages?: boolean;
}

const NavItem: React.FC<{
  label?: string; // Label optional for cleaner look
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  hasNotification?: boolean;
}> = ({ label, icon, isActive, onClick, hasNotification }) => {
  const activeClass = 'text-flame-orange scale-110';
  const inactiveClass = 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300';
  
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 active:scale-90 group`}
    >
      <div className={`relative p-2 transition-all duration-300 ${isActive ? activeClass : inactiveClass}`}>
        {React.cloneElement(icon as React.ReactElement, { 
            className: `w-7 h-7 ${isActive ? 'fill-current' : ''} transition-all duration-300`
        })}
        {hasNotification && (
           <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-flame-red ring-2 ring-white dark:ring-black animate-pulse" />
        )}
        {isActive && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-flame-orange rounded-full" />
        )}
      </div>
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, onOpenCreate, hasUnreadMessages }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none flex justify-center">
      <nav className="w-full max-w-md bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/20 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl h-[70px] flex justify-around items-center px-2 pointer-events-auto relative">
        
        <NavItem
          icon={<HomeIcon />}
          isActive={activeTab === Tab.Home}
          onClick={() => setActiveTab(Tab.Home)}
        />
        <NavItem
          icon={<FlameIcon isGradient={activeTab === Tab.Swipe} />}
          isActive={activeTab === Tab.Swipe}
          onClick={() => setActiveTab(Tab.Swipe)}
        />
        
        {/* Floating Center Button - Slightly smaller now */}
        <div className="relative -top-5">
            <button
                onClick={onOpenCreate}
                className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-flame-orange to-flame-red text-white rounded-2xl shadow-[0_8px_16px_rgba(255,107,53,0.4)] transform transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-[0_12px_20px_rgba(255,107,53,0.5)] ring-4 ring-gray-50 dark:ring-black"
                aria-label="Create"
            >
                <PlusIcon className="w-7 h-7" strokeWidth={2.5}/>
            </button>
        </div>

        <NavItem
          icon={<ChatIcon />}
          isActive={activeTab === Tab.Chat}
          onClick={() => setActiveTab(Tab.Chat)}
          hasNotification={hasUnreadMessages}
        />
        <NavItem
          icon={<UserIcon />}
          isActive={activeTab === Tab.Profile}
          onClick={() => setActiveTab(Tab.Profile)}
        />
      </nav>
    </div>
  );
};

export default BottomNav;
