
import React, { useState } from 'react';
import { Post } from '../types.ts';
import XIcon from './icons/XIcon.tsx';
import ShareIcon from './icons/ShareIcon.tsx';

interface ShareModalProps {
    onClose: () => void;
    post?: Post; 
}

const ShareModal: React.FC<ShareModalProps> = ({ onClose, post }) => {
    const [copied, setCopied] = useState(false);
    const link = `https://flameup.app/post/${post?.id || 'profile'}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleNativeShare = async () => {
        const shareData = {
            title: `FlameUp Post by ${post?.user.name || 'a user'}`,
            text: post?.caption || 'Check out this on FlameUp!',
            url: link,
        };
        if (navigator.share && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            // As a fallback, copy the link if native share is not available
            handleCopy();
            alert("Share not supported, link copied to clipboard.");
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/70 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-zinc-900 rounded-2xl w-full max-w-sm p-6 relative border border-zinc-700" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XIcon className="w-6 h-6"/></button>
                <h2 className="text-xl font-bold text-white mb-6 text-center">Share</h2>
                
                <div className="space-y-3">
                    <button onClick={handleNativeShare} className="w-full flex items-center gap-3 p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700">
                        <ShareIcon className="w-5 h-5 text-gray-300" />
                        <span className="font-semibold text-white">Share Now...</span>
                    </button>
                    
                    <div className="bg-black rounded-xl p-3 flex items-center justify-between border border-zinc-800">
                        <p className="text-sm text-gray-400 truncate flex-1 mr-2">{link}</p>
                        <button 
                            onClick={handleCopy}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-white text-black'}`}
                        >
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ShareModal;
