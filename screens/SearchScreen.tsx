import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.ts';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { User, Post } from '../types.ts';
import SearchIcon from '../components/icons/SearchIcon.tsx';
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
  onViewPostGrid: (posts: Post[], startIndex: number) => void;
}

const SearchScreen: React.FC<SearchScreenProps> = ({ currentUser, onClose, onViewProfile, onOpenComments, onUpdateUser, onViewPostGrid }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState<'users' | 'posts'>('users');
    const [results, setResults] = useState<(User | Post)[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [postsCache, setPostsCache] = useState<Post[] | null>(null);

    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const placeholders = {
        users: 'Search for users by name...',
        posts: 'Search posts by keyword, #hashtag...',
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
                        const data = doc.data();
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
                    const usersFound = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)).filter(u => u.id !== currentUser.id);
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
    }, [debouncedSearchTerm, searchType, currentUser.id, postsCache]);


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
                        onClick={() => { setSearchTerm(''); setResults([]); setSearchType('users'); }}
                        className={`flex-1 py-1.5 text-sm font-semibold rounded-md ${searchType === 'users' ? 'bg-white dark:bg-zinc-900 shadow text-flame-orange' : 'text-gray-600 dark:text-gray-300'}`}
                    >
                        Users
                    </button>
                     <button
                        onClick={() => { setSearchTerm(''); setResults([]); setSearchType('posts'); }}
                        className={`flex-1 py-1.5 text-sm font-semibold rounded-md ${searchType === 'posts' ? 'bg-white dark:bg-zinc-900 shadow text-flame-orange' : 'text-gray-600 dark:text-gray-300'}`}
                    >
                        Posts
                    </button>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-200"></div></div>
                ) : results.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">
                        <h3 className="font-semibold">{searchTerm ? 'No results found' : 'Search for users or posts'}</h3>
                        <p className="text-sm">{searchTerm ? 'Try a different search term.' : 'Find new people or see what\'s trending.'}</p>
                    </div>
                ) : (
                    <div>
                        {searchType === 'users' && results.map(item => (
                            <UserResultRow key={item.id} user={item as User} onViewProfile={onViewProfile} />
                        ))}

                        {searchType === 'posts' && (
                            <div className="grid grid-cols-3 gap-0.5">
                                {(results as Post[]).map((post, index) => (
                                    <button 
                                        key={post.id} 
                                        className="aspect-square bg-gray-200 dark:bg-zinc-800"
                                        onClick={() => onViewPostGrid(results as Post[], index)}
                                    >
                                        <img src={post.mediaUrls[0]} alt={post.caption} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default SearchScreen;