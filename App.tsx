
import React, { useState, useEffect } from 'react';
import { auth, db, firebaseInitializationError } from './firebaseConfig.ts';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
// FIX: Added QuerySnapshot and DocumentData to imports to fix typing issues with onSnapshot.
import { doc, onSnapshot, getDoc, collection, query, where, Timestamp, updateDoc, serverTimestamp, QuerySnapshot, DocumentData } from 'firebase/firestore';

import { User, Tab, Post, Notification, Chat, NotificationType, AppTint, UserLocation } from './types.ts';
import { I18nProvider } from './contexts/I18nContext.ts';

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
import XPToast from './components/XPToast.tsx';
import { XpContext } from './contexts/XpContext.ts';
import SearchScreen from './screens/SearchScreen.tsx';
import PostGridViewer from './components/PostGridViewer.tsx';
import DailyBonusWheel from './components/DailyBonusWheel.tsx';
import CallOverlay from './components/CallOverlay.tsx';
import ReviewModal from './components/ReviewModal.tsx';
import DeepLinkedPostHandler from './screens/DeepLinkedPostHandler.tsx';

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
  const [localTint, setLocalTint] = useState<AppTint>((localStorage.getItem('appTint') as AppTint) || 'white');
  const [xpToast, setXpToast] = useState<{ amount: number; key: number } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewingPostGrid, setViewingPostGrid] = useState<{ posts: Post[], startIndex: number } | null>(null);
  const [showDailyBonus, setShowDailyBonus] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [deepLinkedPostId, setDeepLinkedPostId] = useState<string | null>(null);
  
  // New state to trigger refresh on Home
  const [homeRefreshTrigger, setHomeRefreshTrigger] = useState(0);

  const showXpToast = (amount: number) => {
    setXpToast({ amount, key: Date.now() });
    setTimeout(() => {
        setXpToast(null);
    }, 2500); 
  };

  useEffect(() => {
    // Force Dark Mode Class
    document.documentElement.classList.add('dark');

    // Deep Link Handling with Query Param ?post=123 (More robust for simple hosting)
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    if (postId) {
        setDeepLinkedPostId(postId);
    }
  }, []);

  // Handle Local Tint Application (Optional preference, kept as it modifies colors within dark mode)
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

  // --- ONLINE STATUS HEARTBEAT ---
  useEffect(() => {
    // FIX: Depend on the stable firebaseUser object to prevent infinite loops.
    if (!authState.firebaseUser || !db) return;

    const userId = authState.firebaseUser.uid;
    const userRef = doc(db, 'users', userId);

    // Set online status when effect runs (on login) and page is visible
    if (document.visibilityState === 'visible') {
        updateDoc(userRef, { isOnline: true, lastOnline: serverTimestamp() }).catch(console.error);
    }

    // Set up an interval that just updates the timestamp
    const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            updateDoc(userRef, { lastOnline: serverTimestamp() }).catch(console.error);
        }
    }, 120000); // 2 minutes

    // Use visibility API for more accurate online status
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            updateDoc(userRef, { isOnline: false, lastOnline: serverTimestamp() }).catch(console.error);
        } else {
            updateDoc(userRef, { isOnline: true, lastOnline: serverTimestamp() }).catch(console.error);
        }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function to set offline on unmount/logout
    return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        // This updateDoc might run on logout, which is fine.
        updateDoc(userRef, { isOnline: false, lastOnline: serverTimestamp() }).catch(console.error);
    }
  }, [authState.firebaseUser]); 

  // --- LOCATION UPDATE ---
  useEffect(() => {
      // FIX: Depend on the stable firebaseUser object to prevent infinite loops. This effect now runs once on login.
      if (!authState.firebaseUser || !db) return;
      if (!('geolocation' in navigator)) return;

      const userId = authState.firebaseUser.uid;
      const userRef = doc(db, 'users', userId);

      navigator.geolocation.getCurrentPosition(
          async (position) => {
              const newLat = position.coords.latitude;
              const newLng = position.coords.longitude;
              
              // To avoid depending on the looping state, we fetch the document once.
              const userSnap = await getDoc(userRef);
              if (!userSnap.exists()) return;
              const currentLocation = userSnap.data().location as UserLocation | undefined;
              
              const currentLat = currentLocation?.latitude;
              const currentLng = currentLocation?.longitude;
              
              const dist = Math.sqrt(Math.pow((newLat - (currentLat || 0)), 2) + Math.pow((newLng - (currentLng || 0)), 2));
              
              if (!currentLocation || dist > 0.001) { // approx 100 meters
                  try {
                      await updateDoc(userRef, {
                          location: {
                              latitude: newLat,
                              longitude: newLng,
                              cityName: currentLocation?.cityName || "Unknown" 
                          }
                      });
                  } catch (e) {
                      console.error("Error updating location", e);
                  }
              }
          },
          (error) => {
              console.log("Location error:", error);
          },
          { enableHighAccuracy: true }
      );
  }, [authState.firebaseUser]);

  useEffect(() => {
    let unsubscribeUser: () => void = () => {};
    let unsubscribeChats: () => void = () => {};

    if (authState.firebaseUser && db) {
      const userRef = doc(db, 'users', authState.firebaseUser.uid);
      
      unsubscribeUser = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() || {};
          // Safely construct user object, ensuring coins has a default if missing
          // This is critical for keeping wallet in sync
          const userData = { 
              id: snapshot.id, 
              ...data,
              coins: data.coins !== undefined ? data.coins : 0,
          } as User;
          
          if (!authState.currentUser) {
              if (!userData.lastDailyBonus) {
                  setShowDailyBonus(true);
              } else {
                  const lastBonus = userData.lastDailyBonus.toDate().getTime();
                  const now = Date.now();
                  if (now - lastBonus > 24 * 60 * 60 * 1000) {
                      setShowDailyBonus(true);
                  }
              }
          }

          setAuthState(prev => ({ ...prev, currentUser: userData, isLoading: false }));

          const chatsRef = collection(db, 'chats');
          const q = query(
              chatsRef, 
              where('userIds', 'array-contains', userData.id)
          );
          // FIX: Explicitly type chatSnapshot as QuerySnapshot to resolve 'docs' property error.
          unsubscribeChats = onSnapshot(q, 
            (chatSnapshot: QuerySnapshot<DocumentData>) => {
                const anyUnread = chatSnapshot.docs
                  .filter(doc => !doc.data().deletedFor?.includes(userData.id))
                  .some(doc => {
                    const chatData = doc.data() as Chat;
                    return (chatData.unreadCount?.[userData.id] || 0) > 0;
                });
                setHasUnreadMessages(anyUnread);
            },
            (error) => { console.error(error); setHasUnreadMessages(false); }
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
    if (authState.currentUser && typeof authState.currentUser !== 'string' && userId === authState.currentUser.id) {
        setActiveTab(Tab.Profile);
        setViewingUserId(null);
    } else {
        setViewingUserId(userId);
    }
  };
  
  const handleStartChat = (partnerId: string) => {
      setViewingUserId(null); 
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
    if (!authState.currentUser || typeof authState.currentUser === 'string') return;
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
    if (authState.isLoading) return <LoadingScreen />;
    if (firebaseInitializationError) return <AuthScreen preloadedError={firebaseInitializationError} />;
    if (!authState.firebaseUser) return <AuthScreen />;
    if (authState.currentUser === 'not_found') return <ProfileSetupScreen user={authState.firebaseUser} onSetupComplete={handleUpdateUser} />;
    if (!authState.currentUser) return <LoadingScreen />;
    
    const { currentUser } = authState;

    // Handle Deep Link
    if (deepLinkedPostId) {
        return (
            <I18nProvider language={currentUser.language || 'en'}>
                <div className="relative w-screen h-screen max-w-md mx-auto flex flex-col bg-black md:shadow-lg md:rounded-2xl md:my-4 md:h-[calc(100vh-2rem)] overflow-hidden">
                    <DeepLinkedPostHandler
                        postId={deepLinkedPostId}
                        currentUser={currentUser}
                        onClose={() => {
                            window.history.replaceState({}, document.title, window.location.pathname); // Clear search params
                            setDeepLinkedPostId(null);
                        }}
                        onUpdateUser={handleUpdateUser}
                        onViewProfile={handleViewProfile}
                        onOpenComments={setViewingPostComments}
                    />
                    {viewingPostComments && <CommentScreen post={viewingPostComments} currentUser={currentUser} onClose={() => setViewingPostComments(null)} onViewProfile={handleViewProfile} />}
                </div>
            </I18nProvider>
        );
    }

    return (
      <I18nProvider language={currentUser.language || 'en'}>
        <XpContext.Provider value={{ showXpToast }}>
          <div className="relative w-screen h-screen max-w-md mx-auto flex flex-col bg-black md:shadow-lg md:rounded-2xl md:my-4 md:h-[calc(100vh-2rem)] overflow-hidden">
            {xpToast && <XPToast key={xpToast.key} amount={xpToast.amount} />}
            
            <CallOverlay currentUser={currentUser} />

            <main className="flex-1 relative overflow-hidden bg-black">
              <div className={`w-full h-full overflow-y-auto ${viewingUserId ? 'hidden' : 'block'}`}>
                  {activeTab === Tab.Home && <HomeScreen currentUser={currentUser} onOpenComments={setViewingPostComments} onOpenNotifications={() => setIsNotificationsOpen(true)} onViewProfile={handleViewProfile} onUpdateUser={handleUpdateUser} onOpenSearch={() => setIsSearchOpen(true)} onCreateStory={openStoryCreator} refreshTrigger={homeRefreshTrigger} />}
                  {activeTab === Tab.Swipe && <SwipeScreen currentUser={currentUser} onNewMatch={handleNewMatch} onUpdateUser={handleUpdateUser}/>}
                  {activeTab === Tab.Chat && <ChatScreen currentUser={currentUser} activeChatPartnerId={activeChatPartnerId} onStartChat={handleStartChat} onCloseChat={() => setActiveChatPartnerId(null)} onUpdateUser={handleUpdateUser} onViewProfile={handleViewProfile} />}
                  {activeTab === Tab.Profile && <ProfileScreen currentUser={currentUser} onUpdateUser={handleUpdateUser} onViewProfile={handleViewProfile} localTint={localTint} setLocalTint={setLocalTint} onViewPostGrid={(posts, index) => setViewingPostGrid({posts, startIndex: index})} />}
              </div>
              
              {viewingUserId && (
                <UserProfileScreen 
                    currentUserId={currentUser.id} 
                    viewingUserId={viewingUserId} 
                    onClose={() => setViewingUserId(null)} 
                    onStartChat={handleStartChat} 
                />
              )}
            </main>

            {!activeChatPartnerId && (
                <BottomNav 
                  activeTab={activeTab} 
                  setActiveTab={(tab) => {
                      if (tab === Tab.Home && activeTab === Tab.Home) {
                          setHomeRefreshTrigger(prev => prev + 1);
                      }
                      setActiveTab(tab);
                      setViewingUserId(null); 
                  }} 
                  onOpenCreate={() => setCreateScreenMode('select')} 
                  hasUnreadMessages={hasUnreadMessages}
                  localTint={localTint}
                />
            )}

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
                    currentUser={authState.currentUser as User}
                    matchedUser={{id: matchNotification.fromUser.id, name: matchNotification.fromUser.name, profilePhotos: [matchNotification.fromUser.profilePhoto]} as any}
                    onSendMessage={handleSendMessageFromMatch}
                    onClose={() => {
                        setMatchNotification(null);
                        if (authState.currentUser && typeof authState.currentUser !== 'string') {
                            const now = Date.now();
                            const lastPrompt = (authState.currentUser as User).lastReviewPrompt?.toDate().getTime() || 0;
                            // Prompt if never prompted, or if it has been over 3 months
                            if (!lastPrompt || now - lastPrompt > 90 * 24 * 60 * 60 * 1000) {
                                setShowReviewModal(true);
                            }
                        }
                    }}
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
            
            {showDailyBonus && authState.currentUser && (
                <DailyBonusWheel 
                    currentUser={authState.currentUser as User} 
                    onClose={() => setShowDailyBonus(false)} 
                    onUpdateUser={handleUpdateUser}
                />
            )}

            {showReviewModal && (
                <ReviewModal
                    onClose={() => {
                        setShowReviewModal(false);
                        if(db && authState.currentUser && typeof authState.currentUser !== 'string') {
                            const userRef = doc(db, 'users', authState.currentUser.id);
                            updateDoc(userRef, { lastReviewPrompt: serverTimestamp() });
                        }
                    }}
                    onSubmit={(rating, comment) => {
                        console.log('Review Submitted:', { rating, comment });
                        // Here you would send the feedback to your backend/analytics
                    }}
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
