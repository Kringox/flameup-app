import React, { useState, useEffect, useRef } from 'react';
import BottomNav from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import SwipeScreen from './screens/SwipeScreen';
import ChatScreen from './screens/ChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import AuthScreen from './screens/AuthScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import LoadingScreen from './components/LoadingScreen';
import CreateScreen from './screens/CreateScreen';
import CommentScreen from './screens/CommentScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import FollowListScreen from './screens/FollowListScreen';
import InAppNotification from './components/InAppNotification';
import MatchModal from './components/MatchModal';
import { Tab, User, Post, Chat, Notification as NotificationType, NotificationType as NotifEnum } from './types';
import { auth, db, firebaseInitializationError } from './firebaseConfig';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { uploadPhotos } from './utils/photoUploader';

const App: React.FC = () => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Home);
  
  // Screen visibility states
  const [isCreateScreenOpen, setIsCreateScreenOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [viewingPostComments, setViewingPostComments] = useState<Post | null>(null);
  const [followList, setFollowList] = useState<{title: 'Followers' | 'Following', userIds: string[]} | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [activeChatPartnerId, setActiveChatPartnerId] = useState<string | null>(null);

  // Notification states
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [notification, setNotification] = useState<{ senderName: string; messageText: string; profilePhoto: string; partnerId: string; } | null>(null);
  const [matchNotification, setMatchNotification] = useState<NotificationType | null>(null);
  const prevChatsRef = useRef<Chat[]>([]);


  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setCurrentUser(null);
        setIsLoading(false);
      }
    });
    
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!db || !firebaseUser) {
        setIsLoading(false);
        return;
    }

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (userDocSnap) => {
        if (userDocSnap.exists()) {
            const userData = { id: firebaseUser.uid, ...userDocSnap.data() } as User;
            setCurrentUser(userData);
        } else {
            setCurrentUser(null); 
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Error listening to user document:", error);
        setCurrentUser(null);
        setIsLoading(false);
    });
    
    // Global chat listener for notifications
    const chatsQuery = query(collection(db, 'chats'), where('userIds', 'array-contains', firebaseUser.uid));
    const unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
        const newChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
        
        // Check for new messages to show popup notification
        newChats.forEach(chat => {
            const oldChat = prevChatsRef.current.find(c => c.id === chat.id);
            const isNewMessage = !oldChat || chat.lastMessage?.timestamp > oldChat.lastMessage?.timestamp;
            const sentByPartner = chat.lastMessage?.senderId !== firebaseUser.uid;
            const isNotViewingChat = chat.id.replace(/_/g, '').replace(firebaseUser.uid, '') !== activeChatPartnerId;

            if (isNewMessage && sentByPartner && isNotViewingChat) {
                const partnerId = chat.userIds.find(id => id !== firebaseUser.uid)!;
                const partnerData = chat.users[partnerId];
                setNotification({
                    senderName: partnerData.name,
                    messageText: chat.lastMessage!.text,
                    profilePhoto: partnerData.profilePhoto,
                    partnerId: partnerId,
                });
            }
        });
        
        setAllChats(newChats);
        prevChatsRef.current = newChats;
    });

    return () => {
      unsubscribeUser();
      unsubscribeChats();
    };
  }, [firebaseUser, activeChatPartnerId]);


  const handleProfileSetupComplete = async (newUserProfileData: Omit<User, 'id' | 'email' | 'profilePhotos' | 'followers' | 'following' | 'coins' | 'createdAt'> & { photos: File[] }) => {
    if (firebaseUser && db) {
      setIsLoading(true);
      try {
        const { photos, ...profileData } = newUserProfileData;
        
        const photoURLs = await uploadPhotos(photos);

        if (photoURLs.length === 0) {
          throw new Error("Photo upload failed. Please try again.");
        }

        const newUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          ...profileData,
          profilePhotos: photoURLs,
          followers: [],
          following: [],
          coins: 100, // Starting coins
          createdAt: serverTimestamp(),
        };
        
        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        // The onSnapshot listener will automatically update `currentUser` with the full profile data from Firestore.
        // No need to call setCurrentUser here.
      } catch (error: any) {
        console.error("Error setting up profile:", error);
        alert(`Could not set up profile. Please try again.\n\nError: ${String(error)}`);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleUpdateUser = async (updatedUser: User) => {
    if(firebaseUser && db) {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userDocRef, updatedUser, { merge: true });
      setCurrentUser(updatedUser);
    }
  };

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleCreationSuccess = () => {
    setIsCreateScreenOpen(false);
    setActiveTab(Tab.Home);
  };
  
  const handleViewProfile = (userId: string) => {
    if (currentUser && userId === currentUser.id) {
        setActiveTab(Tab.Profile);
        return;
    }
    setViewingUserId(userId);
  };

  const handleStartChat = (partnerId: string) => {
    setViewingUserId(null); 
    setMatchNotification(null); // Close match modal if open
    setActiveChatPartnerId(partnerId);
    setActiveTab(Tab.Chat);
  };
  
  const hasUnreadMessages = currentUser ? allChats.some(chat => (chat.unreadCount?.[currentUser.id] || 0) > 0) : false;

  const handleShowMatch = (notification: NotificationType) => {
      if(notification.type === NotifEnum.Match){
          setMatchNotification(notification);
      }
      setIsNotificationsOpen(false);
  }


  if (firebaseInitializationError) {
    return <AuthScreen preloadedError={firebaseInitializationError} />;
  }
  if (isLoading) {
    return <LoadingScreen />;
  }
  if (!firebaseUser) {
    return <AuthScreen />;
  }
  if (!currentUser) {
    return <ProfileSetupScreen onComplete={handleProfileSetupComplete} />;
  }

  return (
    <div className="relative h-screen w-screen flex flex-col font-sans bg-gray-50 text-dark-gray antialiased md:max-w-md md:mx-auto md:shadow-2xl md:my-4 md:rounded-2xl md:h-[calc(100vh-2rem)] overflow-hidden">
      
      {notification && (
          <InAppNotification
              notification={notification}
              onReply={(partnerId) => {
                  handleStartChat(partnerId);
                  setNotification(null); // Close notification on reply
              }}
              onClose={() => setNotification(null)}
          />
      )}
      
      {matchNotification && (
          <MatchModal
            matchedUser={matchNotification.fromUser}
            currentUser={currentUser}
            onSendMessage={() => handleStartChat(matchNotification.fromUser.id)}
            onClose={() => setMatchNotification(null)}
          />
      )}


      {/* Overlays - Rendered on top of main content */}
      {isCreateScreenOpen && <CreateScreen user={currentUser} onClose={() => setIsCreateScreenOpen(false)} onSuccess={handleCreationSuccess} />}
      {isNotificationsOpen && <NotificationsScreen user={currentUser} onClose={() => setIsNotificationsOpen(false)} onShowMatch={handleShowMatch}/>}
      {viewingPostComments && <CommentScreen post={viewingPostComments} currentUser={currentUser} onClose={() => setViewingPostComments(null)} />}
      {followList && <FollowListScreen title={followList.title} userIds={followList.userIds} currentUser={currentUser} onClose={() => setFollowList(null)} />}
      {viewingUserId && <UserProfileScreen userId={viewingUserId} currentUser={currentUser} onClose={() => setViewingUserId(null)} onOpenComments={setViewingPostComments} onStartChat={handleStartChat} />}

      {/* Main App Content */}
      <main className="flex-1 overflow-hidden">
        <div className={`w-full h-full overflow-y-auto ${activeTab === Tab.Home ? '' : 'hidden'}`}>
          <HomeScreen currentUser={currentUser} onOpenComments={setViewingPostComments} onOpenNotifications={() => setIsNotificationsOpen(true)} onViewProfile={handleViewProfile} />
        </div>
        <div className={`w-full h-full overflow-y-auto ${activeTab === Tab.Swipe ? '' : 'hidden'}`}>
          <SwipeScreen currentUser={currentUser} onStartChat={handleStartChat}/>
        </div>
        <div className={`w-full h-full ${activeTab === Tab.Chat ? '' : 'hidden'}`}>
          <ChatScreen 
            currentUser={currentUser} 
            activeChatPartnerId={activeChatPartnerId}
            onStartChat={setActiveChatPartnerId}
            onCloseChat={() => setActiveChatPartnerId(null)}
            onUpdateUser={handleUpdateUser}
          />
        </div>
        <div className={`w-full h-full overflow-y-auto ${activeTab === Tab.Profile ? '' : 'hidden'}`}>
          <ProfileScreen 
            user={currentUser} 
            isActive={activeTab === Tab.Profile}
            onUpdateUser={handleUpdateUser} 
            onLogout={handleLogout} 
            onOpenFollowList={setFollowList} 
            onOpenComments={setViewingPostComments}
          />
        </div>
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} onOpenCreate={() => setIsCreateScreenOpen(true)} hasUnreadMessages={hasUnreadMessages} />
    </div>
  );
};

export default App;