import React, { useState, useEffect } from 'react';
import { Post, User, StoryHighlight } from '../types';
import EditProfileScreen from './EditProfileScreen';
import SettingsScreen from './SettingsScreen';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import PostDetailView from '../components/PostDetailView';
import VerifiedIcon from '../components/icons/VerifiedIcon';
import ImageViewer from '../components/ImageViewer';
import EyeIcon from '../components/icons/EyeIcon';
import PlusIcon from '../components/icons/PlusIcon';


const PLACEHOLDER_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';

interface ProfileScreenProps {
  user: User;
  isActive: boolean;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
  onOpenFollowList: (list: {title: 'Followers' | 'Following', userIds: string[]}) => void;
  onOpenComments: (post: Post) => void;
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


const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, isActive, onUpdateUser, onLogout, onOpenFollowList, onOpenComments }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  // MOCK DATA for story highlights
  const mockHighlights: StoryHighlight[] = user.isPremium ? 
    [
        { id: 'h1', title: 'Travel', coverPhotoUrl: 'https://picsum.photos/seed/travel/200', storyIds: [] },
        { id: 'h2', title: 'Foodie', coverPhotoUrl: 'https://picsum.photos/seed/food/200', storyIds: [] },
        { id: 'h3', title: 'Pets', coverPhotoUrl: 'https://picsum.photos/seed/pets/200', storyIds: [] },
        { id: 'h4', title: 'Concerts', coverPhotoUrl: 'https://picsum.photos/seed/music/200', storyIds: [] },
    ] :
    [
        { id: 'h1', title: 'Travel', coverPhotoUrl: 'https://picsum.photos/seed/travel/200', storyIds: [] },
        { id: 'h2', title: 'Foodie', coverPhotoUrl: 'https://picsum.photos/seed/food/200', storyIds: [] },
    ];

  useEffect(() => {
    if (!isActive || !db || !user?.id) {
        return; // Don't fetch if the tab is not active
    };

    setIsLoadingPosts(true);
    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', user.id),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, (querySnapshot) => {
      const postList = querySnapshot.docs.map(doc => {
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
      setUserPosts(postList);
      setIsLoadingPosts(false);
    }, (error) => {
      console.error("Error fetching user posts in real-time:", error);
      setIsLoadingPosts(false);
    });

    return () => unsubscribe(); // Cleanup the listener when the component is no longer active
  }, [user.id, isActive]);


  const handleSaveProfile = (updatedUser: User) => {
    onUpdateUser(updatedUser);
    setIsEditing(false);
  };
  
  const handlePostUpdated = (updatedPost: Post) => {
    setUserPosts(currentPosts => currentPosts.map(p => p.id === updatedPost.id ? updatedPost : p));
    if (selectedPost && selectedPost.id === updatedPost.id) {
        setSelectedPost(updatedPost);
    }
  }

  const handleOpenCommentsFromDetail = (post: Post) => {
    setSelectedPost(null); // First, close the PostDetailView modal
    onOpenComments(post); // Then, open the CommentScreen
  };

  if (isEditing) {
    return <EditProfileScreen user={user} onSave={handleSaveProfile} onClose={() => setIsEditing(false)} />;
  }
  
  if (isSettingsOpen) {
    return <SettingsScreen onClose={() => setIsSettingsOpen(false)} onLogout={onLogout} />;
  }

  return (
    <>
      {isImageViewerOpen && user.profilePhotos.length > 0 && (
        <ImageViewer images={user.profilePhotos} onClose={() => setIsImageViewerOpen(false)} />
      )}
      <div className="w-full pb-16">
        <header className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10 flex justify-between items-center">
            <div className="w-8"></div> {/* Spacer */}
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-flame-orange to-flame-red">FlameUp</h1>
            <button onClick={() => setIsSettingsOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
        </header>

        <div className="p-4">
          <div className="flex items-center space-x-4">
              <button onClick={() => setIsImageViewerOpen(true)} className="flex-shrink-0">
                <img className="w-24 h-24 rounded-full object-cover" src={user.profilePhotos?.[0] || PLACEHOLDER_AVATAR} alt={user.name} />
              </button>
              <div className="flex justify-around text-center flex-1">
                  <button onClick={() => onOpenFollowList({title: 'Followers', userIds: user.followers})} className="cursor-pointer">
                      <span className="font-bold text-lg">{user.followers?.length || 0}</span>
                      <span className="text-gray-500 block text-sm">Followers</span>
                  </button>
                  <button onClick={() => onOpenFollowList({title: 'Following', userIds: user.following})} className="cursor-pointer">
                      <span className="font-bold text-lg">{user.following?.length || 0}</span>
                      <span className="text-gray-500 block text-sm">Following</span>
                  </button>
              </div>
          </div>
          <div className="mt-4">
              <div className="flex items-center space-x-1">
                <h2 className="text-xl font-bold">{user.name}, {user.age}</h2>
                {user.isPremium && <VerifiedIcon />}
             </div>
          </div>
          
          <div className="flex space-x-2 mt-4">
              <button onClick={() => setIsEditing(true)} className="flex-1 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg">Edit Profile</button>
              {user.isPremium && (
                  <button className="flex-1 flex items-center justify-center bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg">
                      <EyeIcon className="w-5 h-5 mr-2" /> Profile Visitors
                  </button>
              )}
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
                <div className="flex flex-col items-center space-y-1 text-center flex-shrink-0">
                    <button className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                        <PlusIcon className="w-6 h-6" />
                    </button>
                    <span className="text-xs">New</span>
                </div>
            </div>
        </div>
          
        <div className="border-t border-gray-200 mt-6">
            <h3 className="font-bold text-lg p-4">My Posts</h3>
            {isLoadingPosts ? (
              <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {userPosts.map(post => (
                    <div 
                      key={post.id} 
                      className="aspect-square bg-gray-200 cursor-pointer"
                      onClick={() => setSelectedPost(post)}
                    >
                        <img src={post.mediaUrls[0]} alt="User post" className="w-full h-full object-cover" />
                    </div>
                ))}
              </div>
            )}
             {userPosts.length === 0 && !isLoadingPosts && (
                <p className="text-center text-gray-500 py-8 col-span-3">No posts yet. Tap the '+' to share your first photo!</p>
            )}
        </div>
      </div>
      {selectedPost && (
        <PostDetailView
          post={selectedPost}
          currentUser={user}
          onClose={() => setSelectedPost(null)}
          onPostDeleted={() => setSelectedPost(null)}
          onPostUpdated={handlePostUpdated}
          onOpenComments={handleOpenCommentsFromDetail}
        />
      )}
    </>
  );
};

export default ProfileScreen;