import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.ts';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { User, Post } from '../types.ts';
import PostGridViewer from '../components/PostGridViewer.tsx';
import FlameLoader from '../components/FlameLoader.tsx';

interface DeepLinkedPostHandlerProps {
    postId: string;
    currentUser: User;
    onClose: () => void;
    onUpdateUser: (user: User) => void;
    onViewProfile: (userId: string) => void;
    onOpenComments: (post: Post) => void;
}

const DeepLinkedPostHandler: React.FC<DeepLinkedPostHandlerProps> = ({
    postId,
    currentUser,
    onClose,
    onUpdateUser,
    onViewProfile,
    onOpenComments,
}) => {
    const [postData, setPostData] = useState<{ posts: Post[], startIndex: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPostAndRelated = async () => {
            if (!db) {
                setError("Database not available.");
                setIsLoading(false);
                return;
            }
            try {
                // 1. Fetch the single deep-linked post
                const postRef = doc(db, 'posts', postId);
                const postSnap = await getDoc(postRef);

                if (!postSnap.exists()) {
                    setError("Post not found.");
                    setIsLoading(false);
                    return;
                }

                const singlePost = { id: postSnap.id, ...postSnap.data() } as Post;
                const userId = singlePost.userId;

                // 2. Fetch all posts by that user
                const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId), orderBy('timestamp', 'desc'));
                const allPostsSnap = await getDocs(postsQuery);
                const allUserPosts = allPostsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Post));

                // 3. Find the index of the deep-linked post
                const startIndex = allUserPosts.findIndex(p => p.id === postId);

                if (startIndex === -1) {
                     setError("Post not found in user's feed.");
                     setIsLoading(false);
                     return;
                }

                setPostData({ posts: allUserPosts, startIndex });
            } catch (err) {
                console.error("Error fetching deep-linked post:", err);
                setError("Could not load post.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchPostAndRelated();
    }, [postId]);

    if (isLoading) {
        return <div className="h-full w-full flex items-center justify-center bg-black"><FlameLoader /></div>;
    }

    if (error) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-black text-white p-4">
                <h2 className="text-xl font-bold">Error</h2>
                <p className="text-gray-400 my-2">{error}</p>
                <button onClick={onClose} className="px-4 py-2 bg-flame-orange rounded-lg">Go to App</button>
            </div>
        );
    }

    if (postData) {
        return (
            <PostGridViewer
                posts={postData.posts}
                startIndex={postData.startIndex}
                currentUser={currentUser}
                onClose={onClose}
                onOpenComments={onOpenComments}
                onViewProfile={onViewProfile}
                onUpdateUser={onUpdateUser}
            />
        );
    }

    return null;
};

export default DeepLinkedPostHandler;