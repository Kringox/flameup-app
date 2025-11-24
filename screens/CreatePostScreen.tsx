
import React, { useState, useRef, useContext } from 'react';
import { User } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { uploadPhotos } from '../utils/photoUploader.ts';
import { XpContext } from '../contexts/XpContext.ts';
import FlameIcon from '../components/icons/FlameIcon.tsx';

interface CreatePostScreenProps {
  user: User;
  onClose: () => void;
}

const CreatePostScreen: React.FC<CreatePostScreenProps> = ({ user, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [isPaid, setIsPaid] = useState(false);
    const [price, setPrice] = useState<number>(10); // Default price
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
                // Flame-Post Data
                isPaid: isPaid,
                price: isPaid ? price : 0,
                unlockedBy: [],
            });

            // Small self-action boost
            showXpToast(10); 
            
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

            <main className="flex-1 p-4 overflow-y-auto">
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

                <div className="mt-6 bg-gray-50 dark:bg-zinc-800 p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <FlameIcon isGradient className="w-6 h-6 mr-2" />
                            <div>
                                <p className="font-bold text-dark-gray dark:text-gray-200">Flame-Post</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Make this post exclusive (Paid)</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={isPaid} 
                                onChange={(e) => setIsPaid(e.target.checked)} 
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-flame-orange"></div>
                        </label>
                    </div>

                    {isPaid && (
                        <div className="mt-4 animate-fade-in">
                            <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">Price (FlameCoins)</label>
                            <div className="flex items-center mt-2">
                                <FlameIcon className="w-5 h-5 text-flame-orange mr-2" />
                                <input 
                                    type="number" 
                                    value={price}
                                    onChange={(e) => setPrice(Math.max(1, parseInt(e.target.value) || 0))}
                                    className="flex-1 p-2 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700 dark:text-gray-200 focus:ring-2 focus:ring-flame-orange focus:outline-none"
                                    min="1"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                Users must pay this amount to view the photo. You will receive the coins.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default CreatePostScreen;
