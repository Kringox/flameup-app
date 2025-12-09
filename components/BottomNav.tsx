
import React from 'react';
import { Tab, AppTint } from '../types.ts';
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
  localTint?: AppTint;
}

const NavItem: React.FC<{
  label?: string;
  // FIX: Change icon type from React.ReactNode to React.ReactElement to fix cloneElement typing error.
  icon: React.ReactElement;
  isActive: boolean;
  onClick: () => void;
  hasNotification?: boolean;
  tint?: AppTint;
}> = ({ label, icon, isActive, onClick, hasNotification, tint = 'white' }) => {
  
  let activeClass = 'text-flame-orange scale-110';
  let inactiveClass = 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300';
  
  // Adjust text colors if background is red
  if (tint === 'red') {
      activeClass = 'text-white scale-110 drop-shadow-md';
      inactiveClass = 'text-red-300 hover:text-white';
  }
  
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 active:scale-90 group`}
    >
      <div className={`relative p-2 transition-all duration-300 ${isActive ? activeClass : inactiveClass}`}>
        {/* FIX: Cast icon to React.ReactElement<any> to resolve className prop error. */}
        {React.cloneElement(icon as React.ReactElement<any>, { 
            className: `w-7 h-7 ${isActive ? 'fill-current' : ''} transition-all duration-300`
        })}
        {hasNotification && (
           <span className={`absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-flame-red ring-2 animate-pulse ${tint === 'red' ? 'ring-red-900' : 'ring-white dark:ring-black'}`} />
        )}
        {isActive && (
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${tint === 'red' ? 'bg-white' : 'bg-flame-orange'}`} />
        )}
      </div>
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, onOpenCreate, hasUnreadMessages, localTint = 'white' }) => {
  
  let bgClass = 'bg-white/90 dark:bg-black/90 border-white/20 dark:border-zinc-800';
  
  if (localTint === 'black') {
      bgClass = 'bg-black/90 border-zinc-800';
  } else if (localTint === 'red') {
      bgClass = 'bg-red-900/90 border-red-800';
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none flex justify-center">
      <nav className={`w-full max-w-md backdrop-blur-xl border shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl h-[70px] flex justify-around items-center px-2 pointer-events-auto relative ${bgClass}`}>
        
        <NavItem
          icon={<HomeIcon />}
          isActive={activeTab === Tab.Home}
          onClick={() => setActiveTab(Tab.Home)}
          tint={localTint}
        />
        <NavItem
          icon={<FlameIcon isGradient={activeTab === Tab.Swipe && localTint !== 'red'} />}
          isActive={activeTab === Tab.Swipe}
          onClick={() => setActiveTab(Tab.Swipe)}
          tint={localTint}
        />
        
        {/* Floating Center Button */}
        <div className="relative -top-5">
            <button
                onClick={onOpenCreate}
                className={`w-14 h-14 flex items-center justify-center bg-gradient-to-br from-flame-orange to-flame-red text-white rounded-2xl shadow-[0_8px_16px_rgba(255,107,53,0.4)] transform transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-[0_12px_20px_rgba(255,107,53,0.5)] ring-4 ${localTint === 'red' ? 'ring-red-900' : 'ring-gray-50 dark:ring-black'}`}
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
          tint={localTint}
        />
        <NavItem
          icon={<UserIcon />}
          isActive={activeTab === Tab.Profile}
          onClick={() => setActiveTab(Tab.Profile)}
          tint={localTint}
        />
      </nav>
    </div>
  );
};

export default BottomNav;
