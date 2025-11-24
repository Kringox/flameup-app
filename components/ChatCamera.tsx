
import React, { useRef, useState, useEffect } from 'react';
import XIcon from './icons/XIcon.tsx';

interface ChatCameraProps {
    onCapture: (file: File, type: 'image' | 'video') => void;
    onClose: () => void;
}

const ChatCamera: React.FC<ChatCameraProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [progress, setProgress] = useState(0);
    const progressInterval = useRef<number | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [permissionError, setPermissionError] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    useEffect(() => {
        let currentStream: MediaStream | null = null;

        const startCamera = async () => {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
            try {
                const s = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: facingMode }, 
                    audio: true 
                });
                currentStream = s;
                setStream(s);
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setPermissionError(true);
            }
        };
        startCamera();

        return () => {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [facingMode]);

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const takePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // If user facing, we might want to mirror, but standard behavior usually captures raw.
            // Let's just draw.
            ctx.drawImage(videoRef.current, 0, 0);
        }

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
                onCapture(file, 'image');
                onClose();
            }
        }, 'image/jpeg');
    };

    const startRecording = () => {
        if (!stream) return;
        setIsRecording(true);
        chunksRef.current = [];
        // Prioritize mp4/webm
        const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
        
        try {
            const recorder = new MediaRecorder(stream, { mimeType });
            
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                const file = new File([blob], `video_${Date.now()}.${mimeType === 'video/mp4' ? 'mp4' : 'webm'}`, { type: mimeType });
                onCapture(file, 'video');
                onClose();
            };

            recorder.start();
            mediaRecorderRef.current = recorder;

            // Progress bar logic
            let p = 0;
            progressInterval.current = window.setInterval(() => {
                p += 1;
                setProgress(p);
                if (p >= 100) stopRecording();
            }, 100); // Max 10 seconds

        } catch (e) {
            console.error("Recording error", e);
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (progressInterval.current) {
            clearInterval(progressInterval.current);
            progressInterval.current = null;
        }
        setProgress(0);
    };

    // Handler for the main button interaction
    const handleInteractionStart = (e: React.TouchEvent | React.MouseEvent) => {
        // e.preventDefault(); // removed to allow click events if needed, but safer to keep manual control
        startRecording();
    };

    const handleInteractionEnd = (e: React.TouchEvent | React.MouseEvent) => {
        // e.preventDefault();
        // If recording time was very short, treat as tap (photo)
        if (progress < 2) { 
            stopRecording(); // Stop the recorder but discard if we handle as photo? 
            // Actually, better to just check timing.
            // If we are here and progress is minimal, it was a tap.
            takePhoto();
        } else {
            stopRecording();
        }
    };

    if (permissionError) {
        return (
            <div className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center text-white p-4 text-center">
                <p>Camera access denied. Please enable permissions in your browser settings.</p>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-700 rounded-lg">Close</button>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col">
            <video ref={videoRef} autoPlay playsInline muted className={`flex-1 object-cover h-full w-full ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
            
            <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-black/40 rounded-full text-white z-10">
                <XIcon className="w-8 h-8" />
            </button>
            
            <button onClick={toggleCamera} className="absolute top-4 right-4 p-2 bg-black/40 rounded-full text-white z-10">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </button>

            <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center z-10">
                <button
                    className={`relative w-20 h-20 rounded-full border-4 ${isRecording ? 'border-red-500 bg-red-500/50' : 'border-white bg-white/20'} transition-all duration-200 transform ${isRecording ? 'scale-110' : ''}`}
                    onTouchStart={handleInteractionStart}
                    onTouchEnd={handleInteractionEnd}
                    onMouseDown={handleInteractionStart}
                    onMouseUp={handleInteractionEnd}
                    onMouseLeave={stopRecording}
                >
                    {isRecording && (
                         <svg className="absolute top-0 left-0 w-full h-full -rotate-90 pointer-events-none">
                            <circle
                                cx="50%" cy="50%" r="45%"
                                stroke="red" strokeWidth="4" fill="none"
                                strokeDasharray="251" 
                                strokeDashoffset={251 - (251 * progress) / 100}
                                className="transition-all duration-100 ease-linear"
                            />
                        </svg>
                    )}
                </button>
            </div>
            <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm shadow-black drop-shadow-md z-10">
                Tap for photo, hold for video
            </p>
        </div>
    );
};

export default ChatCamera;
