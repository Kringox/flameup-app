import React, { useState, useRef, useContext } from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
// FIX: Added file extension to photoUploader import
import { uploadPhotos } from '../utils/photoUploader.ts';
import { XpAction } from '../utils/xpUtils.ts';
import { XpContext } from '../contexts/XpContext.ts';


interface StoryCreatorScreenProps {
  user: User;
  onClose: () => void;
}

const StoryCreatorScreen: React.FC<StoryCreatorScreenProps> = ({ user, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
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
            await addDoc(collection(db, 'stories'), {
                userId: user.id,
                userName: user.name,
                userProfilePhoto: user.profilePhotos[0],
                mediaUrl: uploadedUrl,
                viewed: [],
                likedBy: [],
                timestamp: serverTimestamp(),
            });
            
            // Grant XP for posting a story
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, { xp: increment(XpAction.CREATE_POST) });
            showXpToast(XpAction.CREATE_POST);

            onClose();
        } catch (error) {
            console.error("Error creating story:", error);
            alert("Could not create story. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="absolute inset-0 bg-black z-50 flex flex-col justify-center animate-fade-in">
            <header className="absolute top-0 left-0 right-0 flex justify-between items-center p-4">
                <button onClick={onClose} className="text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </header>
            
            <main className="flex-1 flex items-center justify-center">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
                {!preview ? (
                     <button onClick={() => fileInputRef.current?.click()} className="w-48 h-64 border-2 border-dashed border-gray-500 rounded-lg flex items-center justify-center">
                        <p className="text-gray-400">Select Media</p>
                    </button>
                ) : (
                    <img src={preview} alt="story preview" className="max-w-full max-h-full object-contain" />
                )}
            </main>

            <footer className="p-4">
                <button onClick={handleShare} disabled={!file || isLoading} className="w-full py-3 bg-white text-black font-bold rounded-full disabled:opacity-50">
                     {isLoading ? 'Sharing...' : 'Share to Story'}
                </button>
            </footer>
        </div>
    );
};

export default StoryCreatorScreen;
