
// FIX: Corrected import statement for React and its hooks.
import React, { useState, useEffect } from 'react';
// FIX: Added file extension to firebaseConfig import
import { auth, db, firebaseInitializationError } from './firebaseConfig.ts';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, getDoc, collection, query, where, Timestamp } from 'firebase/firestore';

// FIX: Added file extension to types import
import { User, Tab, Post, Notification, Chat, NotificationType } from './types.ts';
import { I18nProvider } from './contexts/I18nContext.ts';

// FIX: Added file extension to screen and component imports
import AuthScreen from './screens/AuthScreen.tsx';
import ProfileSetupScreen from './screens/ProfileSetupScreen.tsx';
import LoadingScreen from './components/LoadingScreen.tsx';
import BottomNav from './components/BottomNav.tsx';
import HomeScreen from './screens/HomeScreen.tsx';
import SwipeScreen from './screens/SwipeScreen.tsx';
import ChatScreen from './screens/ChatScreen.tsx';
import ProfileScreen from './screens/ProfileScreen.tsx';
import CreateScreen from './screens/CreateScreen.tsx';
// FIX: Add file extension to CommentScreen import to resolve module not found error.
import CommentScreen from './screens/CommentScreen.tsx';
import NotificationsScreen from './screens/NotificationsScreen.tsx';
import UserProfileScreen from './screens/UserProfileScreen.tsx';
import MatchModal from './components/MatchModal.tsx';
import InAppNotification from './components/InAppNotification.tsx';
import XPToast from './components/XPToast.tsx';
import { XpContext } from './contexts/XpContext.ts';
import SearchScreen from './screens/SearchScreen.tsx';
import PostGridViewer from './components/PostGridViewer.tsx';


type Theme = 'light' | 'dark' | 'system';
type AppTint = 'default' | 'ocean' | 'rose' | 'dusk';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<{
    isLoading: boolean;
    firebaseUser: FirebaseUser | null;
    currentUser: User | null | 'not_found';
  }>({
    isLoading: true,
    firebaseUser: null,
    currentUser: null,
  });
  
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Home);
  const [createScreenMode, setCreateScreenMode] = useState<'select' | 'post' | 'story' | null>(null);
  const [viewingPostComments, setViewingPostComments] = useState<Post | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [activeChatPartnerId, setActiveChatPartnerId] = useState<string | null>(null);
  const [matchNotification, setMatchNotification] = useState<Notification | null>(null);
  const [inAppNotification, setInAppNotification] = useState<any | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [theme, setTheme] = useState<Theme>((localStorage.getItem('theme') as Theme) || 'system');
  const [localTint, setLocalTint] = useState<AppTint>((localStorage.getItem('appTint') as AppTint) || 'default');
  const [xpToast, setXpToast] = useState<{ amount: number; key: number } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewingPostGrid, setViewingPostGrid] = useState<{ posts: Post[], startIndex: number } | null>(null);


  const showXpToast = (amount: number) => {
    setXpToast({ amount, key: Date.now() });
    setTimeout(() => {
        setXpToast(null);
    }, 2500); // Hide after 2.5 seconds
  };

  useEffect(() => {
    const root = window.document.documentElement;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (t: Theme) => {
      const isDark = t === 'dark' || (t === 'system' && systemTheme.matches);
      root.classList.toggle('dark', isDark);
      localStorage.setItem('theme', t);
    };

    applyTheme(theme);

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        if (theme === 'system') {
            root.classList.toggle('dark', e.matches);
        }
    };

    systemTheme.addEventListener('change', handleSystemThemeChange);
    return () => systemTheme.removeEventListener('change', handleSystemThemeChange);
}, [theme]);

  // Handle Local Tint Application
  useEffect(() => {
      localStorage.setItem('appTint', localTint);
  }, [localTint]);


  useEffect(() => {
    if (firebaseInitializationError) {
      setAuthState({ isLoading: false, firebaseUser: null, currentUser: null });
      return;
    }

    if (!auth) return;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthState(prev => ({ ...prev, firebaseUser: user }));
      } else {
        setAuthState({ isLoading: false, firebaseUser: null, currentUser: null });
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    let unsubscribeUser: () => void = () => {};
    let unsubscribeChats: () => void = () => {};

    if (authState.firebaseUser && db) {
      const userRef = doc(db, 'users', authState.firebaseUser.uid);
      unsubscribeUser = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const userData = { id: snapshot.id, ...snapshot.data() } as User;
          setAuthState(prev => ({ ...prev, currentUser: userData, isLoading: false }));

          // Listen for unread messages
          const chatsRef = collection(db, 'chats');
          const q = query(
              chatsRef, 
              where('userIds', 'array-contains', userData.id)
          );
          unsubscribeChats = onSnapshot(q, 
            (chatSnapshot) => {
                // Client-side filter to exclude chats the user has deleted.
                const anyUnread = chatSnapshot.docs
                  .filter(doc => !doc.data().deletedFor?.includes(userData.id))
                  .some(doc => {
                    const chatData = doc.data() as Chat;
                    return (chatData.unreadCount?.[userData.id] || 0) > 0;
                });
                setHasUnreadMessages(anyUnread);
            },
            (error) => {
                console.error("Firestore permission error fetching chats for unread status:", error);
                setHasUnreadMessages(false);
            }
          );

        } else {
          setAuthState(prev => ({ ...prev, currentUser: 'not_found', isLoading: false }));
        }
      });
    }

    return () => {
      unsubscribeUser();
      unsubscribeChats();
    };
  }, [authState.firebaseUser]);

  const handleUpdateUser = (updatedUser: User) => {
    setAuthState(prev => ({ ...prev, currentUser: updatedUser }));
  };
  
  const handleViewProfile = (userId: string) => {
    if (authState.currentUser && userId === authState.currentUser.id) {
        setActiveTab(Tab.Profile);
        setViewingUserId(null);
    } else {
        setViewingUserId(userId);
    }
  };
  
  const handleStartChat = (partnerId: string) => {
      setViewingUserId(null); // Close profile overlay when starting a chat
      setActiveTab(Tab.Chat);
      setActiveChatPartnerId(partnerId);
  }

  const handleShowMatch = async (notification: Notification) => {
      setIsNotificationsOpen(false);
      setMatchNotification(notification);
  }
  
  const handleSendMessageFromMatch = async () => {
      if (matchNotification) {
          handleStartChat(matchNotification.fromUser.id);
          setMatchNotification(null);
      }
  };

  const handleNewMatch = (matchedUser: User) => {
    if (!authState.currentUser) return;
    const pseudoNotification: Notification = {
      id: `match-${matchedUser.id}-${Date.now()}`,
      type: NotificationType.Match,
      fromUser: {
        id: matchedUser.id,
        name: matchedUser.name,
        profilePhoto: matchedUser.profilePhotos[0],
      },
      read: true,
      timestamp: Timestamp.now(),
    };
    setMatchNotification(pseudoNotification);
  };
  
  const openStoryCreator = () => {
      setCreateScreenMode('story');
  };

  const renderContent = () => {
    if (authState.isLoading) {
      return <LoadingScreen />;
    }

    if (firebaseInitializationError) {
      return <AuthScreen preloadedError={firebaseInitializationError} />;
    }

    if (!authState.firebaseUser) {
      return <AuthScreen />;
    }

    if (authState.currentUser === 'not_found') {
      return <ProfileSetupScreen user={authState.firebaseUser} onSetupComplete={handleUpdateUser} />;
    }
    
    if (!authState.currentUser) {
        return <LoadingScreen />;
    }
    
    const { currentUser } = authState;

    return (
      <I18nProvider language={currentUser.language || 'en'}>
        <XpContext.Provider value={{ showXpToast }}>
          <div className="relative w-screen h-screen max-w-md mx-auto flex flex-col bg-gray-50 dark:bg-black md:shadow-lg md:rounded-2xl md:my-4 md:h-[calc(100vh-2rem)] overflow-hidden">
            {xpToast && <XPToast key={xpToast.key} amount={xpToast.amount} />}
            
            {/* Main Content Area - Relative positioning allows UserProfile to overlay content but not BottomNav */}
            <main className="flex-1 overflow-y-auto relative">
              {activeTab === Tab.Home && <HomeScreen currentUser={currentUser} onOpenComments={setViewingPostComments} onOpenNotifications={() => setIsNotificationsOpen(true)} onViewProfile={handleViewProfile} onUpdateUser={handleUpdateUser} onOpenSearch={() => setIsSearchOpen(true)} onCreateStory={openStoryCreator} />}
              {activeTab === Tab.Swipe && <SwipeScreen currentUser={currentUser} onNewMatch={handleNewMatch} onUpdateUser={handleUpdateUser}/>}
              {activeTab === Tab.Chat && <ChatScreen currentUser={currentUser} activeChatPartnerId={activeChatPartnerId} onStartChat={handleStartChat} onCloseChat={() => setActiveChatPartnerId(null)} onUpdateUser={handleUpdateUser} onViewProfile={handleViewProfile} />}
              {activeTab === Tab.Profile && <ProfileScreen currentUser={currentUser} onUpdateUser={handleUpdateUser} onViewProfile={handleViewProfile} theme={theme} setTheme={setTheme} localTint={localTint} setLocalTint={setLocalTint} />}
              
              {/* User Profile Overlay - Renders INSIDE main, covering content but not Nav */}
              {viewingUserId && (
                <UserProfileScreen 
                    currentUserId={currentUser.id} 
                    viewingUserId={viewingUserId} 
                    onClose={() => setViewingUserId(null)} 
                    onStartChat={handleStartChat} 
                />
              )}
            </main>

            <BottomNav 
              activeTab={activeTab} 
              setActiveTab={(tab) => {
                  setActiveTab(tab);
                  setViewingUserId(null); // Clear viewing user when switching main tabs
              }} 
              onOpenCreate={() => setCreateScreenMode('select')} 
              hasUnreadMessages={hasUnreadMessages}
            />

            {/* Modals and Full Screen Overlays (Cover Nav) */}
            {createScreenMode && <CreateScreen user={currentUser} onClose={() => setCreateScreenMode(null)} initialMode={createScreenMode} />}
            {viewingPostComments && <CommentScreen post={viewingPostComments} currentUser={currentUser} onClose={() => setViewingPostComments(null)} onViewProfile={handleViewProfile} />}
            {isNotificationsOpen && <NotificationsScreen user={currentUser} onClose={() => setIsNotificationsOpen(false)} onShowMatch={handleShowMatch} onViewProfile={handleViewProfile} />}
            {isSearchOpen && <SearchScreen 
                currentUser={currentUser} 
                onClose={() => setIsSearchOpen(false)}
                onViewProfile={(userId) => {
                    setIsSearchOpen(false); 
                    handleViewProfile(userId);
                }}
                onOpenComments={(post) => {
                    setIsSearchOpen(false);
                    setViewingPostComments(post);
                }}
                onViewPostGrid={(posts, startIndex) => {
                    setViewingPostGrid({ posts, startIndex });
                }}
                onUpdateUser={handleUpdateUser}
            />}
            {viewingPostGrid && <PostGridViewer 
                posts={viewingPostGrid.posts}
                startIndex={viewingPostGrid.startIndex}
                currentUser={currentUser}
                onClose={() => setViewingPostGrid(null)}
                onOpenComments={setViewingPostComments}
                onViewProfile={handleViewProfile}
                onUpdateUser={handleUpdateUser}
            />}
            
            {matchNotification && authState.currentUser && (
                <MatchModal 
                    currentUser={authState.currentUser}
                    matchedUser={{id: matchNotification.fromUser.id, name: matchNotification.fromUser.name, profilePhotos: [matchNotification.fromUser.profilePhoto]} as any}
                    onSendMessage={handleSendMessageFromMatch}
                    onClose={() => setMatchNotification(null)}
                />
            )}
            {inAppNotification && (
                <InAppNotification 
                    notification={inAppNotification} 
                    onReply={(partnerId) => {
                        handleStartChat(partnerId);
                        setInAppNotification(null);
                    }} 
                    onClose={() => setInAppNotification(null)}
                />
            )}
          </div>
        </XpContext.Provider>
      </I18nProvider>
    );
  };
  
  return renderContent();
};

export default App;
