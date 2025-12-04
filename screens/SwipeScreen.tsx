
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { db } from '../firebaseConfig.ts';
import { collection, query, getDocs, limit, doc, writeBatch, serverTimestamp, increment, QuerySnapshot, Timestamp, arrayUnion } from 'firebase/firestore';
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
import FlameIcon from '../components/icons/FlameIcon.tsx';
import { useI18n } from '../contexts/I18nContext.ts';
import VerifiedIcon from '../components/icons/VerifiedIcon.tsx';

interface SwipeScreenProps {
  currentUser: User;
  onNewMatch: (matchedUser: User) => void;
  onUpdateUser: (updatedUser: User) => void;
}

const SUPER_LIKE_COST = 5;
const DAILY_SWIPE_LIMIT = 20;

const SwipeCard: React.FC<{ user: User; isVisible: boolean; animation: string; distance?: number; errorMsg: string; errorTitle: string }> = ({ user, isVisible, animation, distance, errorMsg, errorTitle }) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const name = String(user?.name || 'User');
  const age = user?.age;
  const aboutMe = String(user?.aboutMe || '');
  const interests = user?.interests; 
  const photos = user?.profilePhotos;
  const hasValidPhotos = Array.isArray(photos) && photos.length > 0 && photos.every(p => typeof p === 'string' && p.trim() !== '');

  if (!isVisible) return null;

  if (!hasValidPhotos) {
      return (
          <div className={`absolute inset-0 w-full h-full bg-zinc-800 rounded-2xl flex items-center justify-center p-4 text-center ${animation}`}>
              <div className="text-red-500 font-bold">{errorMsg}</div>
          </div>
      );
  }
  
  const interestsArray = (Array.isArray(interests) ? interests : String(interests || '').split(',')).filter(i => i.trim());

  const nextPhoto = (e: React.MouseEvent) => { e.stopPropagation(); setActivePhotoIndex(p => (p + 1) % photos.length); };
  const prevPhoto = (e: React.MouseEvent) => { e.stopPropagation(); setActivePhotoIndex(p => (p - 1 + photos.length) % photos.length); };

  return (
    <div className={`absolute inset-0 w-full h-full bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500 ${animation}`}>
      <img src={photos[activePhotoIndex]} alt={name} className="w-full h-full object-cover" />

      <div className="absolute top-4 right-4 z-20">
          <HotnessDisplay score={user.hotnessScore || 0} size="sm" />
      </div>
      
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
          <div className="absolute inset-0 flex"><div className="w-1/2 h-full" onClick={prevPhoto} /><div className="w-1/2 h-full" onClick={nextPhoto} /></div>
        </>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <h2 className="text-white text-3xl font-bold flex items-center">
            {name}{age ? `, ${age}` : ''}
            {user.isPremium && <VerifiedIcon className="w-6 h-6 ml-2" />}
        </h2>
        <p className="text-white mt-1 line-clamp-2">{aboutMe}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {interestsArray.map((interest) => (
            <span key={interest.trim()} className="bg-white/20 text-white text-xs font-semibold px-2 py-1 rounded-full">{interest.trim()}</span>
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
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [lastSwipedUser, setLastSwipedUser] = useState<User | null>(null); // For Second Chance
    const { t } = useI18n();
    const { showXpToast } = useContext(XpContext);
    
    // Check Limits
    const swipesUsed = currentUser.dailySwipesUsed || 0;
    const isLimitReached = swipesUsed >= DAILY_SWIPE_LIMIT && !currentUser.isPremium;

    const [filters, setFilters] = useState<SwipeFilters>({
        useMyLocation: true,
        maxDistance: 50,
        ageRange: [18, 99],
        requiredInterests: [],
    });

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; 
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; 
    };

    const calculateScoreAndFilter = (candidate: User, current: User): { score: number, valid: boolean, distance?: number } => {
        let score = 0;
        let valid = true;
        let distance: number | undefined = undefined;

        if (candidate.age < filters.ageRange[0] || candidate.age > filters.ageRange[1]) return { score: 0, valid: false };

        if (filters.useMyLocation && current.location && candidate.location) {
            distance = calculateDistance(current.location.latitude, current.location.longitude, candidate.location.latitude, candidate.location.longitude);
            if (distance > filters.maxDistance) return { score: 0, valid: false };
            score += (filters.maxDistance - distance) * 10; 
        }

        score += (candidate.hotnessScore || 0) * 0.1;
        const myInterests = (typeof current.interests === 'string' ? current.interests.split(',') : current.interests || []).map(i => i.trim().toLowerCase());
        const theirInterests = (typeof candidate.interests === 'string' ? candidate.interests.split(',') : candidate.interests || []).map(i => i.trim().toLowerCase());
        const common = theirInterests.filter(i => myInterests.includes(i));
        score += common.length * 15; 

        if (filters.requiredInterests.length > 0) {
            const hasRequired = filters.requiredInterests.some(req => theirInterests.some(their => their.includes(req.toLowerCase())));
            if (!hasRequired) return { score: 0, valid: false };
        }

        return { score, valid, distance };
    };

    const fetchUsers = useCallback(async () => {
        setIsLoading(true); setError(null);
        try {
            if (!db || !currentUser.id) throw new Error("Database unavailable");
            
            // Check Daily Reset logic for swipes
            if (currentUser.lastSwipeReset) {
                const lastReset = currentUser.lastSwipeReset.toDate().getTime();
                const now = Date.now();
                if (now - lastReset > 24 * 60 * 60 * 1000) {
                    // Reset local limit (updateDB logic could go here or lazy update on next swipe)
                    onUpdateUser({ ...currentUser, dailySwipesUsed: 0, lastSwipeReset: Timestamp.now() });
                }
            }

            const swipedLeft = Array.isArray(currentUser.swipedLeft) ? currentUser.swipedLeft : [];
            const swipedRight = Array.isArray(currentUser.swipedRight) ? currentUser.swipedRight : [];
            const seenUsers = new Set([currentUser.id, ...swipedLeft, ...swipedRight]);

            const q = query(collection(db, 'users'), limit(50));
            const querySnapshot = await promiseWithTimeout(getDocs(q), 8000) as QuerySnapshot;
            
            let fetchedUsers = querySnapshot.docs.map(doc => {
                const u = { id: doc.id, ...doc.data() } as User;
                const meta = calculateScoreAndFilter(u, currentUser);
                return { ...u, _score: meta.score, _valid: meta.valid, _distance: meta.distance };
            })
            .filter(u => !seenUsers.has(u.id) && u._valid)
            .sort((a, b) => (b._score || 0) - (a._score || 0));

            if (fetchedUsers.length === 0) {
                setUsers(DEMO_USERS_FOR_UI.filter(u => !seenUsers.has(u.id)).map(u => ({...u, _score: 0})));
            } else {
                setUsers(fetchedUsers);
            }
        } catch (err) { console.error(err); setError("Could not load profiles."); } 
        finally { setCurrentIndex(0); setIsLoading(false); }
    }, [currentUser.id, filters]);

    useEffect(() => { if (currentUser.id) fetchUsers(); }, [fetchUsers]);

    const handleSwipe = async (direction: 'left' | 'right' | 'super') => {
        if (currentIndex >= users.length || !db) return;
        
        if (isLimitReached) {
            alert("You've reached your daily swipe limit! Upgrade to FlameUp+ for unlimited swipes.");
            return;
        }

        if (direction === 'super') {
            const freeLikes = currentUser.freeSuperLikes || 0;
            const currentCoins = currentUser.coins || 0;
            if (freeLikes <= 0 && currentCoins < SUPER_LIKE_COST) {
                alert(`Not enough coins! Super Like costs ${SUPER_LIKE_COST} coins.`);
                return;
            }
        }

        const swipedUser = users[currentIndex];
        setLastSwipedUser(swipedUser); // Store for undo
        
        setAnimation(direction === 'left' ? 'animate-swipe-out-left' : 'animate-swipe-out-right');
        hapticFeedback('light');
        
        setTimeout(() => { setCurrentIndex(prev => prev + 1); setAnimation(''); }, 300);

        try {
            if (swipedUser.id.startsWith('demo')) return;
            const batch = writeBatch(db);
            const userRef = doc(db, 'users', currentUser.id);
            
            // Update Swipe Lists & Counters
            const field = direction === 'left' ? 'swipedLeft' : 'swipedRight';
            batch.update(userRef, { 
                [field]: arrayUnion(swipedUser.id),
                dailySwipesUsed: increment(1) 
            });

            if (direction === 'super') {
                if ((currentUser.freeSuperLikes || 0) > 0) {
                    batch.update(userRef, { freeSuperLikes: increment(-1) });
                } else {
                    batch.update(userRef, { coins: increment(-SUPER_LIKE_COST) });
                }
            }

            // Update Target & Match Logic
            if (direction !== 'left') {
                const targetRef = doc(db, 'users', swipedUser.id);
                batch.update(targetRef, { hotnessScore: increment(direction === 'super' ? 10 : 2) });
                
                if (swipedUser.swipedRight?.includes(currentUser.id)) {
                    onNewMatch(swipedUser);
                    showXpToast(50);
                    // Match Notification Logic... (simplified)
                }
            }
            await batch.commit();
            onUpdateUser({ ...currentUser, dailySwipesUsed: swipesUsed + 1 });
        } catch (e) { console.error(e); }
    };
    
    const handleUndo = () => {
        if (!currentUser.isPremium) {
            alert("Undo is a Premium feature!");
            return;
        }
        if (lastSwipedUser && currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setLastSwipedUser(null);
            // In a real backend, we'd also remove them from swipedLeft/Right arrays here
        }
    };

    if (isLimitReached) {
        return (
            <div className="flex flex-col justify-center items-center h-full p-8 text-center bg-black">
                <FlameIcon isGradient className="w-24 h-24 mb-6" />
                <h2 className="text-2xl font-bold text-white mb-2">Out of Swipes!</h2>
                <p className="text-gray-400 mb-8">You've reached your daily limit of 20 swipes. Come back tomorrow or upgrade to FlameUp+ for unlimited action.</p>
                <button className="w-full py-4 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-xl shadow-lg transform hover:scale-105 transition-transform">
                    Upgrade to FlameUp+
                </button>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-black">
            {isFilterOpen && <FilterModal onClose={() => setIsFilterOpen(false)} onApply={(newFilters) => setFilters(newFilters)} currentFilters={filters} />}
            
            <header className="flex justify-between items-center px-4 py-3 flex-shrink-0 relative">
                <div className="w-8"></div>
                <img src="/assets/logo-icon.png" alt="FlameUp" className="h-8 dark:invert" />
                <div className="absolute top-3 right-14 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-white/10 flex items-center gap-1.5">
                    <FlameIcon isGradient className="w-4 h-4" />
                    <span className="text-sm font-bold text-white">{currentUser.coins || 0}</span>
                </div>
                <button onClick={() => setIsFilterOpen(true)} className="w-8 flex justify-center items-center text-gray-300">
                    <FilterIcon className="w-6 h-6" />
                </button>
            </header>

            {isLoading ? <div className="flex justify-center items-center h-full"><FlameLoader /></div> : (
                <div className="flex-1 flex flex-col justify-between items-center p-4 pb-24">
                    <div className="relative w-full h-full flex-1">
                        {users[currentIndex + 1] && <SwipeCard key={users[currentIndex + 1].id} user={users[currentIndex + 1]} isVisible={true} animation="transform scale-95 opacity-80" errorMsg="Error" errorTitle="Error" />}
                        {users[currentIndex] ? (
                            <SwipeCard key={users[currentIndex].id} user={users[currentIndex]} isVisible={true} animation={animation} distance={(users[currentIndex] as any)._distance} errorMsg="Profile Unavailable" errorTitle="Oops" />
                        ) : (
                            <div className="flex flex-col justify-center items-center h-full text-center p-4">
                                <h3 className="font-bold text-lg text-white">No more profiles</h3>
                                <button onClick={fetchUsers} className="mt-4 px-4 py-2 bg-flame-orange text-white rounded-lg">Refresh</button>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-around items-center w-full mt-4 flex-shrink-0">
                        {/* Undo Button (Premium) */}
                        <button onClick={handleUndo} className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-yellow-500 shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                        </button>
                        
                        <button onClick={() => handleSwipe('left')} className="w-16 h-16 bg-zinc-800 rounded-full shadow-lg flex justify-center items-center text-red-500 transform hover:scale-110 transition-transform">
                            <XIcon className="w-8 h-8" />
                        </button>
                        <button onClick={() => handleSwipe('super')} className="w-12 h-12 bg-zinc-800 rounded-full shadow-lg flex flex-col justify-center items-center text-blue-500 transform hover:scale-110 transition-transform relative">
                            <StarIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleSwipe('right')} className="w-16 h-16 bg-zinc-800 rounded-full shadow-lg flex justify-center items-center text-green-500 transform hover:scale-110 transition-transform">
                            <HeartIcon isLiked={false} className="w-8 h-8" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SwipeScreen;
