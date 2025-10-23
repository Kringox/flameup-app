
import React, { useState, useEffect } from 'react';
import { Post, User, NotificationType } from '../types';
import { db } from '../firebaseConfig';
import { collection, doc, getDoc, query, where, onSnapshot, orderBy, writeBatch, arrayUnion, arrayRemove, serverTimestamp, addDoc } from 'firebase/firestore';
import PostDetailView from '../components/PostDetailView';

const PLACEHOLDER_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';

interface UserProfileScreenProps {
  userId: string;
  currentUser: User;
  onClose: () => void;
  onOpenComments: (post: Post) => void;
}

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ userId, currentUser, onClose, onOpenComments }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!db) return;
    setIsLoading(true);

    const fetchUserData = async () => {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
        setUser(userData);
        setIsFollowing(userData.followers.includes(currentUser.id));
      } else {
        console.error("User not found");
        onClose();
      }
    };
    
    fetchUserData();
  }, [userId, currentUser.id, onClose]);

  useEffect(() => {
    if (!db || !user) return;

    const postsQuery = query(collection(db, 'posts'), where('userId', '==', user.id), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
        const posts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                userId: data.userId,
                mediaUrls: data.mediaUrls,
                caption: data.caption,
                likedBy: data.likedBy || [],
                commentCount: data.commentCount || 0,
                timestamp: data.timestamp,
                user: {
                    id: data.userId,
                    name: data.userName,
                    profilePhoto: data.userProfilePhoto,
                },
            } as Post;
          });
      setUserPosts(posts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching user posts:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);
  
  const handleFollowToggle = async () => {
    if (!db || !user) return;
    
    const newFollowingState = !isFollowing;
    setIsFollowing(newFollowingState);
    
    if (user) {
        setUser({ ...user, followers: newFollowingState ? [...user.followers, currentUser.id] : user.followers.filter(id => id !== currentUser.id) });
    }

    const currentUserRef = doc(db, 'users', currentUser.id);
    const targetUserRef = doc(db, 'users', user.id);
    const batch = writeBatch(db);

    if (newFollowingState) {
        batch.update(currentUserRef, { following: arrayUnion(user.id) });
        batch.update(targetUserRef, { followers: arrayUnion(currentUser.id) });
    } else {
        batch.update(currentUserRef, { following: arrayRemove(user.id) });
        batch.update(targetUserRef, { followers: arrayRemove(currentUser.id) });
    }
    
    try {
        await batch.commit();
        if(newFollowingState) {
            const notificationsRef = collection(db, 'users', user.id, 'notifications');
            await addDoc(notificationsRef, {
              type: NotificationType.Follow,
              fromUser: {
                  id: currentUser.id,
                  name: currentUser.name,
                  profilePhoto: currentUser.profilePhotos?.[0] || '',
              },
              read: false,
              timestamp: serverTimestamp(),
            });
        }
    } catch(error) {
        console.error("Failed to update follow status:", error);
        setIsFollowing(!newFollowingState);
    }
  };

  const handleOpenCommentsFromDetail = (post: Post) => {
    setSelectedPost(null);
    onOpenComments(post);
  };
  
   const handlePostUpdated = (updatedPost: Post) => {
    setUserPosts(currentPosts => currentPosts.map(p => p.id === updatedPost.id ? updatedPost : p));
    if (selectedPost && selectedPost.id === updatedPost.id) {
        setSelectedPost(updatedPost);
    }
  }

  if (isLoading || !user) {
    return (
        <div className="absolute inset-0 bg-white z-[70] flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
    );
  }

  return (
    <>
    <div className="absolute inset-0 bg-white z-[70] flex flex-col animate-slide-in">
        <style>{`.animate-slide-in { animation: slideInFromRight 0.3s ease-out; } @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        <header className="flex items-center p-4 border-b border-gray-200 bg-white sticky top-0">
             <button onClick={onClose} className="text-lg text-gray-600 w-8">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-xl font-bold text-dark-gray text-center flex-1">{user.name}</h1>
            <div className="w-8"></div>
        </header>
        
        <div className="flex-1 overflow-y-auto pb-16">
            <div className="p-4">
                <div className="flex flex-col items-center">
                    <img className="w-24 h-24 rounded-full object-cover" src={user.profilePhotos?.[0] || PLACEHOLDER_AVATAR} alt={user.name} />
                    <h2 className="text-xl font-bold mt-3">{user.name}, {user.age}</h2>
                    <p className="text-center text-gray-600 mt-2">{user.bio}</p>
                </div>

                <div className="flex justify-around text-center my-6">
                    <div>
                        <span className="font-bold text-lg">{user.followers?.length || 0}</span>
                        <span className="text-gray-500 block text-sm">Followers</span>
                    </div>
                    <div>
                        <span className="font-bold text-lg">{user.following?.length || 0}</span>
                        <span className="text-gray-500 block text-sm">Following</span>
                    </div>
                </div>

                <div className="flex space-x-2">
                    <button onClick={handleFollowToggle} className={`flex-1 font-semibold py-2 px-4 rounded-lg ${isFollowing ? 'bg-gray-200 text-gray-800' : 'bg-flame-orange text-white'}`}>{isFollowing ? 'Following' : 'Follow'}</button>
                    <button className="flex-1 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg">Message</button>
                </div>
            </div>

            <div className="border-t border-gray-200">
                <h3 className="font-bold text-lg p-4">{user.name}'s Posts</h3>
                {isLoading ? (
                    <div className="flex justify-center items-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                ) : (
                <div className="grid grid-cols-3 gap-1">
                    {userPosts.map(post => (
                        <div key={post.id} className="aspect-square bg-gray-200 cursor-pointer" onClick={() => setSelectedPost(post)}>
                            <img src={post.mediaUrls[0]} alt="User post" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
                )}
                 {userPosts.length === 0 && !isLoading && (
                    <p className="text-center text-gray-500 py-8 col-span-3">This user hasn't posted anything yet.</p>
                )}
            </div>
        </div>
    </div>
    {selectedPost && (
        <PostDetailView
          post={selectedPost}
          currentUser={currentUser}
          onClose={() => setSelectedPost(null)}
          onPostDeleted={() => setSelectedPost(null)}
          onPostUpdated={handlePostUpdated}
          onOpenComments={handleOpenCommentsFromDetail}
        />
      )}
    </>
  );
};

export default UserProfileScreen;
