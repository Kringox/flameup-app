
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { db } from '../firebaseConfig.ts';
import { collection, query, getDocs, limit, doc, updateDoc, arrayUnion, writeBatch, serverTimestamp, increment, QuerySnapshot } from 'firebase/firestore';
import { User, NotificationType, SwipeFilters } from '../types.ts';
import XIcon from '../components/icons/XIcon.tsx';
import HeartIcon from '../components/icons/HeartIcon.tsx';
import StarIcon from '../components/icons/StarIcon.tsx';
import FilterIcon from '../components/icons/FilterIcon.tsx';
import FlameLoader from '../components/FlameLoader.tsx';
import WifiOffIcon from '../components/icons/WifiOffIcon.tsx';
import { hapticFeedback } from '../utils/haptics.ts';
import { XpContext } from '../contexts/XpContext.ts';
import { promiseWithTimeout } from '../utils/promiseUtils.ts';
import { DEMO_USERS_FOR_UI } from '../constants.ts';
import HotnessDisplay from '../components/HotnessDisplay.tsx';
import FilterModal from '../components/FilterModal.tsx';
import MapPinIcon from '../components/icons/MapPinIcon.tsx';

interface SwipeScreenProps {
  currentUser: User;
  onNewMatch: (matchedUser: User) => void;
  onUpdateUser: (updatedUser: User) => void;
}

const SwipeCard: React.FC<{ user: User; isVisible: boolean; animation: string; distance?: number }> = ({ user, isVisible, animation, distance }) => {
  try {
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);

    // Get user data with safe fallbacks
    const name = String(user?.name || 'User');
    const age = user?.age;
    const aboutMe = String(user?.aboutMe || '');
    const interests = user?.interests; 
    const photos = user?.profilePhotos;
    const hasValidPhotos = Array.isArray(photos) && photos.length > 0 && photos.every(p => typeof p === 'string' && p.trim() !== '');

    if (!isVisible) return null;

    if (!hasValidPhotos) {
      return (
          <div className={`absolute inset-0 w-full h-full bg-gray-300 dark:bg-zinc-700 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center p-4 text-center ${animation}`}>
              <div className="text-red-500">
                  <p className="font-bold">Profile Error</p>
                  <p className="text-sm">This profile could not be loaded due to an image error.</p>
              </div>
          </div>
      );
    }
    
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

        {/* Hotness Badge Overlay */}
        <div className="absolute top-4 right-4 z-20">
            <HotnessDisplay score={user.hotnessScore || 0} size="sm" />
        </div>
        
        {/* Distance Badge */}
        {distance !== undefined && (
            <div className="absolute top-4 left-4 z-20 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 flex items-center text-white text-xs font-bold">
                <MapPinIcon className="w-3 h-3 mr-1" />
                {distance < 1 ? '< 1 km' : `${Math.round(distance)} km`}
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
    return null;
  }
};


const SwipeScreen: React.FC<SwipeScreenProps> = ({ currentUser, onNewMatch, onUpdateUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [animation, setAnimation] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    
    // Default Filters
    const [filters, setFilters] = useState<SwipeFilters>({
        useMyLocation: true,
        maxDistance: 50, // 50km default
        ageRange: [18, 99],
        requiredInterests: [],
    });

    const { showXpToast } = useContext(XpContext);

    // --- Helper: Haversine Distance Calculation ---
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    // --- Smart Swipe Algorithm with Location & Filters ---
    const calculateScoreAndFilter = (candidate: User, current: User): { score: number, valid: boolean, distance?: number } => {
        let score = 0;
        let valid = true;
        let distance: number | undefined = undefined;

        // 1. Age Filter
        if (candidate.age < filters.ageRange[0] || candidate.age > filters.ageRange[1]) {
            return { score: 0, valid: false };
        }

        // 2. Location Logic
        if (filters.useMyLocation && current.location && candidate.location) {
            distance = calculateDistance(
                current.location.latitude, current.location.longitude,
                candidate.location.latitude, candidate.location.longitude
            );
            
            // Filter by Radius
            if (distance > filters.maxDistance) {
                return { score: 0, valid: false };
            }
            
            // Closer is better (add massive score for proximity)
            score += (filters.maxDistance - distance) * 10; 

        } else if (!filters.useMyLocation && filters.manualLocation) {
            // Manual Location Match (Simple string check)
            const city = candidate.location?.cityName || '';
            if (!city.toLowerCase().includes(filters.manualLocation.toLowerCase())) {
                // Relaxed check: also check bio if city not found
                if (!candidate.aboutMe?.toLowerCase().includes(filters.manualLocation.toLowerCase())) {
                     return { score: 0, valid: false };
                }
            }
        }

        // 3. Hotness Boost (Impact: 10% of raw hotness)
        score += (candidate.hotnessScore || 0) * 0.1;

        // 4. Interest Matching
        const myInterests = (typeof current.interests === 'string' ? current.interests.split(',') : current.interests || []).map(i => i.trim().toLowerCase());
        const theirInterests = (typeof candidate.interests === 'string' ? candidate.interests.split(',') : candidate.interests || []).map(i => i.trim().toLowerCase());
        const common = theirInterests.filter(i => myInterests.includes(i));
        score += common.length * 15; 

        // 5. Specific Filter Interests
        if (filters.requiredInterests.length > 0) {
            const hasRequired = filters.requiredInterests.some(req => theirInterests.some(their => their.includes(req.toLowerCase())));
            if (!hasRequired) return { score: 0, valid: false };
        }

        return { score, valid, distance };
    };

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            if (!db) throw new Error("Database connection not available.");
            if (!currentUser || !currentUser.id) throw new Error("Current user data is invalid.");

            // 1. Strict Exclusion Lists
            const swipedLeft = Array.isArray(currentUser.swipedLeft) ? currentUser.swipedLeft : [];
            const swipedRight = Array.isArray(currentUser.swipedRight) ? currentUser.swipedRight : [];
            const seenUsers = new Set([currentUser.id, ...swipedLeft, ...swipedRight]);

            const usersRef = collection(db, 'users');
            // Fetch a larger batch to filter client-side
            const q = query(usersRef, limit(100)); 
            
            const querySnapshot = await promiseWithTimeout(getDocs(q), 8000, new Error("Fetching profiles took too long.")) as QuerySnapshot;
            
            let fetchedUsers = querySnapshot.docs
                .map(doc => {
                    const u = { id: doc.id, ...doc.data() } as User;
                    // Augment with temporary calculation data
                    const meta = calculateScoreAndFilter(u, currentUser);
                    return { ...u, _score: meta.score, _valid: meta.valid, _distance: meta.distance };
                })
                .filter(u => !seenUsers.has(u.id))
                .filter(u => u._valid) // Apply filters
                .filter(u => {
                     // Basic validation
                     const photos = u.profilePhotos;
                     if (!Array.isArray(photos) || photos.length === 0) return false;
                     return photos.every(p => typeof p === 'string' && p.trim().startsWith('http'));
                });

            // 3. Sort by Score (which includes Distance preference)
            fetchedUsers = fetchedUsers.sort((a, b) => (b._score || 0) - (a._score || 0));
            
            if (fetchedUsers.length === 0) {
                // If firestore empty/filtered, use demo data strictly for UI testing if not swiped
                // Apply simple filters to demo data too
                const demoUsersToShow = DEMO_USERS_FOR_UI
                    .filter(u => !seenUsers.has(u.id))
                    .map(u => ({...u, _score: 0, _distance: undefined})) // Default demo meta
                    .filter(u => u.age >= filters.ageRange[0] && u.age <= filters.ageRange[1]); // Basic demo filter
                
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
    }, [currentUser, filters]); // Refetch when filters change

    useEffect(() => {
        if (currentUser && currentUser.id) {
            fetchUsers();
        }
    }, [fetchUsers, currentUser]);

    const handleSwipe = async (direction: 'left' | 'right' | 'super') => {
        if (currentIndex >= users.length || !db) return;

        const swipedUser = users[currentIndex];
        if (!swipedUser || !swipedUser.id) return;

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
            if (swipedUserId.startsWith('demo-user-')) return;

            const userRef = doc(db, 'users', currentUser.id);
            const batch = writeBatch(db);

            const fieldToUpdate = direction === 'left' ? 'swipedLeft' : 'swipedRight';
            batch.update(userRef, { [fieldToUpdate]: arrayUnion(swipedUserId) });

            if (direction === 'right' || direction === 'super') {
                // IMPORTANT: Increment the Hotness Score of the person being LIKED
                const targetUserRef = doc(db, 'users', swipedUserId);
                batch.update(targetUserRef, { hotnessScore: increment(2) }); // +2 Hotness for a like

                if (Array.isArray(swipedUser.swipedRight) && swipedUser.swipedRight.includes(currentUser.id)) {
                    onNewMatch(swipedUser);
                    showXpToast(50); // Just visual feedback, no actual XP/Coins
                    
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
                    <h3 className="font-bold text-lg dark:text-gray-200">No more profiles</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Try adjusting your filters to see more people.</p>
                    <button onClick={() => setIsFilterOpen(true)} className="flex items-center px-6 py-3 bg-white dark:bg-zinc-800 shadow-md rounded-full font-bold text-flame-orange">
                        <FilterIcon className="w-5 h-5 mr-2" /> Adjust Filters
                    </button>
                    <button onClick={fetchUsers} className="mt-4 text-sm text-gray-500 underline">Refresh</button>
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col justify-between items-center p-4">
                <div className="relative w-full h-full flex-1">
                    {users[currentIndex + 1] && (
                        <SwipeCard
                            key={users[currentIndex + 1].id}
                            user={users[currentIndex + 1]}
                            isVisible={true}
                            animation="transform scale-95 opacity-80"
                            distance={(users[currentIndex + 1] as any)._distance}
                        />
                    )}
                    {users[currentIndex] && (
                        <SwipeCard
                            key={users[currentIndex].id}
                            user={users[currentIndex]}
                            isVisible={true}
                            animation={animation}
                            distance={(users[currentIndex] as any)._distance}
                        />
                    )}
                </div>
                <div className="flex justify-around items-center w-full mt-4 flex-shrink-0">
                    <button onClick={() => handleSwipe('left')} className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex justify-center items-center text-gray-500 transform hover:scale-110 transition-transform">
                        <XIcon className="w-8 h-8" />
                    </button>
                    {/* Super like kept as interaction but no coin cost logic needed for MVP */}
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
            {isFilterOpen && (
                <FilterModal 
                    onClose={() => setIsFilterOpen(false)} 
                    onApply={(newFilters) => setFilters(newFilters)}
                    currentFilters={filters}
                />
            )}
            
            <header className="flex justify-between items-center px-4 py-3 flex-shrink-0">
                <div className="w-8"></div> {/* Spacer */}
                <img src="/assets/logo-icon.png" alt="FlameUp" className="h-8 dark:invert" />
                <button 
                    onClick={() => setIsFilterOpen(true)} 
                    className="w-8 flex justify-center items-center text-gray-600 dark:text-gray-300"
                >
                    <FilterIcon className="w-6 h-6" />
                </button>
            </header>
            {renderContent()}
        </div>
    );
};

export default SwipeScreen;
