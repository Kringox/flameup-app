
import React, { useEffect, useState, useRef } from 'react';
import { User, Call } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import MicIcon from './icons/MicIcon.tsx';
import XIcon from './icons/XIcon.tsx';
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
    const [incomingCall, setIncomingCall] = useState<Call | null>(null);
    const [activeCall, setActiveCall] = useState<Call | null>(null);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    // WebRTC Refs
    const pc = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const remoteStream = useRef<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // --- 1. SETUP & TEARDOWN ---

    const cleanup = () => {
        if (pc.current) {
            pc.current.close();
            pc.current = null;
        }
        if (localStream.current) {
            localStream.current.getTracks().forEach(track => track.stop());
            localStream.current = null;
        }
        remoteStream.current = null;
        setDuration(0);
    };

    const setupSources = async (isVideo: boolean) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: isVideo,
                audio: true,
            });
            localStream.current = stream;
            
            // Set local video element if active
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            return stream;
        } catch (error) {
            console.error("Error accessing media devices:", error);
            return null;
        }
    };

    // --- 2. LISTENERS ---

    // Listen for Incoming Calls (Ringing)
    useEffect(() => {
        if (!currentUser || !db) return;
        const callsRef = collection(db, 'calls');
        const q = query(callsRef, where('calleeId', '==', currentUser.id), where('status', '==', 'ringing'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const calls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Call));
            if (calls.length > 0 && !activeCall) {
                setIncomingCall(calls[0]);
                hapticFeedback('medium');
            } else if (calls.length === 0) {
                setIncomingCall(null);
            }
        });
        return () => unsubscribe();
    }, [currentUser?.id, activeCall]);

    // Listen for My Active/Outgoing Calls
    useEffect(() => {
        if (!currentUser || !db) return;
        if (!activeCall && !incomingCall) {
             const callsRef = collection(db, 'calls');
             const q = query(callsRef, where('callerId', '==', currentUser.id), where('status', 'in', ['ringing', 'connected']));
             
             const unsubscribe = onSnapshot(q, (snapshot) => {
                const calls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Call));
                if (calls.length > 0) {
                    // Check if we already have this call active locally to avoid re-renders or resets
                    if (activeCall?.id !== calls[0].id) {
                        setActiveCall(calls[0]);
                    }
                }
            });
            return () => unsubscribe();
        }
    }, [currentUser?.id, activeCall, incomingCall]);

    // Main Call Logic Listener (Signaling)
    useEffect(() => {
        const targetCall = activeCall || incomingCall;
        if (!targetCall || !db) return;

        const callDocRef = doc(db, 'calls', targetCall.id);
        const unsubscribe = onSnapshot(callDocRef, async (snapshot) => {
            if (!snapshot.exists()) {
                // Call ended remotely
                cleanup();
                setIncomingCall(null);
                setActiveCall(null);
                return;
            }

            const data = { id: snapshot.id, ...snapshot.data() } as Call;

            // Handle connection status changes
            if (data.status === 'ended' || data.status === 'declined') {
                cleanup();
                setIncomingCall(null);
                setActiveCall(null);
                if (data.callerId === currentUser?.id) {
                    // Clean up DB if I am the caller
                    setTimeout(() => deleteDoc(callDocRef).catch(console.error), 2000);
                }
                return;
            }

            if (data.status === 'connected' && !pc.current && data.callerId === currentUser?.id) {
                // Caller: Remote Answered
                // Note: The answer handling happens via SDP field check below
            }

            // --- WebRTC Signaling Exchange ---
            
            // 1. Caller handles Answer
            if (pc.current && !pc.current.currentRemoteDescription && data.answer && data.callerId === currentUser?.id) {
                const answer = new RTCSessionDescription(data.answer);
                await pc.current.setRemoteDescription(answer);
            }

            // 2. Callee handles Offer (Usually on Accept, but checking here)
            // (Handled in handleAccept)

            // Update local state if status changed
            if (activeCall && data.status !== activeCall.status) {
                setActiveCall(data);
            }
        });

        return () => unsubscribe();
    }, [activeCall?.id, incomingCall?.id, currentUser?.id]);


    // --- 3. ACTIONS ---

    const createPeerConnection = () => {
        const newPc = new RTCPeerConnection(servers);
        
        // Push local stream tracks
        if (localStream.current) {
            localStream.current.getTracks().forEach(track => {
                newPc.addTrack(track, localStream.current!);
            });
        }

        // Pull remote stream tracks
        newPc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                remoteStream.current = event.streams[0];
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            }
        };

        return newPc;
    };

    const subscribeToCandidates = (callId: string) => {
        if (!db || !pc.current) return;
        const candidatesCollection = collection(db, 'calls', callId, 'candidates');
        
        // Listen for candidates added by the OTHER peer
        onSnapshot(candidatesCollection, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    // Just basic check: if we created it, ignore? 
                    // Usually we distinguish by adding a 'senderId' field to candidate, skipping for now for simplicity
                    // Assuming we add all, PC handles duplicates
                    const candidate = new RTCIceCandidate(data);
                    pc.current?.addIceCandidate(candidate).catch(e => console.error("Error adding ice candidate", e));
                }
            });
        });
    }

    const startCall = async (callId: string, isVideo: boolean) => {
        const stream = await setupSources(isVideo);
        if (!stream) return;

        pc.current = createPeerConnection();
        
        // ICE Candidates to DB
        pc.current.onicecandidate = (event) => {
            if (event.candidate) {
                const candidatesCollection = collection(db, 'calls', callId, 'candidates');
                addDoc(candidatesCollection, event.candidate.toJSON());
            }
        };

        // Create Offer
        const offerDescription = await pc.current.createOffer();
        await pc.current.setLocalDescription(offerDescription);

        const callOffer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
        };

        await updateDoc(doc(db, 'calls', callId), { offer: callOffer });
        
        // Listen for remote candidates
        subscribeToCandidates(callId);
    };

    // Effect: If I am the caller and just created the call document, I need to start the WebRTC process
    useEffect(() => {
        if (activeCall && activeCall.callerId === currentUser?.id && activeCall.status === 'ringing' && !pc.current) {
            // Initiate WebRTC
            startCall(activeCall.id, activeCall.type === 'video');
        }
    }, [activeCall, currentUser?.id]);


    const handleAccept = async () => {
        if (!incomingCall || !db) return;
        
        const stream = await setupSources(incomingCall.type === 'video');
        if (!stream) return;

        pc.current = createPeerConnection();

        // ICE Candidates
        pc.current.onicecandidate = (event) => {
            if (event.candidate) {
                const candidatesCollection = collection(db, 'calls', incomingCall.id, 'candidates');
                addDoc(candidatesCollection, event.candidate.toJSON());
            }
        };
        
        // Subscribe to remote candidates
        subscribeToCandidates(incomingCall.id);

        const callRef = doc(db, 'calls', incomingCall.id);
        const callSnapshot = await import('firebase/firestore').then(mod => mod.getDoc(callRef));
        const callData = callSnapshot.data() as Call;

        if (!callData.offer) {
            console.error("No offer found in call data");
            return;
        }

        const offerDescription = callData.offer;
        await pc.current.setRemoteDescription(new RTCSessionDescription(offerDescription));

        const answerDescription = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answerDescription);

        const callAnswer = {
            type: answerDescription.type,
            sdp: answerDescription.sdp,
        };

        await updateDoc(callRef, { 
            answer: callAnswer,
            status: 'connected'
        });

        setActiveCall({...incomingCall, status: 'connected'});
        setIncomingCall(null);
    };

    const handleDecline = async () => {
        if (!incomingCall || !db) return;
        cleanup();
        try {
            await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'declined' });
            setIncomingCall(null);
        } catch (e) { console.error(e); }
    };

    const handleEndCall = async () => {
        if (!activeCall || !db) return;
        cleanup();
        try {
            await updateDoc(doc(db, 'calls', activeCall.id), { status: 'ended' });
            setActiveCall(null);
        } catch (e) { console.error(e); }
    };

    const toggleMute = () => {
        if (localStream.current) {
            localStream.current.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream.current) {
            localStream.current.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoEnabled(!isVideoEnabled);
        }
    };

    // Duration Timer
    useEffect(() => {
        let interval: number;
        if (activeCall?.status === 'connected') {
            interval = window.setInterval(() => {
                setDuration(d => d + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeCall?.status]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (incomingCall) {
        return (
            <div className="fixed inset-0 z-[200] bg-gray-900/95 backdrop-blur-md flex flex-col items-center pt-20 pb-10 px-6 animate-fade-in">
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 rounded-full bg-flame-orange/20 animate-ping" style={{ animationDuration: '2s' }}></div>
                        <div className="absolute inset-0 rounded-full bg-flame-orange/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
                        <img src={incomingCall.callerPhoto} alt={incomingCall.callerName} className="w-32 h-32 rounded-full object-cover border-4 border-white/10 shadow-2xl relative z-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">{incomingCall.callerName}</h2>
                    <p className="text-gray-300 font-medium tracking-wide flex items-center gap-2">
                        {incomingCall.type === 'video' ? '📹 Video Call' : '📞 Audio Call'}
                    </p>
                </div>
                <div className="w-full flex justify-around items-center max-w-sm mb-12">
                    <button onClick={handleDecline} className="flex flex-col items-center gap-2">
                        <div className="p-5 bg-red-500 rounded-full text-white shadow-xl transform active:scale-90 transition-transform">
                            <XIcon className="w-8 h-8" />
                        </div>
                        <span className="text-white text-sm font-semibold">Decline</span>
                    </button>
                    <button onClick={handleAccept} className="flex flex-col items-center gap-2">
                        <div className="p-5 bg-green-500 rounded-full text-white shadow-xl transform active:scale-90 transition-transform animate-bounce">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.26-.26.35-.63.24-1.01a11.36 11.36 0 01-.56-3.53C8.96 3.55 8.5 3 7.87 3H4.24C3.56 3 3 3.56 3 4.24c0 9.39 7.61 17 17 17 .68 0 1.24-.56 1.24-1.24v-3.63c0-.63-.55-1.09-1.23-1.09z"/></svg>
                        </div>
                        <span className="text-white text-sm font-semibold">Accept</span>
                    </button>
                </div>
            </div>
        );
    }

    if (activeCall) {
        const isCaller = activeCall.callerId === currentUser?.id;
        const partnerName = isCaller ? (activeCall.status === 'connected' ? 'Connected' : 'Calling...') : activeCall.callerName; 
        const isVideoCall = activeCall.type === 'video';

        return (
            <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center animate-fade-in">
                {/* Fullscreen Video Area */}
                <div className="flex-1 w-full relative overflow-hidden bg-gray-900">
                    {/* Remote Video */}
                    <video 
                        ref={remoteVideoRef} 
                        autoPlay 
                        playsInline 
                        className={`w-full h-full object-cover ${activeCall.status !== 'connected' ? 'hidden' : ''}`} 
                    />
                    
                    {/* Placeholder if no video or not connected */}
                    {(activeCall.status !== 'connected' || !isVideoCall) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-20">
                            <img 
                                src={isCaller ? activeCall.callerPhoto : activeCall.callerPhoto} // Simplification: Caller sees callee info logic needs full user fetch, using available data
                                alt="Partner" 
                                className="w-32 h-32 rounded-full object-cover border-4 border-white/20 shadow-2xl mb-6" 
                            />
                            <h2 className="text-3xl font-bold text-white mb-2">{partnerName}</h2>
                            <p className="text-gray-300 font-medium">
                                {activeCall.status === 'connected' ? formatTime(duration) : (isCaller ? 'Waiting for answer...' : 'Connecting...')}
                            </p>
                        </div>
                    )}

                    {/* Local Video (PiP) */}
                    {isVideoCall && (
                        <div className="absolute top-4 right-4 w-28 h-40 bg-black rounded-xl overflow-hidden shadow-lg border border-white/20">
                            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="w-full bg-black/60 backdrop-blur-md p-6 flex justify-around items-center">
                    <button onClick={toggleVideo} className={`p-4 rounded-full transition-colors ${!isVideoEnabled ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
                        {isVideoEnabled ? (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        ) : (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        )}
                    </button>
                    
                    <button onClick={handleEndCall} className="p-5 bg-red-600 rounded-full text-white shadow-lg transform active:scale-95 transition-transform mx-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.36 7.46 6 12 6s8.66 2.36 11.71 5.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                    </button>

                    <button onClick={toggleMute} className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
                        {isMuted ? (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" strokeDasharray="2,2"/><line x1="17" y1="7" x2="7" y2="17" /></svg>
                        ) : (
                            <MicIcon className="w-6 h-6" />
                        )}
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default CallOverlay;
