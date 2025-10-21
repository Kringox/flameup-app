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
  
  // CRITICAL: Check if Firebase is configured. If not, show an error screen.
  // This prevents the blank screen crash if the API key is missing.
  if (!auth || !db) {
    return (
      <div className="h-screen w-screen flex flex-col justify-center items-center bg-red-100 p-4 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <h1 className="text-2xl font-bold text-red-800">Application Configuration Error</h1>
        <p className="text-red-600 mt-2 max-w-md">
          The connection to the app's services could not be established. This is usually due to a missing configuration key.
        </p>
        <p className="mt-6 text-sm text-gray-700 bg-gray-100 p-3 rounded-md border border-gray-200">
          <strong>Action Required:</strong> Please ensure the <code>API_KEY</code> environment variable is set correctly in your hosting provider (e.g., Vercel).
        </p>
      </div>
    );
  }

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