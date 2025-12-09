
import React, { useEffect, useState, useRef } from 'react';
import { User, Call } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDoc } from 'firebase/firestore';
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
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    const pc = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // --- Listen for any call involving the current user ---
    useEffect(() => {
        if (!currentUser || !db) return;

        const callsRef = collection(db, 'calls');
        // REMOVED 'status' filter to avoid "Index Required" error from Firestore.
        // We filter status in the snapshot callback below.
        const q = query(callsRef, where('userIds', 'array-contains', currentUser.id));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const calls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), userIds: doc.data().userIds || [doc.data().callerId, doc.data().calleeId] } as unknown as Call));
            
            // Filter for active calls client-side
            const activeOrRingingCall = calls.find(c => ['ringing', 'connected'].includes(c.status)) || null;

            if (call && activeOrRingingCall && call.id !== activeOrRingingCall.id && call.status === 'connected') {
                return;
            }
            
            if (activeOrRingingCall) {
                if (!call || call.id !== activeOrRingingCall.id) { // Only trigger haptics for a new incoming call
                     setCall(activeOrRingingCall);
                     if (activeOrRingingCall.calleeId === currentUser.id && activeOrRingingCall.status === 'ringing') {
                         hapticFeedback('medium');
                     }
                } else {
                    // Update existing call object state (e.g. status change)
                    setCall(activeOrRingingCall);
                }
            } else {
                if (call) handleEndCall(true); // Clean up if call disappears
            }
        });

        return () => unsubscribe();
    }, [currentUser?.id]);


    // --- Signaling & Call Status Listener ---
    useEffect(() => {
        if (!call || !db) return;

        const callDocRef = doc(db, 'calls', call.id);
        const unsubscribe = onSnapshot(callDocRef, async (snapshot) => {
            if (!snapshot.exists()) {
                handleEndCall(true); 
                return;
            }

            const data = snapshot.data() as Call;

            if (data.status === 'ended' || data.status === 'declined' || data.status === 'cancelled') {
                handleEndCall(true);
                // Cleanup: Delete document after delay if I am the caller or it's ended
                if (data.callerId === currentUser?.id || data.status === 'ended') {
                    setTimeout(() => deleteDoc(callDocRef).catch(console.error), 2000);
                }
                return;
            }

            if (pc.current && !pc.current.currentRemoteDescription && data.answer && call.callerId === currentUser?.id) {
                const answer = new RTCSessionDescription(data.answer);
                await pc.current.setRemoteDescription(answer);
            }
        });
        
        const candidatesCollection = collection(db, 'calls', call.id, 'candidates');
        const unsubscribeCandidates = onSnapshot(candidatesCollection, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    pc.current?.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                }
            });
        });

        return () => {
            unsubscribe();
            unsubscribeCandidates();
        };
    }, [call?.id, currentUser?.id]);


    // --- Start Outgoing Call ---
    useEffect(() => {
        if (call && call.callerId === currentUser?.id && call.status === 'ringing' && !pc.current) {
            const start = async () => {
                const stream = await setupSources(call.type === 'video');
                pc.current = createPeerConnection(call.id);

                stream?.getTracks().forEach(track => pc.current?.addTrack(track, stream));

                const offer = await pc.current.createOffer();
                await pc.current.setLocalDescription(offer);

                await updateDoc(doc(db, 'calls', call.id), { offer: { sdp: offer.sdp, type: offer.type } });
            };
            start();
        }
    }, [call, currentUser?.id]);


    // --- WebRTC Core Functions ---
    const setupSources = async (isVideo: boolean) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
            localStream.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            return stream;
        } catch (err) {
            console.error("Error accessing media devices:", err);
            alert("Could not access camera/microphone. Please check permissions.");
            handleEndCall(true);
            return null;
        }
    };

    const createPeerConnection = (callId: string) => {
        const newPc = new RTCPeerConnection(servers);

        newPc.onicecandidate = event => {
            if (event.candidate) {
                addDoc(collection(db, 'calls', callId, 'candidates'), event.candidate.toJSON());
            }
        };
        
        newPc.ontrack = event => {
            if (remoteVideoRef.current) {
                const [remoteStream] = event.streams;
                remoteVideoRef.current.srcObject = remoteStream;
            }
        };

        newPc.onconnectionstatechange = () => {
            if (newPc.connectionState === 'failed' || newPc.connectionState === 'disconnected' || newPc.connectionState === 'closed') {
                handleEndCall(true);
            }
        };

        return newPc;
    };

    // --- User Actions ---
    const handleAccept = async () => {
        if (!call || !db) return;
        
        const stream = await setupSources(call.type === 'video');
        if (!stream) return; // Exit if setup failed

        pc.current = createPeerConnection(call.id);
        
        stream?.getTracks().forEach(track => pc.current?.addTrack(track, stream));

        const callRef = doc(db, 'calls', call.id);
        const callSnap = await getDoc(callRef);
        
        if (!callSnap.exists()) {
            handleEndCall(true);
            return;
        }
        
        const callData = callSnap.data() as Call;

        if (callData.offer) {
            await pc.current.setRemoteDescription(new RTCSessionDescription(callData.offer!));
            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);

            await updateDoc(callRef, {
                answer: { sdp: answer.sdp, type: answer.type },
                status: 'connected'
            });
        }
    };

    const handleDeclineOrCancel = async () => {
        if (!call || !db) return;
        const newStatus = call.callerId === currentUser?.id ? 'cancelled' : 'declined';
        await updateDoc(doc(db, 'calls', call.id), { status: newStatus });
        handleEndCall(true);
    };

    const handleEndCall = async (isCleanup = false) => {
        if (!isCleanup && call && db) {
            await updateDoc(doc(db, 'calls', call.id), { status: 'ended' });
        }
        if (pc.current) {
            pc.current.close();
            pc.current = null;
        }
        if (localStream.current) {
            localStream.current.getTracks().forEach(track => track.stop());
            localStream.current = null;
        }
        setCall(null);
        setDuration(0);
        setIsMuted(false);
        setIsVideoEnabled(true);
    };

    // --- In-Call Controls ---
    const toggleMute = () => {
        localStream.current?.getAudioTracks().forEach(track => track.enabled = !track.enabled);
        setIsMuted(!isMuted);
    };

    const toggleVideo = () => {
        localStream.current?.getVideoTracks().forEach(track => track.enabled = !track.enabled);
        setIsVideoEnabled(!isVideoEnabled);
    };
    
     // --- Duration Timer ---
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

    // --- RENDER LOGIC ---
    if (call.calleeId === currentUser.id && call.status === 'ringing') {
        return (
            <div className="fixed inset-0 z-[200] bg-gray-900/95 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                <div className="w-full max-w-md h-full flex flex-col items-center justify-between py-20 px-6">
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="relative mb-8">
                            <div className="absolute inset-0 rounded-full bg-flame-orange/20 animate-ping"></div>
                            <img src={call.callerPhoto} alt={call.callerName} className="w-32 h-32 rounded-full object-cover border-4 border-white/10 shadow-2xl relative z-10" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">{call.callerName}</h2>
                        <p className="text-gray-300 font-medium">{call.type === 'video' ? '📹 Video Call' : '📞 Audio Call'}</p>
                    </div>
                    <div className="w-full flex justify-around items-center">
                        <button onClick={handleDeclineOrCancel} className="flex flex-col items-center gap-2">
                            <div className="p-5 bg-red-500 rounded-full text-white shadow-xl active:scale-90 transition-transform"><XIcon className="w-8 h-8" /></div>
                            <span className="text-white font-semibold">Decline</span>
                        </button>
                        <button onClick={handleAccept} className="flex flex-col items-center gap-2">
                            <div className="p-5 bg-green-500 rounded-full text-white shadow-xl active:scale-90 transition-transform animate-bounce">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.26-.26.35-.63.24-1.01a11.36 11.36 0 01-.56-3.53C8.96 3.55 8.5 3 7.87 3H4.24C3.56 3 3 3.56 3 4.24c0 9.39 7.61 17 17 17 .68 0 1.24-.56 1.24-1.24v-3.63c0-.63-.55-1.09-1.23-1.09z"/></svg>
                            </div>
                            <span className="text-white font-semibold">Accept</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    const isVideoCall = call.type === 'video';
    const isOutgoingRinging = call.callerId === currentUser.id && call.status === 'ringing';

    return (
        <div className="fixed inset-0 z-[200] bg-black flex justify-center animate-fade-in">
            <div className="w-full max-w-md h-full relative bg-gray-900 flex flex-col">
                <div className="flex-1 w-full relative overflow-hidden">
                    <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${!isVideoCall || call.status !== 'connected' ? 'hidden' : ''}`} />
                    
                    {(!isVideoCall || call.status !== 'connected') && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center pt-20">
                             <img src={call.callerId === currentUser.id ? call.calleePhoto : call.callerPhoto} className="w-32 h-32 rounded-full object-cover border-4 border-white/20 shadow-2xl mb-6" />
                             <h2 className="text-3xl font-bold text-white mb-2">{call.callerId === currentUser.id ? call.calleeName : call.callerName}</h2>
                             <p className="text-gray-300 font-medium">{call.status === 'connected' ? formatTime(duration) : 'Calling...'}</p>
                         </div>
                    )}

                    {isVideoCall && (
                        <div className="absolute top-4 right-4 w-28 h-40 bg-black rounded-xl overflow-hidden shadow-lg border border-white/20">
                            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                        </div>
                    )}
                </div>

                <div className="w-full bg-black/60 backdrop-blur-md p-6 flex justify-around items-center">
                    {isVideoCall && (
                        <button onClick={toggleVideo} className={`p-4 rounded-full transition-colors ${!isVideoEnabled ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
                            <CameraIcon className="w-6 h-6"/>
                        </button>
                    )}
                    <button onClick={isOutgoingRinging ? handleDeclineOrCancel : () => handleEndCall(false)} className="p-5 bg-red-600 rounded-full text-white shadow-lg active:scale-95 transition-transform mx-4">
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
