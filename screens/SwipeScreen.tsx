import React, { useState, useEffect, useCallback, useContext } from 'react';
import { db } from '../firebaseConfig.ts';
import { collection, query, getDocs, limit, doc, updateDoc, arrayUnion, writeBatch, serverTimestamp, increment, where, documentId, QuerySnapshot } from 'firebase/firestore';
import { User, NotificationType } from '../types.ts';
import XIcon from '../components/icons/XIcon.tsx';
import HeartIcon from '../components/icons/HeartIcon.tsx';
import StarIcon from '../components/icons/StarIcon.tsx';
import FlameLoader from '../components/FlameLoader.tsx';
import WifiOffIcon from '../components/icons/WifiOffIcon.tsx';
import { hapticFeedback } from '../utils/haptics.ts';
import { XpContext } from '../contexts/XpContext.ts';
import { XpAction } from '../utils/xpUtils.ts';

interface SwipeScreenProps {
  currentUser: User;
  onNewMatch: (matchedUser: User) => void;
  onUpdateUser: (updatedUser: User) => void;
}

const promiseWithTimeout = <T,>(
  promise: Promise<T>,
  ms: number,
  timeoutError = new Error('Promise timed out')
): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(timeoutError);
    }, ms);
  });
  return Promise.race<T>([promise, timeout]);
};

const SwipeCard: React.FC<{ user: User; isVisible: boolean; animation: string; }> = ({ user, isVisible, animation }) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  if (!isVisible) return null;

  const photos = user.profilePhotos || [];

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photos.length > 1) {
      setActivePhotoIndex(p => (p + 1) % photos.length);
    }
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photos.length > 1) {
      setActivePhotoIndex(p => (p - 1 + photos.length) % photos.length);
    }
  };

  return (
    <div className={`absolute inset-0 w-full h-full bg-gray-200 rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500 ${animation}`}>
       {photos.length > 0 ? (
        <img src={photos[activePhotoIndex]} alt={user.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
          <span className="text-gray-500">No Photo</span>
        </div>
      )}

      {photos.length > 1 && (
        <>
          <div className="absolute top-0 left-0 right-0 flex p-2 space-x-1 z-10">
            {photos.map((_, index) => (
              <div key={index} className={`h-1 flex-1 rounded-full ${index === activePhotoIndex ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
          <div className="absolute inset-0 flex">
            <div className="w-1/2 h-full" onClick={prevPhoto} />
            <div className="w-1/2 h-full" onClick={nextPhoto} />
          </div>
        </>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <h2 className="text-white text-3xl font-bold">{user.name}{user.age ? `, ${user.age}` : ''}</h2>
        <p className="text-white mt-1 line-clamp-2">{user.aboutMe || ''}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {(user.interests || '').split(',').map((interest) => (
            interest.trim() && <span key={interest.trim()} className="bg-white/20 text-white text-xs font-semibold px-2 py-1 rounded-full">{interest.trim()}</span>
          ))}
        </div>
      </div>
    </div>
  );
};


const SwipeScreen: React.FC<SwipeScreenProps> = ({ currentUser, onNewMatch, onUpdateUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [animation, setAnimation] = useState('');
    const { showXpToast } = useContext(XpContext);

    const fetchUsers = useCallback(async () => {
        if (!db) {
            setError("Database connection is not available.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const swipedLeft = currentUser.swipedLeft ?? [];
            const swipedRight = currentUser.swipedRight ?? [];
            const seenUsers = [currentUser.id, ...swipedLeft, ...swipedRight];

            const usersRef = collection(db, 'users');
            // Fetch users, excluding the current user. Fetch a bit more to have a buffer for client-side filtering.
            const q = query(usersRef, where(documentId(), '!=', currentUser.id), limit(30));
            
            // Fetch with an 8-second timeout to prevent infinite loading state.
            const querySnapshot = await promiseWithTimeout(
                getDocs(q), 
                8000, 
                new Error("Fetching profiles took too long.")
            ) as QuerySnapshot;
            
            const fetchedUsers = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as User))
                .filter(u => !seenUsers.includes(u.id));

            setUsers(fetchedUsers);
            setCurrentIndex(0);
        } catch (err: any) {
            console.error("Error fetching users for swiping:", err);
            if (err.message.includes("too long")) {
                setError("Profiles took too long to load. Please check your connection and try again.");
            } else {
                setError("Could not load new profiles. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleSwipe = async (direction: 'left' | 'right' | 'super') => {
        if (currentIndex >= users.length || !db) return;

        const swipedUserId = users[currentIndex].id;
        const swipedUser = users[currentIndex];

        if (direction === 'left') {
            setAnimation('animate-swipe-out-left');
        } else {
            setAnimation('animate-swipe-out-right');
        }
        
        hapticFeedback('light');
        
        setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            setAnimation('');
        }, 300);

        try {
            const userRef = doc(db, 'users', currentUser.id);
            const batch = writeBatch(db);

            const fieldToUpdate = direction === 'left' ? 'swipedLeft' : 'swipedRight';
            batch.update(userRef, { [fieldToUpdate]: arrayUnion(swipedUserId) });

            if (direction === 'right' || direction === 'super') {
                batch.update(userRef, { xp: increment(XpAction.SWIPE_LIKE) });
                showXpToast(XpAction.SWIPE_LIKE);
                
                // Check for a match
                if (swipedUser.swipedRight?.includes(currentUser.id)) {
                    onNewMatch(swipedUser);
                    batch.update(userRef, { xp: increment(XpAction.MATCH) });
                    showXpToast(XpAction.MATCH);
                    
                    // Create notification for the matched user
                    const notifRef = doc(collection(db, 'users', swipedUserId, 'notifications'));
                    batch.set(notifRef, {
                        type: NotificationType.Match,
                        fromUser: { id: currentUser.id, name: currentUser.name, profilePhoto: currentUser.profilePhotos[0] },
                        read: false,
                        timestamp: serverTimestamp(),
                    });
                }
            }
            await batch.commit();
            
            // Optimistically update the user object in the parent state
            const updatedSwipedList = [...(currentUser[fieldToUpdate] || []), swipedUserId];
            onUpdateUser({...currentUser, [fieldToUpdate]: updatedSwipedList});

        } catch (error) {
            console.error(`Error handling swipe ${direction}:`, error);
        }
    };
    
    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-full"><FlameLoader /></div>;
        }
        if (error) {
            return (
                <div className="flex flex-col justify-center items-center h-full text-center p-4">
                    <WifiOffIcon className="w-16 h-16 text-gray-400 mb-4" />
                    <h3 className="font-bold text-lg dark:text-gray-200">Oops! Something went wrong.</h3>
                    <p className="text-gray-600 dark:text-gray-400">{error}</p>
                    <button onClick={fetchUsers} className="mt-4 px-4 py-2 bg-flame-orange text-white rounded-lg">Try Again</button>
                </div>
            );
        }
        if (currentIndex >= users.length) {
            return (
                <div className="flex flex-col justify-center items-center h-full text-center p-4">
                    <h3 className="font-bold text-lg dark:text-gray-200">That's everyone for now!</h3>
                    <p className="text-gray-600 dark:text-gray-400">Check back later for new profiles.</p>
                    <button onClick={fetchUsers} className="mt-4 px-4 py-2 bg-flame-orange text-white rounded-lg">Refresh</button>
                </div>
            );
        }
        return (
            <div className="flex-1 flex flex-col justify-between items-center p-4">
                <div className="relative w-full h-full flex-1">
                    {users.map((user, index) => (
                        <SwipeCard 
                            key={user.id}
                            user={user}
                            isVisible={index === currentIndex}
                            animation={index === currentIndex ? animation : ''}
                        />
                    ))}
                </div>
                <div className="flex justify-around items-center w-full mt-4 flex-shrink-0">
                    <button onClick={() => handleSwipe('left')} className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex justify-center items-center text-gray-500 transform hover:scale-110 transition-transform">
                        <XIcon className="w-8 h-8" />
                    </button>
                    <button onClick={() => handleSwipe('super')} className="w-14 h-14 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex justify-center items-center text-blue-500 transform hover:scale-110 transition-transform">
                        <StarIcon className="w-7 h-7" />
                    </button>
                    <button onClick={() => handleSwipe('right')} className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex justify-center items-center text-red-500 transform hover:scale-110 transition-transform">
                        <HeartIcon isLiked={false} className="w-8 h-8" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-black">
            <header className="flex justify-center items-center p-4 flex-shrink-0">
                <img src="/assets/logo-icon.png" alt="FlameUp" className="h-8 dark:invert" />
            </header>
            {renderContent()}
        </div>
    );
};

export default SwipeScreen;