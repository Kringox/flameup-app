import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.ts';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { User, Post } from '../types.ts';
import SearchIcon from '../components/icons/SearchIcon.tsx';
import VerifiedIcon from '../components/icons/VerifiedIcon.tsx';
import { calculateDistance } from '../utils/locationUtils.ts';
import FlameLoader from '../components/FlameLoader.tsx';
import NearbyUsersScreen from './NearbyUsersScreen.tsx';
import { useI18n } from '../contexts/I18nContext.ts';

// A simple hook for debouncing
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};


const UserResultRow: React.FC<{ user: User; onViewProfile: (userId: string) => void; }> = ({ user, onViewProfile }) => {
    return (
        <button onClick={() => onViewProfile(user.id)} className="w-full flex items-center p-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-800">
            <img src={user.profilePhotos?.[0]} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
            <div className="flex-1 ml-3">
                <p className="font-semibold flex items-center dark:text-gray-200">{user.name} {user.isPremium && <VerifiedIcon className="ml-1.5" />}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.aboutMe}</p>
            </div>
        </button>
    );
};


interface SearchScreenProps {
  currentUser: User;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
  onOpenComments: (post: Post) => void;
  onUpdateUser: (user: User) => void;
  onViewPostGrid: (posts: Post[], startIndex: number) => void;
}

const SearchScreen: React.FC<SearchScreenProps> = ({ currentUser, onClose, onViewProfile, onOpenComments, onUpdateUser, onViewPostGrid }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState<'users' | 'posts' | 'nearby'>('users');
    const [results, setResults] = useState<(User | Post)[]>([]);
    const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [postsCache, setPostsCache] = useState<Post[] | null>(null);
    const { t } = useI18n();

    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const placeholders = {
        users: 'Search for users by name...',
        posts: 'Search posts by keyword, #hashtag...',
        nearby: 'Showing users near you...',
    };
    
    useEffect(() => {
        const timer = setTimeout(() => {
            const fetchAllPosts = async () => {
                if (!db) {
                    setPostsCache([]);
                    return;
                }
                try {
                    const postsQuery = query(collection(db, 'posts'), orderBy('timestamp', 'desc'), limit(100));
                    const snapshot = await getDocs(postsQuery);
                    const allPosts = snapshot.docs.map(doc => {
                        const data = doc.data() as any;
                        const postUser = data.user || {
                            id: data.userId,
                            name: data.userName,
                            profilePhoto: data.userProfilePhoto,
                            isPremium: data.isPremium || false,
                        };
                        return {
                            id: doc.id,
                            userId: data.userId,
                            mediaUrls: data.mediaUrls || [],
                            caption: data.caption,
                            likedBy: data.likedBy || [],
                            commentCount: data.commentCount || 0,
                            timestamp: data.timestamp,
                            user: postUser,
                        } as Post;
                    });
                    setPostsCache(allPosts);
                } catch (error) {
                    console.error("Error pre-fetching posts for search:", error);
                    setPostsCache([]); 
                }
            };
            fetchAllPosts();
        }, 350); 

        return () => clearTimeout(timer);
    }, []); 

    useEffect(() => {
        const performSearch = async () => {
            if (!db) return;
            
            const term = debouncedSearchTerm.trim();

            if (searchType === 'nearby') {
                if (nearbyUsers.length > 0) return; // Don't refetch if already loaded
                setIsLoading(true);
                try {
                    const q = query(collection(db, 'users'), limit(100));
                    const snapshot = await getDocs(q);
                    const allUsers = snapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() } as User))
                        .filter(u => u.id !== currentUser.id && u.location);

                    const usersWithDistance = allUsers.map(u => ({
                        ...u,
                        distance: currentUser.location ? calculateDistance(
                            currentUser.location.latitude,
                            currentUser.location.longitude,
                            u.location!.latitude,
                            u.location!.longitude
                        ) : Infinity,
                    })).sort((a, b) => a.distance - b.distance);

                    setNearbyUsers(usersWithDistance);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsLoading(false);
                }
                return;
            }

            if (searchType === 'posts') {
                setIsLoading(postsCache === null); 
                if (postsCache === null) return; 
                
                if (term === '') {
                    setResults(postsCache.slice(0, 24)); 
                } else {
                    const lowercasedTerm = term.toLowerCase();
                    const postsFound = postsCache.filter(post => 
                        (post.caption || '').toLowerCase().includes(lowercasedTerm)
                    );
                    setResults(postsFound);
                }
                setIsLoading(false);
                return;
            }

            if (term === '') {
                setResults([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);

            try {
                if (searchType === 'users') {
                    const normalizedTerm = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
                    const q = query(
                        collection(db, 'users'), 
                        where('name', '>=', normalizedTerm),
                        where('name', '<=', normalizedTerm + '\uf8ff'),
                        limit(20)
                    );
                    const querySnapshot = await getDocs(q);
                    const usersFound = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) } as User)).filter(u => u.id !== currentUser.id);
                    setResults(usersFound);
                }
            } catch (error) {
                console.error("Error during search:", error);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        performSearch();
    }, [debouncedSearchTerm, searchType, currentUser, postsCache, nearbyUsers.length]);


    return (
        <div className="absolute inset-0 bg-gray-50 dark:bg-black z-[70] flex flex-col animate-slide-in-right">
            <header className="flex flex-col p-2 border-b dark:border-zinc-800 bg-white dark:bg-zinc-900/90 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center w-full">
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            placeholder={placeholders[searchType]}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={searchType === 'nearby'}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-full focus:outline-none focus:ring-2 focus:ring-flame-orange bg-gray-100 dark:bg-zinc-800 dark:text-gray-200 text-sm" 
                        />
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    <button onClick={onClose} className="ml-2 text-sm font-semibold text-gray-600 dark:text-gray-300 px-3">{t('cancel')}</button>
                </div>
                <div className="flex justify-around items-center w-full mt-2 border-t border-gray-200 dark:border-zinc-800 pt-2">
                    <button onClick={() => setSearchType('users')} className={`px-4 py-1 text-sm font-bold rounded-full ${searchType === 'users' ? 'bg-flame-orange text-white' : 'text-gray-500'}`}>Users</button>
                    <button onClick={() => setSearchType('posts')} className={`px-4 py-1 text-sm font-bold rounded-full ${searchType === 'posts' ? 'bg-flame-orange text-white' : 'text-gray-500'}`}>Posts</button>
                    <button onClick={() => setSearchType('nearby')} className={`px-4 py-1 text-sm font-bold rounded-full ${searchType === 'nearby' ? 'bg-flame-orange text-white' : 'text-gray-500'}`}>Nearby</button>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto">
                {isLoading ? <div className="flex justify-center items-center h-full"><FlameLoader /></div> 
                : searchType === 'nearby' ? (
                    <NearbyUsersScreen users={nearbyUsers} onViewProfile={onViewProfile} />
                )
                : searchType === 'users' ? (
                    results.map(user => <UserResultRow key={user.id} user={user as User} onViewProfile={onViewProfile} />)
                ) : (
                    <div className="grid grid-cols-3 gap-0.5">
                        {results.map((post, index) => (
                            <button key={post.id} onClick={() => onViewPostGrid(postsCache || [], postsCache?.findIndex(p => p.id === post.id) ?? 0)} className="aspect-square relative group overflow-hidden bg-zinc-900">
                                <img src={(post as Post).mediaUrls[0]} alt="post" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default SearchScreen;