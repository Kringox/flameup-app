import React, { useState, useEffect, useCallback, useContext } from 'react';
// FIX: Add file extension to firebaseConfig import
import { db } from '../firebaseConfig.ts';
// FIX: Import necessary functions from 'firebase/firestore'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  arrayUnion,
  runTransaction,
  increment,
  Timestamp,
  limit,
} from 'firebase/firestore';
// FIX: Add file extension to types import
import { User, NotificationType } from '../types.ts';
// FIX: Add file extensions to component and util imports
import FilterModal from '../components/FilterModal.tsx';
import FilterIcon from '../components/icons/FilterIcon.tsx';
import XIcon from '../components/icons/XIcon.tsx';
import HeartIcon from '../components/icons/HeartIcon.tsx';
import StarIcon from '../components/icons/StarIcon.tsx';
import { hapticFeedback } from '../utils/haptics.ts';
import { XpAction } from '../utils/xpUtils.ts';
import { XpContext } from '../contexts/XpContext.ts';
import FlameLoader from '../components/FlameLoader.tsx';
import WifiOffIcon from '../components/icons/WifiOffIcon.tsx';

interface SwipeScreenProps {
  currentUser: User;
  onNewMatch: (matchedUser: User) => void;
  onUpdateUser: (updatedUser: User) => void;
}

const SwipeCard: React.FC<{ user: User }> = ({ user }) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user.profilePhotos.length > 1) {
      setActivePhotoIndex((p) => (p + 1) % user.profilePhotos.length);
    }
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user.profilePhotos.length > 1) {
      setActivePhotoIndex((p) => (p - 1 + user.profilePhotos.length) % user.profilePhotos.length);
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-gray-200 rounded-2xl overflow-hidden shadow-2xl">
      {user.profilePhotos && user.profilePhotos.length > 0 ? (
        <img src={user.profilePhotos[activePhotoIndex]} alt={user.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-500">No Photo</span>
        </div>
      )}

      {user.profilePhotos && user.profilePhotos.length > 1 && (
        <>
          <div className="absolute top-0 left-0 right-0 flex p-2 space-x-1 z-10">
            {user.profilePhotos.map((_, index) => (
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
        <h2 className="text-white text-3xl font-bold">{user.name}, {user.age}</h2>
        <p className="text-white mt-1 line-clamp-2">{user.aboutMe}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {(user.interests || '').split(',').slice(0, 4).map((interest) => (
            <span key={interest.trim()} className="bg-white/20 text-white text-xs font-semibold px-2 py-1 rounded-full">{interest.trim()}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

const SwipeScreen: React.FC<SwipeScreenProps> = ({ currentUser, onNewMatch }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ ageRange: [18, 40], distance: 50 });
  const [swipeAnimation, setSwipeAnimation] = useState<'left' | 'right' | null>(null);

  const { showXpToast } = useContext(XpContext);

  const fetchUsers = useCallback(async () => {
    if (!db) {
      setError('Database connection not available.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const seenUsers = new Set([...(currentUser.swipedLeft || []), ...(currentUser.swipedRight || []), currentUser.id]);
      
      const q = query(
        collection(db, 'users'), 
        where('age', '>=', filters.ageRange[0]),
        where('age', '<=', filters.ageRange[1]),
        limit(50) // Fetch a larger batch to filter from
      );

      const querySnapshot = await getDocs(q);
      const fetchedUsers = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as User))
        .filter(u => !seenUsers.has(u.id));

      setUsers(fetchedUsers);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Error fetching users for swiping:', err);
      setError('Could not load profiles. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (currentIndex >= users.length || swipeAnimation) return;

    const targetUser = users[currentIndex];
    hapticFeedback(direction === 'right' ? 'light' : 'selection');
    setSwipeAnimation(direction);

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setSwipeAnimation(null);
    }, 300);

    if (!db) return;

    try {
        let isMatch = false;
        await runTransaction(db, async (transaction) => {
            const currentUserRef = doc(db, 'users', currentUser.id);
            const updateData: { [key: string]: any } = {};

            if (direction === 'left') {
                updateData.swipedLeft = arrayUnion(targetUser.id);
            } else {
                updateData.swipedRight = arrayUnion(targetUser.id);
                updateData.xp = increment(XpAction.SWIPE_LIKE);

                const targetUserRef = doc(db, 'users', targetUser.id);
                const targetUserDoc = await transaction.get(targetUserRef);
                if (targetUserDoc.exists() && targetUserDoc.data().swipedRight?.includes(currentUser.id)) {
                    isMatch = true;
                    updateData.xp = increment(XpAction.SWIPE_LIKE + XpAction.MATCH);
                    
                    const targetNotifRef = doc(collection(db, 'users', targetUser.id, 'notifications'));
                    transaction.set(targetNotifRef, {
                        type: NotificationType.Match,
                        fromUser: { id: currentUser.id, name: currentUser.name, profilePhoto: currentUser.profilePhotos[0] },
                        read: false,
                        timestamp: Timestamp.now(),
                    });
                    transaction.update(targetUserRef, { xp: increment(XpAction.MATCH) });
                }
            }
            transaction.update(currentUserRef, updateData);
        });

        if (direction === 'right') {
            if (isMatch) {
                onNewMatch(targetUser);
                showXpToast(XpAction.SWIPE_LIKE + XpAction.MATCH);
            } else {
                showXpToast(XpAction.SWIPE_LIKE);
            }
        }
    } catch (error) {
      console.error('Failed to process swipe:', error);
    }
  };

  const currentCardUser = users[currentIndex];
  const nextCardUser = users[currentIndex + 1];

  const animationClasses = {
    left: 'animate-swipe-out-left',
    right: 'animate-swipe-out-right',
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-full"><FlameLoader /></div>;
    }
    if (error) {
      return (
        <div className="flex flex-col justify-center items-center h-full text-center p-4">
          <WifiOffIcon className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="font-bold text-lg">Oops! Something went wrong.</h3>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button onClick={fetchUsers} className="mt-4 px-4 py-2 bg-flame-orange text-white rounded-lg">Try Again</button>
        </div>
      );
    }
    if (!currentCardUser) {
      return (
        <div className="flex flex-col justify-center items-center h-full text-center p-4">
          <h3 className="font-bold text-lg dark:text-gray-200">That's everyone for now!</h3>
          <p className="text-gray-600 dark:text-gray-400">Check back later for new profiles or try adjusting your filters.</p>
          <button onClick={fetchUsers} className="mt-4 px-4 py-2 bg-flame-orange text-white rounded-lg">Refresh</button>
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col justify-between items-center p-4">
        <div className="relative w-full h-full flex-1">
          {nextCardUser && (
            <div className="absolute inset-0 w-full h-full transform scale-95">
              <SwipeCard user={nextCardUser} />
            </div>
          )}
          {currentCardUser && (
            <div className={`absolute inset-0 w-full h-full ${swipeAnimation ? animationClasses[swipeAnimation] : ''}`}>
              <SwipeCard user={currentCardUser} />
            </div>
          )}
        </div>
        <div className="flex justify-around items-center w-full mt-4 flex-shrink-0">
          <button onClick={() => handleSwipe('left')} className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex justify-center items-center text-gray-500">
            <XIcon className="w-8 h-8" />
          </button>
          <button className="w-14 h-14 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex justify-center items-center text-blue-500">
            <StarIcon className="w-7 h-7" />
          </button>
          <button onClick={() => handleSwipe('right')} className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex justify-center items-center text-red-500">
            <HeartIcon isLiked={false} className="w-8 h-8" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-black">
      {isFilterOpen && <FilterModal onClose={() => setIsFilterOpen(false)} onApply={setFilters} currentFilters={filters} />}
      <header className="flex justify-between items-center p-4 flex-shrink-0">
        <div className="w-8"></div>
        <img src="/assets/logo-icon.png" alt="FlameUp" className="h-8 dark:invert" />
        <button onClick={() => setIsFilterOpen(true)}>
          <FilterIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
      </header>
      {renderContent()}
    </div>
  );
};

export default SwipeScreen;