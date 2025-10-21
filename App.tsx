import React, { useState, useEffect } from 'react';
import BottomNav from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import SwipeScreen from './screens/SwipeScreen';
import ChatScreen from './screens/ChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import AuthScreen from './screens/AuthScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import LoadingScreen from './components/LoadingScreen';
import { Tab, User } from './types';
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const App: React.FC = () => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Home);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // User is signed in, check for their profile in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          // Profile exists, set current user
          setCurrentUser({ id: user.uid, ...userDocSnap.data() } as User);
        } else {
          // User exists in Auth, but no profile in Firestore (needs setup)
          setCurrentUser(null);
        }
      } else {
        // User is signed out
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleProfileSetupComplete = async (newUserProfileData: Omit<User, 'id' | 'email' | 'profilePhotos'> & { photos: File[] }) => {
    if (firebaseUser) {
      setIsLoading(true);
      try {
        // Generate placeholder URLs instead of uploading to Firebase Storage
        const { photos, ...profileData } = newUserProfileData;
        const photoURLs = photos.map((_, index) => {
          const seed = `${firebaseUser.uid}-${Date.now()}-${index}`;
          return `https://picsum.photos/seed/${seed}/800/1200`;
        });

        const newUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          ...profileData,
          profilePhotos: photoURLs,
        };
        
        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        setCurrentUser(newUser);
      } catch (error) {
        console.error("Error setting up profile:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Could not set up profile. Please try again.\n\nError: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleUpdateUser = async (updatedUser: User) => {
    if(firebaseUser) {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userDocRef, updatedUser, { merge: true });
      setCurrentUser(updatedUser);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!firebaseUser) {
    return <AuthScreen />;
  }

  if (!currentUser) {
    return <ProfileSetupScreen onComplete={handleProfileSetupComplete} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case Tab.Home:
        return <HomeScreen />;
      case Tab.Swipe:
        return <SwipeScreen currentUser={currentUser} />;
      case Tab.Chat:
        return <ChatScreen />;
      case Tab.Profile:
        return <ProfileScreen user={currentUser} onUpdateUser={handleUpdateUser} />;
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
