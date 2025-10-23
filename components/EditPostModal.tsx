
import React, { useState } from 'react';
import { Post } from '../types';
import { db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

interface EditPostModalProps {
  post: Post;
  onClose: () => void;
  onSave: (newCaption: string) => void;
}

const EditPostModal: React.FC<EditPostModalProps> = ({ post, onClose, onSave }) => {
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
      <div className="bg-white rounded-lg w-11/12 max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <header className="flex justify-between items-center p-3 border-b">
          <button onClick={onClose} className="text-gray-600">Cancel</button>
          <h2 className="font-semibold">Edit Post</h2>
          <button onClick={handleSave} disabled={isLoading} className="font-bold text-flame-orange disabled:opacity-50">
            {isLoading ? 'Saving...' : 'Done'}
          </button>
        </header>
        <div className="p-4">
          <div className="flex space-x-3">
            <img src={post.mediaUrls[0]} alt="Post thumbnail" className="w-16 h-16 object-cover rounded-md" />
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full h-24 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-flame-orange"
              placeholder="Write a caption..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPostModal;
