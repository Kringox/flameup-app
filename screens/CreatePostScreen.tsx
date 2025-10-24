import React, { useState, useRef } from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
// FIX: Added file extension to photoUploader import
import { uploadPhotos } from '../utils/photoUploader.ts';

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
            onClose();
        } catch (error) {
            console.error("Error creating post:", error);
            alert("Could not create post. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="absolute inset-0 bg-white z-50 flex flex-col">
            <header className="flex justify-between items-center p-4 border-b">
                <button onClick={onClose} className="text-lg">Cancel</button>
                <h1 className="text-xl font-bold">New Post</h1>
                <button onClick={handleShare} disabled={!file || isLoading} className="text-lg font-bold text-flame-orange disabled:opacity-50">
                    {isLoading ? 'Sharing...' : 'Share'}
                </button>
            </header>

            <main className="flex-1 p-4">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                {!preview ? (
                    <button onClick={() => fileInputRef.current?.click()} className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                        <p>Select a photo</p>
                    </button>
                ) : (
                    <img src={preview} alt="preview" className="w-full h-auto max-h-96 object-contain rounded-lg" />
                )}
                
                <textarea 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption..."
                    className="w-full mt-4 p-2 border-t border-b focus:outline-none"
                    rows={3}
                />
            </main>
        </div>
    );
};

export default CreatePostScreen;