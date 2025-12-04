
import React, { useState } from 'react';
import { Post } from '../types.ts';
import XIcon from './icons/XIcon.tsx';

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

    return (
        <div className="fixed inset-0 z-[150] bg-black/70 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-zinc-900 rounded-2xl w-full max-w-sm p-6 relative border border-zinc-700" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XIcon className="w-6 h-6"/></button>
                <h2 className="text-xl font-bold text-white mb-6 text-center">Share to...</h2>
                
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {['WhatsApp', 'Instagram', 'Twitter', 'Message'].map(platform => (
                        <div key={platform} className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                <span className="text-xl">📱</span>
                            </div>
                            <span className="text-xs text-gray-400">{platform}</span>
                        </div>
                    ))}
                </div>

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
    );
};

export default ShareModal;
