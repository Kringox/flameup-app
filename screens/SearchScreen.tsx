import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.ts';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { User, Post } from '../types.ts';
import SearchIcon from '../components/icons/SearchIcon.tsx';
import PostCard from '../components/PostCard.tsx';
import VerifiedIcon from '../components/icons/VerifiedIcon.tsx';

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
}

const SearchScreen: React.FC<SearchScreenProps> = ({ currentUser, onClose, onViewProfile, onOpenComments, onUpdateUser }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState<'users' | 'posts'>('users');
    const [results, setResults] = useState<(User | Post)[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [postsCache, setPostsCache] = useState<Post[] | null>(null);

    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const placeholders = {
        users: 'Search for users by name...',
        posts: 'Search posts by keyword, #hashtag...',
    };
    
    // Pre-warm the posts cache for searching after the screen has animated in
    useEffect(() => {
        const timer = setTimeout(() => {
            const fetchAllPosts = async () => {
                if (!db) {
                    setPostsCache([]);
                    return;
                }
                try {
                    const postsQuery = query(collection(db, 'posts'), orderBy('timestamp', 'desc'), limit(200));
                    const snapshot = await getDocs(postsQuery);
                    const allPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
                    setPostsCache(allPosts);
                } catch (error) {
                    console.error("Error pre-fetching posts for search:", error);
                    setPostsCache([]); // Set to empty array on error to stop loading
                }
            };
            fetchAllPosts();
        }, 350); // Delay should be slightly longer than the slide-in animation (300ms)

        return () => clearTimeout(timer);
    }, []); // Run only on mount

    useEffect(() => {
        const performSearch = async () => {
            if (!debouncedSearchTerm.trim()) {
                setResults([]);
                setIsLoading(false);
                setHasSearched(false);
                return;
            }
            if (!db) return;

            setIsLoading(true);
            setHasSearched(true);

            try {
                if (searchType === 'users') {
                    const normalizedTerm = debouncedSearchTerm.charAt(0).toUpperCase() + debouncedSearchTerm.slice(1).toLowerCase();
                    const q = query(
                        collection(db, 'users'), 
                        where('name', '>=', normalizedTerm),
                        where('name', '<=', normalizedTerm + '\uf8ff'),
                        limit(20)
                    );
                    const querySnapshot = await getDocs(q);
                    const usersFound = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)).filter(u => u.id !== currentUser.id);
                    setResults(usersFound);

                } else if (searchType === 'posts') {
                    if (postsCache === null) {
                        // The cache is still warming up, isLoading is already true
                        return;
                    }
                    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
                    // FIX: Safeguard against posts with null or undefined captions to prevent crashes
                    const postsFound = postsCache.filter(post => 
                        (post.caption || '').toLowerCase().includes(lowercasedTerm)
                    );
                    setResults(postsFound);
                }
            } catch (error) {
                console.error("Error during search:", error);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        performSearch();
    }, [debouncedSearchTerm, searchType, currentUser.id, postsCache]);

    const handlePostDeleted = (postId: string) => {
        setResults(currentResults => currentResults.filter(p => p.id !== postId));
    };

    return (
        <div className="absolute inset-0 bg-gray-50 dark:bg-black z-[70] flex flex-col animate-slide-in-right">
            <header className="flex items-center p-2 border-b dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
                <div className="relative flex-1">
                     <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <SearchIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder={placeholders[searchType]}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-full focus:outline-none focus:ring-2 focus:ring-flame-orange bg-transparent dark:text-gray-200"
                    />
                </div>
                <button onClick={onClose} className="ml-2 px-4 py-2 text-gray-600 dark:text-gray-300 font-semibold">Cancel</button>
            </header>
            
            <div className="p-2 flex-shrink-0 border-b dark:border-zinc-800">
                <div className="flex bg-gray-200 dark:bg-zinc-800 rounded-lg p-1">
                    <button
                        onClick={() => setSearchType('users')}
                        className={`flex-1 py-1.5 text-sm font-semibold rounded-md ${searchType === 'users' ? 'bg-white dark:bg-zinc-900 shadow text-flame-orange' : 'text-gray-600 dark:text-gray-300'}`}
                    >
                        Users
                    </button>
                     <button
                        onClick={() => setSearchType('posts')}
                        className={`flex-1 py-1.5 text-sm font-semibold rounded-md ${searchType === 'posts' ? 'bg-white dark:bg-zinc-900 shadow text-flame-orange' : 'text-gray-600 dark:text-gray-300'}`}
                    >
                        Posts
                    </button>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-200"></div></div>
                ) : hasSearched && results.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">
                        <h3 className="font-semibold">No results found</h3>
                        <p className="text-sm">Try a different search term.</p>
                    </div>
                ) : !hasSearched ? (
                    <div className="text-center p-8 text-gray-500">
                        <h3 className="font-semibold">Search for users or posts</h3>
                        <p className="text-sm">Find new people to follow or see what's trending.</p>
                    </div>
                ) : (
                    <div className={searchType === 'posts' ? 'p-2 md:p-4' : ''}>
                        {results.map(item => {
                            if (searchType === 'users' && 'profilePhotos' in item) {
                                return <UserResultRow key={item.id} user={item as User} onViewProfile={onViewProfile} />
                            }
                            if (searchType === 'posts' && 'mediaUrls' in item) {
                                return <PostCard key={item.id} post={item as Post} currentUser={currentUser} onPostDeleted={handlePostDeleted} onOpenComments={onOpenComments} onViewProfile={onViewProfile} onUpdateUser={onUpdateUser} />
                            }
                            return null;
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default SearchScreen;
