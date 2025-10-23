import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, NotificationType } from '../types';
import FlameIcon from '../components/icons/FlameIcon';
import MatchModal from '../components/MatchModal';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, where, doc, writeBatch, serverTimestamp, addDoc, setDoc, limit, orderBy, startAfter, QueryDocumentSnapshot, documentId } from 'firebase/firestore';

const PLACEHOLDER_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';
const getChatId = (uid1: string, uid2: string) => [uid1, uid2].sort().join('_');

const ProfileCard: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-gray-300">
      <img src={user.profilePhotos?.[0] || PLACEHOLDER_AVATAR} alt={user.name} className="w-full h-full object-cover" />
      <div className="absolute bottom-0 left-0 w-full h-2/5 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col justify-end">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-white text-3xl font-bold drop-shadow-lg">{user.name}, {user.age}</h2>
            <p className="text-white text-md drop-shadow-md">{user.distance} km away</p>
          </div>
          <button className="w-10 h-10 rounded-full border-2 border-white/50 flex items-center justify-center backdrop-blur-sm bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>
        <p className="text-gray-200 text-sm mt-2 line-clamp-2 drop-shadow-md">{user.bio}</p>
      </div>
    </div>
  );
};

interface SwipeScreenProps {
    currentUser: User;
    onStartChat: (partnerId: string) => void;
}

const SwipeScreen: React.FC<SwipeScreenProps> = ({ currentUser, onStartChat }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showMatch, setShowMatch] = useState<User | null>(null);
    const [swipedUserId, setSwipedUserId] = useState<string | null>(null);
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | null>(null);

    const lastFetchedDoc = useRef<QueryDocumentSnapshot | null>(null);
    const isFetching = useRef(false);
    const allLoaded = useRef(false);

    const fetchUsers = useCallback(async () => {
        if (isFetching.current || allLoaded.current || !db) return;

        isFetching.current = true;
        if (!lastFetchedDoc.current) {
            setIsLoading(true);
        }

        try {
            const swipesSnapshot = await getDocs(query(collection(db, 'swipes'), where("swiperId", "==", currentUser.id)));
            const swipedUserIds = new Set(swipesSnapshot.docs.map(doc => doc.data().swipedUserId));
            swipedUserIds.add(currentUser.id);

            let potentialUsers: User[] = [];
            
            while (potentialUsers.length === 0 && !allLoaded.current) {
                const usersCollection = collection(db, 'users');
                const BATCH_SIZE = 10;
                let q;

                if (lastFetchedDoc.current) {
                    q = query(usersCollection, orderBy(documentId()), startAfter(lastFetchedDoc.current), limit(BATCH_SIZE));
                } else {
                    q = query(usersCollection, orderBy(documentId()), limit(BATCH_SIZE));
                }

                const userSnapshot = await getDocs(q);

                if (userSnapshot.empty) {
                    allLoaded.current = true;
                    break;
                }

                lastFetchedDoc.current = userSnapshot.docs[userSnapshot.docs.length - 1];

                potentialUsers = userSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as User))
                    .filter(user => !swipedUserIds.has(user.id));
            }

            if (potentialUsers.length > 0) {
                setUsers(current => [...current, ...potentialUsers]);
            }
        } catch (error) {
            console.error("Error fetching users: ", error);
        } finally {
            setIsLoading(false);
            isFetching.current = false;
        }
    }, [currentUser.id]);

    useEffect(() => {
        lastFetchedDoc.current = null;
        allLoaded.current = false;
        isFetching.current = false;
        setUsers([]);
        fetchUsers();
    }, [fetchUsers]);

    const handleSwipe = async (direction: 'left' | 'right' | 'up') => {
        if (users.length === 0 || swipedUserId || !db) return;

        const targetUser = users[0];
        setSwipeDirection(direction);
        setSwipedUserId(targetUser.id);
        
        const batch = writeBatch(db);
        const swipeDocRef = doc(collection(db, 'swipes'));
        batch.set(swipeDocRef, {
            swiperId: currentUser.id,
            swipedUserId: targetUser.id,
            action: direction === 'left' ? 'dislike' : 'like',
            timestamp: serverTimestamp()
        });
        
        await batch.commit();

        setTimeout(async () => {
            if (direction !== 'left') {
                const otherUserSwipeRef = query(collection(db, 'swipes'), 
                    where("swiperId", "==", targetUser.id),
                    where("swipedUserId", "==", currentUser.id),
                    where("action", "==", "like")
                );
                
                const otherUserSwipeSnapshot = await getDocs(otherUserSwipeRef);
                
                if (!otherUserSwipeSnapshot.empty) {
                    setShowMatch(targetUser);
                    
                    const chatId = getChatId(currentUser.id, targetUser.id);
                    const chatDocRef = doc(db, 'chats', chatId);
                    await setDoc(chatDocRef, {
                        userIds: [currentUser.id, targetUser.id],
                        users: {
                            [currentUser.id]: { name: currentUser.name, profilePhoto: currentUser.profilePhotos?.[0] || PLACEHOLDER_AVATAR },
                            [targetUser.id]: { name: targetUser.name, profilePhoto: targetUser.profilePhotos?.[0] || PLACEHOLDER_AVATAR }
                        },
                        lastMessage: null,
                        unreadCount: { [currentUser.id]: 0, [targetUser.id]: 0 }
                    }, { merge: true });

                    const notificationsRef = collection(db, 'users', targetUser.id, 'notifications');
                    await addDoc(notificationsRef, {
                        type: NotificationType.Match,
                        fromUser: {
                            id: currentUser.id,
                            name: currentUser.name,
                            profilePhoto: currentUser.profilePhotos?.[0] || '',
                        },
                        read: false,
                        timestamp: serverTimestamp(),
                    });
                }
            }

            const remainingUsers = users.slice(1);
            setUsers(remainingUsers);
            
            if (remainingUsers.length < 5) {
                fetchUsers();
            }

            setSwipedUserId(null);
            setSwipeDirection(null);
        }, 400);
    };

    const handleSendMessageFromMatch = () => {
        if(showMatch) {
            onStartChat(showMatch.id);
            setShowMatch(null);
        }
    }
    
    const handleRefresh = () => {
        lastFetchedDoc.current = null;
        allLoaded.current = false;
        setUsers([]);
        fetchUsers();
    };

    return (
    <div className="flex flex-col h-full w-full bg-gray-100 overflow-hidden">
      {showMatch && <MatchModal matchedUser={showMatch} currentUser={currentUser} onSendMessage={handleSendMessageFromMatch} onClose={() => setShowMatch(null)} />}
      <header className="flex justify-between items-center p-4 bg-white border-b flex-shrink-0">
        <FlameIcon className="w-8 h-8" isGradient={true} />
        <div className="flex items-center space-x-2 bg-yellow-100 text-yellow-700 font-bold px-3 py-1 rounded-full">
            <span>🪙</span>
            <span>{currentUser.coins} Coins</span>
        </div>
      </header>

      <div className="flex-1 relative flex items-center justify-center p-4">
        {isLoading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        ) : users.length > 0 ? (
            users.slice(0, 2).reverse().map((user, index) => {
                const isTopCard = index === 1;
                const isSwiping = isTopCard && swipedUserId === user.id;

                let swipeClass = '';
                if (isSwiping) {
                    if (swipeDirection === 'left') swipeClass = 'transform -translate-x-full -rotate-15';
                    if (swipeDirection === 'right') swipeClass = 'transform translate-x-full rotate-15';
                    if (swipeDirection === 'up') swipeClass = 'transform -translate-y-full';
                }

                return (
                    <div 
                        key={user.id} 
                        className={`absolute w-full h-full transition-all duration-300 ease-in-out ${swipeClass} ${isTopCard ? 'transform scale-100' : 'transform scale-95 -translate-y-2'}`}
                    >
                        <ProfileCard user={user} />
                    </div>
                );
            })
        ) : (
            <div className="w-full h-full flex flex-col justify-center items-center text-center p-8 bg-white rounded-2xl shadow-lg">
                <FlameIcon className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-xl font-semibold text-gray-700">That's everyone for now!</p>
                <p className="text-gray-500 mt-2 mb-6">Check back later to see new profiles.</p>
                <button onClick={handleRefresh} className="py-3 px-6 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition-transform">
                    Refresh
                </button>
            </div>
        )}
      </div>

      {users.length > 0 && (
          <div className="flex justify-around items-center w-full max-w-md mx-auto px-4 pb-6 pt-2">
              <button className="bg-white rounded-full p-3 shadow-lg transform hover:scale-110 transition-transform text-yellow-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.5 9.5A8.5 8.5 0 0112 4.055a8.5 8.5 0 019.5 9.5M20 20v-5h-5" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.5 14.5a8.5 8.5 0 01-9.5 5.445A8.5 8.5 0 012.5 14.5" /></svg>
              </button>
              <button onClick={() => handleSwipe('left')} className="bg-white rounded-full p-5 shadow-xl transform hover:scale-110 transition-transform text-error-red">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <button onClick={() => handleSwipe('up')} className="bg-white rounded-full p-3 shadow-lg transform hover:scale-110 transition-transform text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              </button>
              <button onClick={() => handleSwipe('right')} className="bg-white rounded-full p-5 shadow-xl transform hover:scale-110 transition-transform text-success-green">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
              </button>
              <button className="bg-white rounded-full p-3 shadow-lg transform hover:scale-110 transition-transform text-purple-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
              </button>
          </div>
      )}
    </div>
  );
};

export default SwipeScreen;