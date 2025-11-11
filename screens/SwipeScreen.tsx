import React, { useState, useEffect, useCallback, useContext } from 'react';
import { db } from '../firebaseConfig.ts';
import { collection, query, getDocs, limit, doc, updateDoc, arrayUnion, writeBatch, serverTimestamp, increment, QuerySnapshot } from 'firebase/firestore';
import { User, NotificationType } from '../types.ts';
import XIcon from '../components/icons/XIcon.tsx';
import HeartIcon from '../components/icons/HeartIcon.tsx';
import StarIcon from '../components/icons/StarIcon.tsx';
import FlameLoader from '../components/FlameLoader.tsx';
import WifiOffIcon from '../components/icons/WifiOffIcon.tsx';
import { hapticFeedback } from '../utils/haptics.ts';
import { XpContext } from '../contexts/XpContext.ts';
import { XpAction } from '../utils/xpUtils.ts';
import { promiseWithTimeout } from '../utils/promiseUtils.ts';
import { DEMO_USERS_FOR_UI } from '../constants.ts';

interface SwipeScreenProps {
  currentUser: User;
  onNewMatch: (matchedUser: User) => void;
  onUpdateUser: (updatedUser: User) => void;
}

const SwipeCard: React.FC<{ user: User; isVisible: boolean; animation: string; }> = ({ user, isVisible, animation }) => {
  try {
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);

    // Get user data with safe fallbacks to prevent crashes
    const name = String(user?.name || 'User');
    const age = user?.age;
    const aboutMe = String(user?.aboutMe || '');
    const interests = user?.interests; // Keep it raw to check type later
    const photos = user?.profilePhotos;
    const hasValidPhotos = Array.isArray(photos) && photos.length > 0 && photos.every(p => typeof p === 'string' && p.trim() !== '');

    if (!isVisible) return null;

    if (!hasValidPhotos) {
      // This is a controlled error for bad photo data, not a crash.
      return (
          <div className={`absolute inset-0 w-full h-full bg-gray-300 dark:bg-zinc-700 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center p-4 text-center ${animation}`}>
              <div className="text-red-500">
                  <p className="font-bold">Profile Error</p>
                  <p className="text-sm">This profile could not be loaded due to an image error.</p>
              </div>
          </div>
      );
    }
    
    // Safely handle interests whether it's an array or a comma-separated string
    const interestsArray = (
        Array.isArray(interests) 
            ? interests 
            : String(interests || '').split(',')
    ).filter(interest => typeof interest === 'string' && interest.trim() !== '');


    const nextPhoto = (e: React.MouseEvent) => {
      e.stopPropagation();
      setActivePhotoIndex(p => (p + 1) % photos.length);
    };

    const prevPhoto = (e: React.MouseEvent) => {
      e.stopPropagation();
      setActivePhotoIndex(p => (p - 1 + photos.length) % photos.length);
    };

    return (
      <div className={`absolute inset-0 w-full h-full bg-gray-200 rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500 ${animation}`}>
        <img src={photos[activePhotoIndex]} alt={name} className="w-full h-full object-cover" />

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
          <h2 className="text-white text-3xl font-bold">{name}{age ? `, ${age}` : ''}</h2>
          <p className="text-white mt-1 line-clamp-2">{aboutMe}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {interestsArray.map((interest) => (
              interest.trim() && <span key={interest.trim()} className="bg-white/20 text-white text-xs font-semibold px-2 py-1 rounded-full">{interest.trim()}</span>
            ))}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("CRITICAL: SwipeCard crashed while rendering user:", user, error);
    return (
        <div className="absolute inset-0 w-full h-full bg-red-100 border-2 border-red-500 rounded-2xl flex items-center justify-center p-4 text-center">
            <div className="text-red-700">
                <p className="font-bold">Render Error</p>
                <p className="text-sm">This profile caused a critical error and could not be displayed.</p>
            </div>
        </div>
    );
  }
};


const SwipeScreen: React.FC<SwipeScreenProps> = ({ currentUser, onNewMatch, onUpdateUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [animation, setAnimation] = useState('');
    const { showXpToast } = useContext(XpContext);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            if (!db) throw new Error("Database connection not available.");
            if (!currentUser || !currentUser.id) throw new Error("Current user data is invalid.");

            const swipedLeft = Array.isArray(currentUser.swipedLeft) ? currentUser.swipedLeft : [];
            const swipedRight = Array.isArray(currentUser.swipedRight) ? currentUser.swipedRight : [];
            const seenUsers = new Set([currentUser.id, ...swipedLeft, ...swipedRight]);

            const validateUser = (u: any): u is User => {
                if (!u || typeof u !== 'object' || u === null) return false;
                if (typeof u.id !== 'string' || !u.id) return false;
                if (seenUsers.has(u.id)) return false;
                if (typeof u.name !== 'string' || u.name.trim() === '') return false;
                
                const photos = u.profilePhotos;
                if (!Array.isArray(photos) || photos.length === 0) return false;
                
                if (photos.some(p => !(typeof p === 'string' && p.trim().startsWith('http')))) {
                    console.warn(`Filtering out user ${u.id} due to invalid item in profilePhotos array.`);
                    return false;
                }
                return true;
            };

            const usersRef = collection(db, 'users');
            const q = query(usersRef, limit(50)); // Fetch a larger batch to increase chances of finding valid users
            
            const querySnapshot = await promiseWithTimeout(getDocs(q), 8000, new Error("Fetching profiles took too long.")) as QuerySnapshot;
            
            const firestoreDocs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const fetchedUsers = firestoreDocs.filter(validateUser);
            
            if (fetchedUsers.length === 0) {
                console.log("No valid users from Firestore. Falling back to demo users.");
                const demoUsersToShow = DEMO_USERS_FOR_UI.filter(validateUser);
                setUsers(demoUsersToShow);
            } else {
                setUsers(fetchedUsers);
            }
            
        } catch (err: any) {
            console.error("Fatal error fetching users:", err);
            setError("Could not load profiles. Please check your connection and try again.");
        } finally {
            setCurrentIndex(0);
            setIsLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        // Ensure currentUser is fully loaded before fetching other users
        if (currentUser && currentUser.id) {
            fetchUsers();
        }
    }, [fetchUsers, currentUser]);

    const handleSwipe = async (direction: 'left' | 'right' | 'super') => {
        if (currentIndex >= users.length || !db) return;

        const swipedUser = users[currentIndex];
        if (!swipedUser || !swipedUser.id) return; // Extra safety check

        const swipedUserId = swipedUser.id;

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
            if (swipedUserId.startsWith('demo-user-')) {
                console.log(`Swiped on demo user ${swipedUser.name}, no database write.`);
                return;
            }

            const userRef = doc(db, 'users', currentUser.id);
            const batch = writeBatch(db);

            const fieldToUpdate = direction === 'left' ? 'swipedLeft' : 'swipedRight';
            batch.update(userRef, { [fieldToUpdate]: arrayUnion(swipedUserId) });

            if (direction === 'right' || direction === 'super') {
                batch.update(userRef, { xp: increment(XpAction.SWIPE_LIKE) });
                showXpToast(XpAction.SWIPE_LIKE);
                
                if (Array.isArray(swipedUser.swipedRight) && swipedUser.swipedRight.includes(currentUser.id)) {
                    onNewMatch(swipedUser);
                    batch.update(userRef, { xp: increment(XpAction.MATCH) });
                    showXpToast(XpAction.MATCH);
                    
                    const currentUserProfilePhoto = (Array.isArray(currentUser.profilePhotos) && currentUser.profilePhotos.length > 0)
                        ? currentUser.profilePhotos[0]
                        : `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==`;

                    const notifRef = doc(collection(db, 'users', swipedUserId, 'notifications'));
                    batch.set(notifRef, {
                        type: NotificationType.Match,
                        fromUser: { id: currentUser.id, name: currentUser.name, profilePhoto: currentUserProfilePhoto },
                        read: false,
                        timestamp: serverTimestamp(),
                    });
                }
            }
            await batch.commit();
            
            const updatedSwipedList = [...(Array.isArray(currentUser[fieldToUpdate]) ? currentUser[fieldToUpdate] : []), swipedUserId];
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
                    {/* Render the next card underneath */}
                    {users[currentIndex + 1] && (
                        <SwipeCard
                            key={users[currentIndex + 1].id}
                            user={users[currentIndex + 1]}
                            isVisible={true}
                            animation="transform scale-95 opacity-80" // Style for the card underneath
                        />
                    )}
                     {/* Render the current card on top */}
                    {users[currentIndex] && (
                        <SwipeCard
                            key={users[currentIndex].id}
                            user={users[currentIndex]}
                            isVisible={true}
                            animation={animation}
                        />
                    )}
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