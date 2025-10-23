import React, { useState, useEffect } from 'react';
import BottomNav from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import SwipeScreen from './screens/SwipeScreen';
import ChatScreen from './screens/ChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import AuthScreen from './screens/AuthScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import LoadingScreen from './components/LoadingScreen';
import CreateScreen from './screens/CreateScreen';
import CommentScreen from './screens/CommentScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import FollowListScreen from './screens/FollowListScreen';
import { Tab, User, Post } from './types';
import { auth, db, firebaseInitializationError } from './firebaseConfig';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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


  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && db) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          setCurrentUser({ id: user.uid, ...userDocSnap.data() } as User);
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleProfileSetupComplete = async (newUserProfileData: Omit<User, 'id' | 'email' | 'profilePhotos' | 'followers' | 'following'> & { photos: File[] }) => {
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
        };
        
        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        setCurrentUser(newUser);
      } catch (error) {
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
  
  // Modal/Overlay screens
  if (isCreateScreenOpen) {
      return <CreateScreen user={currentUser} onClose={() => setIsCreateScreenOpen(false)} onSuccess={handleCreationSuccess} />;
  }
  if (isNotificationsOpen) {
    return <NotificationsScreen user={currentUser} onClose={() => setIsNotificationsOpen(false)} />;
  }
  if (viewingPostComments) {
    return <CommentScreen post={viewingPostComments} currentUser={currentUser} onClose={() => setViewingPostComments(null)} />;
  }
  if (followList) {
    return <FollowListScreen title={followList.title} userIds={followList.userIds} currentUser={currentUser} onClose={() => setFollowList(null)} />;
  }

  return (
    <div className="relative h-screen w-screen flex flex-col font-sans bg-gray-50 text-dark-gray overflow-hidden antialiased md:max-w-md md:mx-auto md:shadow-2xl md:my-4 md:rounded-2xl md:h-[calc(100vh-2rem)]">
      <main className="flex-1 overflow-hidden">
        <div className={`w-full h-full overflow-y-auto ${activeTab === Tab.Home ? '' : 'hidden'}`}>
          <HomeScreen currentUser={currentUser} onOpenComments={setViewingPostComments} onOpenNotifications={() => setIsNotificationsOpen(true)} />
        </div>
        <div className={`w-full h-full overflow-y-auto ${activeTab === Tab.Swipe ? '' : 'hidden'}`}>
          <SwipeScreen currentUser={currentUser} />
        </div>
        <div className={`w-full h-full overflow-y-auto ${activeTab === Tab.Chat ? '' : 'hidden'}`}>
          <ChatScreen />
        </div>
        <div className={`w-full h-full overflow-y-auto ${activeTab === Tab.Profile ? '' : 'hidden'}`}>
          <ProfileScreen user={currentUser} onUpdateUser={handleUpdateUser} onLogout={handleLogout} onOpenFollowList={setFollowList} />
        </div>
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} onOpenCreate={() => setIsCreateScreenOpen(true)} />
    </div>
  );
};

export default App;