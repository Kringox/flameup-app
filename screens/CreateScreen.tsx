import React, { useState } from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';
// FIX: Added file extensions to screen imports
import CreatePostScreen from './CreatePostScreen.tsx';
import StoryCreatorScreen from './StoryCreatorScreen.tsx';

interface CreateScreenProps {
  onClose: () => void;
  user: User;
}

const CreateScreen: React.FC<CreateScreenProps> = ({ onClose, user }) => {
    const [mode, setMode] = useState<'select' | 'post' | 'story'>('select');

    if (mode === 'post') {
        return <CreatePostScreen user={user} onClose={onClose} />;
    }
    
    if (mode === 'story') {
        return <StoryCreatorScreen user={user} onClose={onClose} />;
    }

    return (
        <div className="absolute inset-0 bg-black/70 z-50 flex justify-center items-end" onClick={onClose}>
            <div 
                className="bg-white rounded-t-2xl w-full p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-center mb-6">Create</h2>
                <div className="space-y-4">
                    <button onClick={() => setMode('post')} className="w-full p-4 bg-gray-100 rounded-lg text-lg font-semibold">
                        New Post
                    </button>
                    <button onClick={() => setMode('story')} className="w-full p-4 bg-gray-100 rounded-lg text-lg font-semibold">
                        New Story
                    </button>
                </div>
                <button onClick={onClose} className="w-full mt-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-lg">
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default CreateScreen;
