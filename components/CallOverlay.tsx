
import React, { useEffect, useState, useRef } from 'react';
import { User, Call } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import MicIcon from './icons/MicIcon.tsx';
import XIcon from './icons/XIcon.tsx';
import CameraIcon from './icons/CameraIcon.tsx';
import { hapticFeedback } from '../utils/haptics.ts';

interface CallOverlayProps {
    currentUser: User | null;
}

const servers = {
    iceServers: [
        {
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ],
        },
    ],
    iceCandidatePoolSize: 10,
};

const CallOverlay: React.FC<CallOverlayProps> = ({ currentUser }) => {
    const [call, setCall] = useState<Call | null>(null);
    const [callStatusDisplay, setCallStatusDisplay] = useState('');
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [localMediaError, setLocalMediaError] = useState<string | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isLocalMediaReady, setIsLocalMediaReady] = useState(false);

    const pc = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const remoteCandidatesQueue = useRef<RTCIceCandidate[]>([]);
    
    // --- LISTEN FOR ACTIVE CALLS ---
    useEffect(() => {
        if (!currentUser || !db) return;

        const callsRef = collection(db, 'calls');
        const q = query(callsRef, where('userIds', 'array-contains', currentUser.id));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allCalls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Call));
            const getTime = (c: Call) => c.timestamp?.seconds || (Date.now() / 1000);

            // Find newest active call
            const activeCall = allCalls
                .filter(c => c.status === 'ringing' || c.status === 'connected')
                .sort((a, b) => getTime(b) - getTime(a))[0];

            if (activeCall) {
                setCall(prev => {
                    if (!prev || prev.id !== activeCall.id || prev.status !== activeCall.status) {
                        if (activeCall.calleeId === currentUser.id && activeCall.status === 'ringing') {
                            hapticFeedback('medium');
                        }
                        return activeCall;
                    }
                    return prev;
                });
            } else {
                // Handle call end
                setCall(prev => {
                    if (prev) {
                        cleanupLocalMedia();
                        return null;
                    }
                    return prev;
                });
            }
        });

        return () => unsubscribe();
    }, [currentUser?.id]);

    // --- SETUP CALL (Signaling) ---
    useEffect(() => {
        if (!call || !db || !currentUser) return;

        const isCaller = call.callerId === currentUser.id;
        
        // 1. Initialize PeerConnection if not exists
        if (!pc.current) {
            console.log("Initializing PeerConnection...");
            const newPc = new RTCPeerConnection(servers);
            
            newPc.onicecandidate = (event) => {
                if (event.candidate) {
                    const collectionName = isCaller ? 'offerCandidates' : 'answerCandidates';
                    addDoc(collection(db, 'calls', call.id, collectionName), event.candidate.toJSON());
                }
            };

            newPc.ontrack = (event) => {
                console.log("Received remote track:", event.streams[0]);
                event.streams[0].getTracks().forEach(track => {
                    track.enabled = true;
                });
                setRemoteStream(event.streams[0]);
            };
            
            newPc.onconnectionstatechange = () => {
                console.log("Connection State:", newPc.connectionState);
                if (newPc.connectionState === 'connected') {
                    setCallStatusDisplay('Connected');
                } else if (newPc.connectionState === 'disconnected' || newPc.connectionState === 'failed') {
                    setCallStatusDisplay('Connection lost');
                }
            };

            pc.current = newPc;

            // Start Local Stream
            setupSources(call.type === 'video').then(({ stream, error }) => {
                if (error) setLocalMediaError(error);
                if (stream) {
                    stream.getTracks().forEach(track => {
                        if (pc.current) {
                            pc.current.addTrack(track, stream);
                        }
                    });
                }
                
                // IMPORTANT: Signal that media is ready before proceeding to Offer/Answer
                setIsLocalMediaReady(true);
            });
        }

        // 2. Handle Signaling Logic - Only if local media is ready (tracks added)
        const handleSignaling = async () => {
            if (!pc.current || !isLocalMediaReady) return;

            // Caller Logic: Create Offer if not done yet
            if (isCaller && call.status === 'ringing' && !call.offer) {
                 createOffer();
            }

            // Caller Logic: Process Answer when available
            if (isCaller && call.answer && !pc.current.currentRemoteDescription) {
                const answer = new RTCSessionDescription(call.answer);
                await pc.current.setRemoteDescription(answer);
                console.log("Caller set remote description (answer)");
                processQueuedCandidates();
            }

            // Callee Logic: Process Offer when accepting
            if (!isCaller && call.offer && !pc.current.currentRemoteDescription && call.status === 'connected') {
                const offer = new RTCSessionDescription(call.offer);
                await pc.current.setRemoteDescription(offer);
                console.log("Callee set remote description (offer)");
                processQueuedCandidates();
                
                // Create Answer ONLY after local tracks are ready (ensured by isLocalMediaReady dependency)
                const answer = await pc.current.createAnswer();
                await pc.current.setLocalDescription(answer);
                
                await updateDoc(doc(db, 'calls', call.id), {
                    answer: { sdp: answer.sdp, type: answer.type }
                });
            }
        };

        handleSignaling();

        // 3. Listen for Remote Candidates
        const remoteCandidateCollection = isCaller ? 'answerCandidates' : 'offerCandidates';
        const qCandidates = collection(db, 'calls', call.id, remoteCandidateCollection);
        
        const unsubscribeCandidates = onSnapshot(qCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const candidate = new RTCIceCandidate(data);
                    
                    if (pc.current && pc.current.remoteDescription) {
                        pc.current.addIceCandidate(candidate).catch(e => console.error("Error adding candidate", e));
                    } else {
                        // Queue candidate if remote description not set yet
                        remoteCandidatesQueue.current.push(candidate);
                    }
                }
            });
        });

        return () => {
            unsubscribeCandidates();
        };

    }, [call?.id, call?.status, call?.offer, call?.answer, isLocalMediaReady]); // Added isLocalMediaReady dependency

    const processQueuedCandidates = () => {
        if (!pc.current) return;
        remoteCandidatesQueue.current.forEach(candidate => {
            pc.current?.addIceCandidate(candidate).catch(e => console.error("Error adding queued candidate", e));
        });
        remoteCandidatesQueue.current = [];
    };

    const createOffer = async () => {
        if (!pc.current || !db || !call) return;
        console.log("Creating offer...");
        const offer = await pc.current.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        await pc.current.setLocalDescription(offer);
        await updateDoc(doc(db, 'calls', call.id), {
            offer: { sdp: offer.sdp, type: offer.type }
        });
    };

    const setupSources = async (isVideo: boolean): Promise<{ stream: MediaStream | null, error: string | null }> => {
        let stream: MediaStream | null = null;
        let errorMsg: string | null = null;

        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
        } catch (err) {
            console.warn("Full media access failed:", err);
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                if (isVideo) errorMsg = "No Camera. Audio only.";
            } catch (err2) {
                console.warn("Audio access failed:", err2);
                stream = new MediaStream(); // Empty stream
                errorMsg = "No Mic/Cam. View only.";
            }
        }

        localStream.current = stream;
        if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.muted = true;
        }
        return { stream, error: errorMsg };
    };

    // Attach remote stream to video element when state changes
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.muted = false; // Ensure not muted
            remoteVideoRef.current.play().catch(e => console.error("Autoplay failed:", e));
        }
    }, [remoteStream]);

    const handleAccept = async () => {
        if (!db || !call) return;
        setCallStatusDisplay('Connecting...');
        await updateDoc(doc(db, 'calls', call.id), { status: 'connected' });
    };

    const handleDeclineOrCancel = async () => {
        if (!call || !db || !currentUser) return;
        const newStatus = call.callerId === currentUser.id ? 'cancelled' : 'declined';
        await updateDoc(doc(db, 'calls', call.id), { status: newStatus });
        cleanupLocalMedia();
        setCall(null);
    };

    const cleanupLocalMedia = () => {
        if (localStream.current) {
            localStream.current.getTracks().forEach(track => track.stop());
            localStream.current = null;
        }
        if (pc.current) {
            pc.current.close();
            pc.current = null;
        }
        setRemoteStream(null);
        setDuration(0);
        setLocalMediaError(null);
        setCallStatusDisplay('');
        setIsLocalMediaReady(false); // Reset readiness
        remoteCandidatesQueue.current = [];
    };

    const toggleMute = () => {
        if (localStream.current) {
            localStream.current.getAudioTracks().forEach(t => t.enabled = !t.enabled);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream.current) {
            localStream.current.getVideoTracks().forEach(t => t.enabled = !t.enabled);
            setIsVideoEnabled(!isVideoEnabled);
        }
    };

    useEffect(() => {
        let interval: number | undefined;
        if (call?.status === 'connected') {
            interval = window.setInterval(() => setDuration(d => d + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [call?.status]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (!call || !currentUser) return null;

    // --- RENDER ---

    // Incoming Call (Ringing)
    if (call.calleeId === currentUser.id && call.status === 'ringing') {
        return (
            <div className="fixed inset-0 z-[200] bg-gray-900/95 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                <div className="flex flex-col items-center justify-between h-[80vh] w-full max-w-md">
                    <div className="flex flex-col items-center mt-20">
                        <div className="relative mb-8">
                            <div className="absolute inset-0 rounded-full bg-flame-orange/20 animate-ping"></div>
                            <img src={call.callerPhoto} className="w-32 h-32 rounded-full object-cover border-4 border-white/10 shadow-2xl relative z-10" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">{call.callerName}</h2>
                        <p className="text-gray-300 font-medium">Incoming {call.type === 'video' ? 'Video' : 'Audio'} Call</p>
                    </div>
                    <div className="flex w-full justify-around px-8">
                        <button onClick={handleDeclineOrCancel} className="flex flex-col items-center gap-2">
                            <div className="p-5 bg-red-500 rounded-full text-white shadow-xl active:scale-95 transition-transform"><XIcon className="w-8 h-8" /></div>
                            <span className="text-white font-semibold">Decline</span>
                        </button>
                        <button onClick={handleAccept} className="flex flex-col items-center gap-2">
                            <div className="p-5 bg-green-500 rounded-full text-white shadow-xl active:scale-95 transition-transform animate-bounce">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.26-.26.35-.63.24-1.01a11.36 11.36 0 01-.56-3.53C8.96 3.55 8.5 3 7.87 3H4.24C3.56 3 3 3.56 3 4.24c0 9.39 7.61 17 17 17 .68 0 1.24-.56 1.24-1.24v-3.63c0-.63-.55-1.09-1.23-1.09z"/></svg>
                            </div>
                            <span className="text-white font-semibold">Accept</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Active Call
    const isVideoCall = call.type === 'video';
    const partnerName = call.callerId === currentUser.id ? call.calleeName : call.callerName;
    const partnerPhoto = call.callerId === currentUser.id ? call.calleePhoto : call.callerPhoto;

    return (
        <div className="fixed inset-0 z-[200] bg-black flex justify-center animate-fade-in">
            <div className="w-full max-w-md h-full relative bg-gray-900 flex flex-col">
                <div className="flex-1 w-full relative overflow-hidden bg-black">
                    
                    {localMediaError && (
                        <div className="absolute top-4 left-4 right-4 z-50 bg-red-500/80 backdrop-blur-md text-white text-xs px-3 py-2 rounded-lg text-center">
                            ⚠️ {localMediaError}
                        </div>
                    )}

                    {/* Remote Video - Always render but control visibility */}
                    <video 
                        ref={remoteVideoRef} 
                        autoPlay 
                        playsInline 
                        className={`w-full h-full object-cover transition-opacity duration-500 ${remoteStream ? 'opacity-100' : 'opacity-0'}`} 
                    />
                    
                    {/* Placeholder / Connecting State */}
                    {!remoteStream && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center pt-20 bg-gray-900 z-10">
                             <img src={partnerPhoto} className="w-32 h-32 rounded-full object-cover border-4 border-white/20 shadow-2xl mb-6" />
                             <h2 className="text-3xl font-bold text-white mb-2">{partnerName}</h2>
                             <p className="text-gray-300 font-medium animate-pulse">
                                 {call.status === 'connected' ? (callStatusDisplay || formatTime(duration)) : 'Calling...'}
                             </p>
                         </div>
                    )}

                    {/* Local Video PIP */}
                    {isVideoCall && !localMediaError && (
                        <div className="absolute top-4 right-4 w-28 h-40 bg-black rounded-xl overflow-hidden shadow-lg border border-white/20 z-20">
                            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="w-full bg-black/60 backdrop-blur-md p-6 flex justify-around items-center z-20 pb-10">
                    {isVideoCall && (
                        <button onClick={toggleVideo} className={`p-4 rounded-full transition-colors ${!isVideoEnabled ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
                            <CameraIcon className="w-6 h-6"/>
                        </button>
                    )}
                    <button onClick={handleDeclineOrCancel} className="p-5 bg-red-600 rounded-full text-white shadow-lg active:scale-95 transition-transform mx-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.36 7.46 6 12 6s8.66 2.36 11.71 5.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                    </button>
                    <button onClick={toggleMute} className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
                        <MicIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CallOverlay;
