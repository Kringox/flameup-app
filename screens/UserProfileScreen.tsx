import React, { useState, useEffect } from 'react';
import { Post, User, NotificationType, StoryHighlight } from '../types';
import { db } from '../firebaseConfig';
import { collection, doc, getDoc, query, where, onSnapshot, orderBy, writeBatch, arrayUnion, arrayRemove, serverTimestamp, addDoc, runTransaction } from 'firebase/firestore';
import PostDetailView from '../components/PostDetailView';
import VerifiedIcon from '../components/icons/VerifiedIcon';
import ImageViewer from '../components/ImageViewer';
import EyeIcon from '../components/icons/EyeIcon';
import PlusIcon from '../components/icons/PlusIcon';


const PLACEHOLDER_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';

interface UserProfileScreenProps {
  userId: string;
  currentUser: User;
  onClose: () => void;
  onOpenComments: (post: Post) => void;
  onStartChat: (userId: string) => void;
  onViewProfile: (userId: string) => void; // Added for consistency, might be used for chained profiles
}

const HighlightCircle: React.FC<{ highlight: StoryHighlight }> = ({ highlight }) => (
  <div className="flex flex-col items-center space-y-1 text-center flex-shrink-0">
    <button className="w-16 h-16 rounded-full p-0.5 bg-gray-300">
       <img
          className="w-full h-full rounded-full object-cover"
          src={highlight.coverPhotoUrl}
          alt={highlight.title}
        />
    </button>
    <span className="text-xs w-16 truncate">{highlight.title}</span>
  </div>
);


const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ userId, currentUser, onClose, onOpenComments, onStartChat, onViewProfile }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  // MOCK DATA for story highlights
  const mockHighlights: StoryHighlight[] = user?.isPremium ? 
    [
        { id: 'h1', title: 'Adventures', coverPhotoUrl: 'https://picsum.photos/seed/adv/200', storyIds: [] },
        { id: 'h2', title: 'My Dog', coverPhotoUrl: 'https://picsum.photos/seed/doggo/200', storyIds: [] },
    ] :
    [
        { id: 'h1', title: 'Adventures', coverPhotoUrl: 'https://picsum.photos/seed/adv/200', storyIds: [] },
    ];

  useEffect(() => {
    if (!db) return;
    setIsLoading(true);

    const userDocRef = doc(db, 'users', userId);
    const unsubscribeUser = onSnapshot(userDocRef, (userDocSnap) => {
      if (userDocSnap.exists()) {
        const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
        setUser(userData);
      } else {
        console.error("User not found");
        onClose();
      }
    }, (error) => {
        console.error("Error fetching user data:", error);
        onClose();
    });

    return () => unsubscribeUser();
  }, [userId, onClose]);

  useEffect(() => {
    if (!db || !user) return;

    const postsQuery = query(collection(db, 'posts'), where('userId', '==', user.id), orderBy('timestamp', 'desc'));
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
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
                    isPremium: user.isPremium
                },
            } as Post;
          });
      setUserPosts(posts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching user posts:", error);
      setIsLoading(false);
    });

    return () => unsubscribePosts();
  }, [user]);
  
  const handleFollowToggle = async () => {
    if (!db || !user || isTogglingFollow) return;
    
    setIsTogglingFollow(true);
    const wasFollowingBeforeToggle = currentUser.following.includes(user.id);
    const currentUserRef = doc(db, 'users', currentUser.id);
    const targetUserRef = doc(db, 'users', user.id);
    
    try {
        await runTransaction(db, async (transaction) => {
            const currentUserDoc = await transaction.get(currentUserRef);
            if (!currentUserDoc.exists()) {
                throw "Current user document does not exist!";
            }
            
            const currentFollowingList = currentUserDoc.data().following || [];
            const isCurrentlyFollowing = currentFollowingList.includes(user.id);

            if (isCurrentlyFollowing) {
                // Unfollow logic
                transaction.update(currentUserRef, { following: arrayRemove(user.id) });
                transaction.update(targetUserRef, { followers: arrayRemove(currentUser.id) });
            } else {
                // Follow logic
                transaction.update(currentUserRef, { following: arrayUnion(user.id) });
                transaction.update(targetUserRef, { followers: arrayUnion(currentUser.id) });
            }
        });

        // Create notification only on a successful follow
        if (!wasFollowingBeforeToggle) {
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
        alert("Could not update follow status. Please check your Firestore security rules and network connection.");
    } finally {
        setIsTogglingFollow(false);
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
  
  const isFollowing = currentUser.following.includes(user.id);

  return (
    <>
    {isImageViewerOpen && user.profilePhotos.length > 0 && (
        <ImageViewer images={user.profilePhotos} onClose={() => setIsImageViewerOpen(false)} />
    )}
    <div className="absolute inset-0 bg-white z-[70] flex flex-col animate-slide-in">
        <style>{`.animate-slide-in { animation: slideInFromRight 0.3s ease-out; } @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        <header className="flex items-center p-4 border-b border-gray-200 bg-white sticky top-0">
             <button onClick={onClose} className="text-lg text-gray-600 w-8">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-xl font-bold text-dark-gray text-center flex-1 truncate">{user.name}</h1>
            <div className="w-8"></div>
        </header>
        
        <div className="flex-1 overflow-y-auto pb-16">
            <div className="p-4">
                 <div className="flex items-center space-x-4">
                    <button onClick={() => setIsImageViewerOpen(true)} className="flex-shrink-0">
                        <img className="w-24 h-24 rounded-full object-cover" src={user.profilePhotos?.[0] || PLACEHOLDER_AVATAR} alt={user.name} />
                    </button>
                    <div className="flex justify-around text-center flex-1">
                        <div>
                            <span className="font-bold text-lg">{userPosts.length}</span>
                            <span className="text-gray-500 block text-sm">Posts</span>
                        </div>
                        <div>
                            <span className="font-bold text-lg">{user.followers?.length || 0}</span>
                            <span className="text-gray-500 block text-sm">Followers</span>
                        </div>
                        <div>
                            <span className="font-bold text-lg">{user.following?.length || 0}</span>
                            <span className="text-gray-500 block text-sm">Following</span>
                        </div>
                    </div>
                </div>
                 <div className="mt-4">
                    <div className="flex items-center space-x-1">
                        <h2 className="text-xl font-bold">{user.name}, {user.age}</h2>
                        {user.isPremium && <VerifiedIcon />}
                    </div>
                </div>

                <div className="flex space-x-2 mt-4">
                    <button 
                        onClick={handleFollowToggle} 
                        disabled={isTogglingFollow}
                        className={`flex-1 font-semibold py-2 px-4 rounded-lg transition-colors ${isFollowing ? 'bg-gray-200 text-gray-800' : 'bg-flame-orange text-white'} ${isTogglingFollow ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button onClick={() => onStartChat(user.id)} className="flex-1 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg">Message</button>
                </div>
            </div>

            {/* About Me Section */}
            <div className="px-4 mt-2">
                <h3 className="font-bold text-md text-gray-800">About Me</h3>
                <p className="text-gray-600 mt-1 text-sm">{user.bio}</p>
            </div>
            
            {/* Interests Section */}
            {user.interests && user.interests.length > 0 && (
                <div className="px-4 mt-4">
                    <h3 className="font-bold text-md text-gray-800 mb-2">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                        {user.interests.map(interest => (
                            <div key={interest} className="bg-flame-orange/20 text-flame-red font-semibold rounded-full px-3 py-1 text-sm">
                                #{interest}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Story Highlights Section */}
            <div className="mt-6">
                <h3 className="font-bold text-md text-gray-800 px-4 mb-2">Story Highlights</h3>
                <div className="px-4 flex space-x-4 overflow-x-auto pb-2">
                    {mockHighlights.map(h => <HighlightCircle key={h.id} highlight={h} />)}
                </div>
            </div>

            <div className="border-t border-gray-200 mt-6">
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