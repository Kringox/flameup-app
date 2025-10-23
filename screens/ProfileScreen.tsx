import React, { useState, useEffect } from 'react';
import { Post, User } from '../types';
import EditProfileScreen from './EditProfileScreen';
import SettingsScreen from './SettingsScreen';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import LoadingScreen from '../components/LoadingScreen';

const PLACEHOLDER_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';

interface ProfileScreenProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onUpdateUser, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  useEffect(() => {
    if (!db || !user?.id) {
        setIsLoadingPosts(false);
        return;
    };

    setIsLoadingPosts(true);
    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', user.id),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, (querySnapshot) => {
      const postList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setUserPosts(postList);
      setIsLoadingPosts(false);
    }, (error) => {
      console.error("Error fetching user posts in real-time:", error);
      setIsLoadingPosts(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [user.id]);


  const handleSaveProfile = (updatedUser: User) => {
    onUpdateUser(updatedUser);
    setIsEditing(false);
  };

  if (isEditing) {
    return <EditProfileScreen user={user} onSave={handleSaveProfile} onClose={() => setIsEditing(false)} />;
  }
  
  if (isSettingsOpen) {
    return <SettingsScreen onClose={() => setIsSettingsOpen(false)} onLogout={onLogout} />;
  }


  return (
    <div className="w-full pb-16">
      <header className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-dark-gray">{user.name}</h1>
        <button onClick={() => setIsSettingsOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
      </header>

      <div className="p-4">
        <div className="flex flex-col items-center">
          <img className="w-24 h-24 rounded-full object-cover" src={user.profilePhotos?.[0] || PLACEHOLDER_AVATAR} alt={user.name} />
          <h2 className="text-xl font-bold mt-3">{user.name}, {user.age}</h2>
          <p className="text-center text-gray-600 mt-2">{user.bio}</p>
        </div>

        <div className="flex justify-around text-center my-6">
            <div>
                <span className="font-bold text-lg">1,234</span>
                <span className="text-gray-500 block text-sm">Followers</span>
            </div>
            <div>
                <span className="font-bold text-lg">567</span>
                <span className="text-gray-500 block text-sm">Following</span>
            </div>
        </div>

        <div className="flex space-x-2">
            <button onClick={() => setIsEditing(true)} className="flex-1 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg">Edit Profile</button>
            <button className="flex-1 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg">Buy Coins 🪙</button>
        </div>
      </div>
        
      <div className="border-t border-gray-200">
          <h3 className="font-bold text-lg p-4">My Posts</h3>
          {isLoadingPosts ? (
            <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {userPosts.map(post => (
                  <div key={post.id} className="aspect-square bg-gray-200">
                      <img src={post.mediaUrls[0]} alt="User post" className="w-full h-full object-cover" />
                  </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};

export default ProfileScreen;