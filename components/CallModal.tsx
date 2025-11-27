
import React, { useEffect, useState } from 'react';
import XIcon from './icons/XIcon.tsx';
import MicIcon from './icons/MicIcon.tsx';
import { hapticFeedback } from '../utils/haptics.ts';

interface CallModalProps {
    partnerName: string;
    partnerPhoto: string;
    isVideo: boolean;
    onEndCall: () => void;
}

const CallModal: React.FC<CallModalProps> = ({ partnerName, partnerPhoto, isVideo, onEndCall }) => {
    const [status, setStatus] = useState('Calling...');
    const [duration, setDuration] = useState(0);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Simulate connection sequence
        hapticFeedback('medium');
        const connectTimer = setTimeout(() => {
            setStatus('Connecting...');
        }, 2000);

        const activeTimer = setTimeout(() => {
            setStatus('Connected');
            setIsConnected(true);
            hapticFeedback('success');
        }, 4000);

        return () => {
            clearTimeout(connectTimer);
            clearTimeout(activeTimer);
        };
    }, []);

    useEffect(() => {
        let interval: number;
        if (isConnected) {
            interval = window.setInterval(() => {
                setDuration(d => d + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isConnected]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="fixed inset-0 z-[200] bg-gray-900 flex flex-col items-center pt-20 pb-10 px-6 animate-fade-in">
            <div className="flex-1 flex flex-col items-center">
                <div className="relative mb-8">
                    {/* Pulsing rings for calling state */}
                    {!isConnected && (
                        <>
                            <div className="absolute inset-0 rounded-full bg-flame-orange/20 animate-ping" style={{ animationDuration: '2s' }}></div>
                            <div className="absolute inset-0 rounded-full bg-flame-orange/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
                        </>
                    )}
                    <img 
                        src={partnerPhoto} 
                        alt={partnerName} 
                        className="w-32 h-32 rounded-full object-cover border-4 border-white/10 shadow-2xl relative z-10" 
                    />
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-2">{partnerName}</h2>
                <p className="text-gray-400 font-medium tracking-wide">
                    {isConnected ? formatTime(duration) : status}
                </p>
                <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-bold">
                    {isVideo ? 'FlameUp Video' : 'FlameUp Audio'}
                </p>
            </div>

            {/* Controls */}
            <div className="w-full flex justify-around items-center max-w-sm">
                <button className="p-4 bg-white/10 rounded-full text-white backdrop-blur-md">
                    <MicIcon className="w-6 h-6" />
                </button>
                
                <button 
                    onClick={onEndCall} 
                    className="p-6 bg-red-500 rounded-full text-white shadow-xl transform active:scale-90 transition-transform"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                        <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.36 7.46 6 12 6s8.66 2.36 11.71 5.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                    </svg>
                </button>

                <button className="p-4 bg-white/10 rounded-full text-white backdrop-blur-md">
                     <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default CallModal;
