
import React, { useState } from 'react';
// FIX: Added file extension to types import
import { Post } from '../types.ts';
import { db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

interface EditPostModalProps {
  post: Post;
  onClose: () => void;
  onSave: (newCaption: string) => void;
  onDelete?: () => void; // New Prop for deletion
}

const EditPostModal: React.FC<EditPostModalProps> = ({ post, onClose, onSave, onDelete }) => {
  const [caption, setCaption] = useState(post.caption);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!db) return;
    setIsLoading(true);
    const postRef = doc(db, 'posts', post.id);
    try {
      await updateDoc(postRef, { caption: caption });
      onSave(caption);
    } catch (error) {
      console.error("Error updating post:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/70 flex justify-center items-center z-[100]" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-lg w-11/12 max-w-md overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex justify-between items-center p-3 border-b dark:border-zinc-800">
          <button onClick={onClose} className="text-gray-600 dark:text-gray-300">Cancel</button>
          <h2 className="font-semibold dark:text-white">Edit Post</h2>
          <button onClick={handleSave} disabled={isLoading} className="font-bold text-flame-orange disabled:opacity-50">
            {isLoading ? 'Saving...' : 'Done'}
          </button>
        </header>
        <div className="p-4">
          <div className="flex flex-col space-y-4">
            <div className="flex space-x-3">
                <img src={post.mediaUrls[0]} alt="Post thumbnail" className="w-20 h-20 object-cover rounded-md border dark:border-zinc-700" />
                <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="flex-1 h-20 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-flame-orange dark:bg-zinc-800 dark:border-zinc-700 dark:text-white resize-none"
                placeholder="Write a caption..."
                />
            </div>
            
            {onDelete && (
                <button 
                    onClick={onDelete} 
                    className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-lg border border-red-100 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                    Delete Post
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPostModal;
