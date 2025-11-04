import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebaseConfig.ts';
import { collection, query, where, getDocs, limit, doc, updateDoc, arrayUnion, getDoc, addDoc, serverTimestamp, Timestamp, writeBatch, increment } from 'firebase/firestore';
// FIX: Added file extension to types and constants imports
import { User, NotificationType } from '../types.ts';
// FIX: Added file extension to icon imports
import XIcon from '../components/icons/XIcon.tsx';
import HeartIcon from '../components/icons/HeartIcon.tsx';
import StarIcon from '../components/icons/StarIcon.tsx';
import FilterIcon from '../components/icons/FilterIcon.tsx';
import FilterModal from '../components/FilterModal.tsx';
import FlameLoader from '../components/FlameLoader.tsx';
import { hapticFeedback } from '../utils/haptics.ts';

const DAILY_SWIPE_LIMIT = 20;
const SUPERLIKE_COST = 5;

const ProfileCard: React.FC<{ user: User, swipeDirection: 'left' | 'right' | null }> = ({ user, swipeDirection }) => {
    let animationClass = '';
    if (swipeDirection === 'left') animationClass = 'swiping-left';
    if (swipeDirection === 'right') animationClass = 'swiping-right';

    return (
        <div className={`absolute top-0 left-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-gray-300 dark:bg-zinc-800 transition-transform duration-500 ${animationClass}`}>
            <img src={user.profilePhotos[0]} alt={user.name} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col justify-end">
                <h2 className="text-white text-3xl font-bold">{user.name}, {user.age}</h2>
                <p className="text-white text-lg line-clamp-2">{user.bio}</p>
            </div>
        </div>
    );
};


interface SwipeScreenProps {
    currentUser: User;
    onNewMatch: (matchedUser: User) => void;
    onUpdateUser: (user: User) => void;
}

const SwipeScreen: React.FC<SwipeScreenProps> = ({ currentUser, onNewMatch, onUpdateUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [filters, setFilters] = useState({ ageRange: [18, 40] as [number, number], distance: 50 });
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

    const swipesLeft = useMemo(() => Math.max(0, DAILY_SWIPE_LIMIT - (currentUser.dailySwipesUsed || 0)), [currentUser.dailySwipesUsed]);

    useEffect(() => {
        const checkSwipeReset = async () => {
            if (!db) return;
            const now = Timestamp.now();
            const lastReset = currentUser.lastSwipeReset || new Timestamp(0, 0);
            const hoursSinceReset = (now.seconds - lastReset.seconds) / 3600;

            if (hoursSinceReset >= 24) {
                const userRef = doc(db, 'users', currentUser.id);
                await updateDoc(userRef, {
                    dailySwipesUsed: 0,
                    lastSwipeReset: now
                });
                onUpdateUser({ ...currentUser, dailySwipesUsed: 0, lastSwipeReset: now });
            }
        };
        checkSwipeReset();
    }, []);

    useEffect(() => {
        const fetchUsers = async () => {
            if (!db) return;
            setIsLoading(true);
            const seenUsers = [...(currentUser.swipedLeft || []), ...(currentUser.swipedRight || []), currentUser.id, ...(currentUser.blockedUsers || [])];
            
            const usersRef = collection(db, 'users');
            // This query is basic. A real-world app would have more complex filtering (location, age, etc.)
            const q = query(usersRef, where('id', 'not-in', seenUsers.slice(0,10)), limit(20));
            
            try {
                const querySnapshot = await getDocs(q);
                const fetchedUsers = querySnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as User));

                setUsers(fetchedUsers);
            } catch (error) {
                 console.error("Error fetching users. It's possible the 'not-in' query limit was exceeded.", error);
                 // Fallback to a simpler query if the initial one fails
                 const fallbackQuery = query(usersRef, limit(20));
                 const fallbackSnapshot = await getDocs(fallbackQuery);
                 const fetchedUsers = fallbackSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as User))
                    .filter(user => !seenUsers.includes(user.id));
                 setUsers(fetchedUsers);
            }
            
            setCurrentIndex(0);
            setIsLoading(false);
        };
        fetchUsers();
    }, [currentUser.id, currentUser.swipedLeft, currentUser.swipedRight, currentUser.blockedUsers]);
    
    const advanceToNextUser = () => {
        setCurrentIndex(prevIndex => prevIndex + 1);
        setSwipeDirection(null);
    }

    const handleSwipeAction = async (targetUser: User, action: 'pass' | 'like' | 'superlike') => {
        if (!db || swipeDirection) return;

        let cost = 0;
        if (action === 'superlike') cost = SUPERLIKE_COST;
        else if (swipesLeft <= 0) cost = 1;

        if (currentUser.coins < cost) {
            alert("You don't have enough coins!");
            return;
        }

        hapticFeedback('light');
        setSwipeDirection(action === 'pass' ? 'left' : 'right');

        setTimeout(() => {
            advanceToNextUser();
        }, 500);

        try {
            const batch = writeBatch(db);
            const userRef = doc(db, 'users', currentUser.id);

            const updates: any = {};
            if (cost > 0) updates.coins = increment(-cost);
            if (action !== 'superlike' && swipesLeft > 0) updates.dailySwipesUsed = increment(1);

            if (action === 'pass') {
                updates.swipedLeft = arrayUnion(targetUser.id);
            } else { // like, superlike
                updates.swipedRight = arrayUnion(targetUser.id);
            }
            batch.update(userRef, updates);

            // Check for match
            if (action !== 'pass') {
                const targetUserDoc = await getDoc(doc(db, 'users', targetUser.id));
                if (targetUserDoc.exists() && targetUserDoc.data().swipedRight?.includes(currentUser.id)) {
                    onNewMatch(targetUser);
                    hapticFeedback('success');
                    
                    const myNotifRef = doc(collection(db, 'users', currentUser.id, 'notifications'));
                    batch.set(myNotifRef, { type: NotificationType.Match, fromUser: { id: targetUser.id, name: targetUser.name, profilePhoto: targetUser.profilePhotos[0] }, read: false, timestamp: serverTimestamp() });
                    
                    const theirNotifRef = doc(collection(db, 'users', targetUser.id, 'notifications'));
                    batch.set(theirNotifRef, { type: NotificationType.Match, fromUser: { id: currentUser.id, name: currentUser.name, profilePhoto: currentUser.profilePhotos[0] }, read: false, timestamp: serverTimestamp() });
                } else if (action === 'superlike') {
                    const theirNotifRef = doc(collection(db, 'users', targetUser.id, 'notifications'));
                    batch.set(theirNotifRef, { type: NotificationType.SuperLike, fromUser: { id: currentUser.id, name: currentUser.name, profilePhoto: currentUser.profilePhotos[0] }, read: false, timestamp: serverTimestamp() });
                }
            }

            await batch.commit();
            
            const updatedUserFields: Partial<User> = {
                coins: currentUser.coins - cost
            };
            if (action !== 'superlike' && swipesLeft > 0) {
                 updatedUserFields.dailySwipesUsed = (currentUser.dailySwipesUsed || 0) + 1;
            }
            onUpdateUser({ ...currentUser, ...updatedUserFields });
        } catch (error) {
            console.error("Error processing swipe:", error);
            // Revert on error could be complex with animations, so we'll just log for now
        }
    };

    const currentProfile = !isLoading && users.length > currentIndex ? users[currentIndex] : null;
    const canSwipe = swipesLeft > 0 || currentUser.coins > 0;
    const canSuperLike = currentUser.coins >= SUPERLIKE_COST;
    

    return (
        <div className="w-full h-full flex flex-col items-center bg-gray-100 dark:bg-zinc-900 p-4">
            {isFilterModalOpen && <FilterModal onClose={() => setIsFilterModalOpen(false)} onApply={setFilters} currentFilters={filters}/>}
            
            <header className="w-full flex justify-between items-center mb-4 text-dark-gray dark:text-gray-200">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-flame-orange to-flame-red">Discover</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right">
                        <p className="font-bold">{swipesLeft > 0 ? swipesLeft : currentUser.coins}</p>
                        <p className="text-xs text-gray-500">{swipesLeft > 0 ? 'Free Swipes' : 'Coins Left'}</p>
                    </div>
                    <button onClick={() => setIsFilterModalOpen(true)}>
                        <FilterIcon className="w-6 h-6" />
                    </button>
                </div>
            </header>

            <div className="relative flex-1 w-full max-w-sm mb-4">
                {isLoading && <div className="flex justify-center items-center h-full"><FlameLoader /></div>}
                {!isLoading && users[currentIndex + 1] && (
                    <div className="absolute top-0 left-0 w-full h-full transform scale-95 opacity-75">
                         <ProfileCard user={users[currentIndex + 1]} swipeDirection={null}/>
                    </div>
                )}
                {!isLoading && currentProfile && <ProfileCard user={currentProfile} swipeDirection={swipeDirection}/>}
                {!isLoading && !currentProfile && (
                    <div className="flex flex-col justify-center items-center h-full text-center p-4 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg">
                        <h2 className="text-xl font-bold text-dark-gray dark:text-gray-200">That's Everyone!</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">You've seen all the profiles for now. Check back later for new people.</p>
                    </div>
                )}
            </div>

            <div className="flex justify-around items-center w-full max-w-xs">
                <button onClick={() => currentProfile && handleSwipeAction(currentProfile, 'pass')} disabled={!currentProfile || !canSwipe || !!swipeDirection} className="w-16 h-16 rounded-full bg-white dark:bg-zinc-700 shadow-lg flex justify-center items-center disabled:opacity-50 transition-transform hover:scale-110">
                    <XIcon className="w-8 h-8 text-gray-500" />
                </button>
                <button onClick={() => currentProfile && handleSwipeAction(currentProfile, 'like')} disabled={!currentProfile || !canSwipe || !!swipeDirection} className="w-20 h-20 rounded-full bg-white dark:bg-zinc-700 shadow-lg flex justify-center items-center text-red-500 disabled:opacity-50 transition-transform hover:scale-110">
                    <HeartIcon isLiked={false} className="w-10 h-10" />
                </button>
                <button onClick={() => currentProfile && handleSwipeAction(currentProfile, 'superlike')} disabled={!currentProfile || !canSuperLike || !!swipeDirection} className="w-16 h-16 rounded-full bg-white dark:bg-zinc-700 shadow-lg flex justify-center items-center text-blue-500 disabled:opacity-50 transition-transform hover:scale-110">
                    <StarIcon className="w-8 h-8" />
                </button>
            </div>
        </div>
    );
};

export default SwipeScreen;
