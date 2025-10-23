import React, { useState, useRef } from 'react';
import { User } from '../types';
import { uploadPhotos } from '../utils/photoUploader';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface CreateScreenProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

const PLACEHOLDER_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';

const CreateScreen: React.FC<CreateScreenProps> = ({ user, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'select' | 'post' | 'story'>('select');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };
  
  const openFileManager = (targetMode: 'post' | 'story') => {
      setMode(targetMode);
      fileInputRef.current?.click();
  }
  
  const resetState = () => {
    setMode('select');
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setCaption('');
    setIsLoading(false);
  }
  
  const handleCancel = () => {
      if (mode === 'select') {
          onClose();
      } else {
          resetState();
      }
  }

  const handleSharePost = async () => {
    if (!file || !db) return;
    setIsLoading(true);
    try {
        const [photoUrl] = await uploadPhotos([file]);
        
        if (!photoUrl) {
            throw new Error("File upload did not return a URL.");
        }

        await addDoc(collection(db, 'posts'), {
            userId: user.id,
            userName: user.name || 'FlameUp User',
            userProfilePhoto: user.profilePhotos?.[0] || PLACEHOLDER_AVATAR,
            mediaUrls: [photoUrl],
            caption: caption,
            likes: 0,
            comments: 0,
            timestamp: serverTimestamp(),
        });
        onSuccess();
    } catch (error) {
        console.error("Error creating post:", error);
        alert("Failed to create post. Please try again.");
        setIsLoading(false);
    }
  }

  const handleShareStory = async () => {
     if (!file || !db) return;
     setIsLoading(true);
     try {
        const [photoUrl] = await uploadPhotos([file]);

        if (!photoUrl) {
            throw new Error("File upload did not return a URL.");
        }

        await addDoc(collection(db, 'stories'), {
            userId: user.id,
            userName: user.name || 'FlameUp User',
            userProfilePhoto: user.profilePhotos?.[0] || PLACEHOLDER_AVATAR,
            mediaUrl: photoUrl,
            viewed: false,
            timestamp: serverTimestamp(),
        });
        onSuccess();
     } catch (error) {
         console.error("Error creating story:", error);
         alert("Failed to create story. Please try again.");
         setIsLoading(false);
     }
  }


  const renderContent = () => {
    if (mode === 'post' && preview) {
      return (
        <>
            <img src={preview} alt="Post preview" className="w-full aspect-square object-cover" />
            <div className="p-4">
                <textarea 
                    placeholder="Write a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={4}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange"
                />
            </div>
        </>
      );
    }
    if (mode === 'story' && preview) {
         return <img src={preview} alt="Story preview" className="w-full h-full object-contain" />;
    }
    
    return (
       <div className="flex flex-col justify-center items-center h-full p-8">
            <h1 className="text-3xl font-bold text-dark-gray mb-12">Create</h1>
            <div className="w-full space-y-4">
                <button onClick={() => openFileManager('post')} className="w-full text-left flex items-center p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    <span className="text-2xl mr-4">📝</span>
                    <div>
                        <span className="font-semibold text-lg">New Post</span>
                        <p className="text-sm text-gray-600">Share a photo to your feed</p>
                    </div>
                </button>
                <button onClick={() => openFileManager('story')} className="w-full text-left flex items-center p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                     <span className="text-2xl mr-4">🤳</span>
                    <div>
                        <span className="font-semibold text-lg">New Story</span>
                        <p className="text-sm text-gray-600">Share for 24 hours</p>
                    </div>
                </button>
            </div>
        </div>
    );
  };
  
  const getHeaderTitle = () => {
      if (mode === 'post') return 'Create Post';
      if (mode === 'story') return 'Create Story';
      return 'Create';
  }
  
  const getActionText = () => {
      if (isLoading) return 'Sharing...';
      if (mode === 'post') return 'Share';
      if (mode === 'story') return 'Share to Story';
      return null;
  }
  
  const handleAction = () => {
      if (mode === 'post') {
          handleSharePost();
      } else if (mode === 'story') {
          handleShareStory();
      }
  }

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col">
        <header className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
            <button onClick={handleCancel} className="text-lg text-gray-600 w-20 text-left">
                {mode === 'select' ? 'Close' : 'Back'}
            </button>
            <h1 className="text-xl font-bold text-dark-gray">{getHeaderTitle()}</h1>
            {getActionText() ? (
                <button 
                    onClick={handleAction} 
                    disabled={isLoading || (mode === 'post' && !file)} 
                    className="text-lg font-bold text-flame-orange disabled:opacity-50 w-20 text-right"
                >
                    {getActionText()}
                </button>
            ) : <div className="w-20"></div> /* spacer */}
        </header>
        <main className="flex-1 bg-gray-50 overflow-y-auto">
            {renderContent()}
        </main>
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*"
        />
    </div>
  );
};

export default CreateScreen;