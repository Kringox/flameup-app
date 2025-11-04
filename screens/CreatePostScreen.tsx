import React, { useState, useRef, useContext } from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
// FIX: Added file extension to photoUploader import
import { uploadPhotos } from '../utils/photoUploader.ts';
import { XpAction } from '../utils/xpUtils.ts';
import { XpContext } from '../contexts/XpContext.ts';

interface CreatePostScreenProps {
  user: User;
  onClose: () => void;
}

const CreatePostScreen: React.FC<CreatePostScreenProps> = ({ user, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showXpToast } = useContext(XpContext);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleShare = async () => {
        if (!file || !db) return;
        setIsLoading(true);
        try {
            const [uploadedUrl] = await uploadPhotos([file]);

            await addDoc(collection(db, 'posts'), {
                userId: user.id,
                user: {
                    id: user.id,
                    name: user.name,
                    profilePhoto: user.profilePhotos[0],
                    isPremium: user.isPremium || false,
                },
                mediaUrls: [uploadedUrl],
                caption: caption,
                likedBy: [],
                commentCount: 0,
                timestamp: serverTimestamp(),
            });

            // Grant XP for posting
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, { xp: increment(XpAction.CREATE_POST) });
            showXpToast(XpAction.CREATE_POST);
            
            onClose();
        } catch (error) {
            console.error("Error creating post:", error);
            alert("Could not create post. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="absolute inset-0 bg-white dark:bg-zinc-900 z-50 flex flex-col animate-fade-in">
            <header className="flex justify-between items-center p-4 border-b dark:border-zinc-800">
                <button onClick={onClose} className="text-lg text-gray-600 dark:text-gray-300">Cancel</button>
                <h1 className="text-xl font-bold dark:text-gray-100">New Post</h1>
                <button onClick={handleShare} disabled={!file || isLoading} className="text-lg font-bold text-flame-orange disabled:opacity-50">
                    {isLoading ? 'Sharing...' : 'Share'}
                </button>
            </header>

            <main className="flex-1 p-4">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                {!preview ? (
                    <button onClick={() => fileInputRef.current?.click()} className="w-full h-64 bg-gray-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400">Select a photo</p>
                    </button>
                ) : (
                    <img src={preview} alt="preview" className="w-full h-auto max-h-96 object-contain rounded-lg" />
                )}
                
                <textarea 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption..."
                    className="w-full mt-4 p-2 border-t border-b dark:border-zinc-800 focus:outline-none bg-transparent dark:text-gray-200"
                    rows={3}
                />
            </main>
        </div>
    );
};

export default CreatePostScreen;
