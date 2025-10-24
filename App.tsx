import React, { useState, useEffect } from 'react';
// FIX: Added file extension to firebaseConfig import
import { auth, db, firebaseInitializationError } from './firebaseConfig.ts';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, getDoc, collection, query, where } from 'firebase/firestore';

// FIX: Added file extension to types import
import { User, Tab, Post, Notification, Chat } from './types.ts';

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
import CommentScreen from './screens/CommentScreen.tsx';
import NotificationsScreen from './screens/NotificationsScreen.tsx';
import UserProfileScreen from './screens/UserProfileScreen.tsx';
import MatchModal from './components/MatchModal.tsx';
import InAppNotification from './components/InAppNotification.tsx';

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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingPostComments, setViewingPostComments] = useState<Post | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [activeChatPartnerId, setActiveChatPartnerId] = useState<string | null>(null);
  const [matchNotification, setMatchNotification] = useState<Notification | null>(null);
  const [inAppNotification, setInAppNotification] = useState<any | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

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
          const q = query(chatsRef, where('userIds', 'array-contains', userData.id));
          unsubscribeChats = onSnapshot(q, (chatSnapshot) => {
            const anyUnread = chatSnapshot.docs.some(doc => {
              const chatData = doc.data() as Chat;
              return (chatData.unreadCount?.[userData.id] || 0) > 0;
            });
            setHasUnreadMessages(anyUnread);
          });

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
        return <LoadingScreen />; // Should be brief
    }
    
    const { currentUser } = authState;

    return (
      <div className="relative w-screen h-screen max-w-md mx-auto flex flex-col bg-gray-50 md:shadow-lg md:rounded-2xl md:my-4 md:h-[calc(100vh-2rem)]">
        <main className="flex-1 overflow-y-auto">
          {activeTab === Tab.Home && <HomeScreen currentUser={currentUser} onOpenComments={setViewingPostComments} onOpenNotifications={() => setIsNotificationsOpen(true)} onViewProfile={handleViewProfile} />}
          {activeTab === Tab.Swipe && <SwipeScreen />}
          {activeTab === Tab.Chat && <ChatScreen currentUser={currentUser} activeChatPartnerId={activeChatPartnerId} onStartChat={handleStartChat} onCloseChat={() => setActiveChatPartnerId(null)} onUpdateUser={handleUpdateUser} onViewProfile={handleViewProfile} />}
          {activeTab === Tab.Profile && <ProfileScreen currentUser={currentUser} onUpdateUser={handleUpdateUser} onViewProfile={handleViewProfile} />}
        </main>

        <BottomNav 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onOpenCreate={() => setIsCreateOpen(true)} 
          hasUnreadMessages={hasUnreadMessages}
        />

        {/* Modals and Overlays */}
        {isCreateOpen && <CreateScreen user={currentUser} onClose={() => setIsCreateOpen(false)} />}
        {viewingPostComments && <CommentScreen post={viewingPostComments} currentUser={currentUser} onClose={() => setViewingPostComments(null)} onViewProfile={handleViewProfile} />}
        {isNotificationsOpen && <NotificationsScreen user={currentUser} onClose={() => setIsNotificationsOpen(false)} onShowMatch={handleShowMatch} onViewProfile={handleViewProfile} />}
        {viewingUserId && <UserProfileScreen currentUserId={currentUser.id} viewingUserId={viewingUserId} onClose={() => setViewingUserId(null)} onStartChat={handleStartChat} />}
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
    );
  };
  
  return renderContent();
};

export default App;