
import React, { useState, useEffect } from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';
// FIX: Added file extensions to screen imports
import CreatePostScreen from './CreatePostScreen.tsx';
import StoryCreatorScreen from './StoryCreatorScreen.tsx';

interface CreateScreenProps {
  onClose: () => void;
  user: User;
  initialMode?: 'select' | 'post' | 'story';
}

const CreateScreen: React.FC<CreateScreenProps> = ({ onClose, user, initialMode = 'select' }) => {
    const [mode, setMode] = useState<'select' | 'post' | 'story'>(initialMode);

    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    if (mode === 'post') {
        return <CreatePostScreen user={user} onClose={onClose} />;
    }
    
    if (mode === 'story') {
        return <StoryCreatorScreen user={user} onClose={onClose} />;
    }

    return (
        <div className="absolute inset-0 bg-black/80 z-[120] flex justify-center items-end" onClick={onClose}>
            <div 
                className="bg-zinc-900 rounded-t-3xl w-full p-6 pb-10 border-t border-zinc-800 shadow-2xl animate-slide-in-bottom"
                onClick={(e) => e.stopPropagation()}
            >
                <style>{`
                    @keyframes slide-in-bottom { from { transform: translateY(100%); } to { transform: translateY(0); } }
                    .animate-slide-in-bottom { animation: slide-in-bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                `}</style>
                
                <h2 className="text-xl font-bold text-center mb-8 text-white">Create New</h2>
                <div className="space-y-4">
                    <button onClick={() => setMode('post')} className="w-full p-5 bg-gradient-to-r from-zinc-800 to-zinc-700 hover:from-zinc-700 hover:to-zinc-600 border border-zinc-700 rounded-2xl text-lg font-bold text-white shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
                        <span className="text-2xl">📸</span> New Post
                    </button>
                    <button onClick={() => setMode('story')} className="w-full p-5 bg-gradient-to-r from-flame-orange/20 to-flame-red/20 border border-flame-orange/30 hover:bg-flame-orange/30 rounded-2xl text-lg font-bold text-white shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
                        <span className="text-2xl">⭕️</span> New Story
                    </button>
                </div>
                <button onClick={onClose} className="w-full mt-8 py-4 bg-black text-gray-400 font-bold rounded-xl border border-zinc-800 hover:bg-zinc-900 hover:text-white transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default CreateScreen;
