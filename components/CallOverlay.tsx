
import React, { useEffect, useState } from 'react';
import { User, Call } from '../types.ts';
import { db } from '../firebaseConfig.ts';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import MicIcon from './icons/MicIcon.tsx';
import { hapticFeedback } from '../utils/haptics.ts';

interface CallOverlayProps {
    currentUser: User | null;
}

const CallOverlay: React.FC<CallOverlayProps> = ({ currentUser }) => {
    const [incomingCall, setIncomingCall] = useState<Call | null>(null);
    const [activeCall, setActiveCall] = useState<Call | null>(null);
    const [duration, setDuration] = useState(0);

    // Listen for Incoming Calls where I am the Callee
    useEffect(() => {
        if (!currentUser || !db) return;

        const callsRef = collection(db, 'calls');
        // Query for calls where I am the callee and status is ringing
        const q = query(
            callsRef, 
            where('calleeId', '==', currentUser.id),
            where('status', '==', 'ringing')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const calls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Call));
            if (calls.length > 0) {
                // If we are not already in a call, show the incoming call
                if (!activeCall) {
                    setIncomingCall(calls[0]);
                    hapticFeedback('medium');
                }
            } else {
                setIncomingCall(null);
            }
        });

        return () => unsubscribe();
    }, [currentUser?.id, activeCall]);

    // Listen for updates on the active call OR if I am the Caller listening for acceptance
    useEffect(() => {
        if (!currentUser || !db) return;

        // If I started a call, I need to listen to it to see if it gets accepted
        if (!activeCall && !incomingCall) {
             const callsRef = collection(db, 'calls');
             const q = query(
                callsRef, 
                where('callerId', '==', currentUser.id),
                where('status', 'in', ['ringing', 'connected'])
            );
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const calls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Call));
                if (calls.length > 0) {
                    const myCall = calls[0];
                    if (myCall.status === 'connected') {
                        setActiveCall(myCall);
                    } else {
                        // Showing "Calling..." UI is handled in ConversationScreen mostly, 
                        // but we could promote it here to be global. 
                        // For now, let's just catch the connection.
                        setActiveCall(myCall); // Show active call UI immediately for caller too
                    }
                }
            });
            return () => unsubscribe();
        }
    }, [currentUser?.id, activeCall, incomingCall]);

    // Listen to the specific active/incoming call document for changes (end/decline)
    useEffect(() => {
        const targetCall = activeCall || incomingCall;
        if (!targetCall || !db) return;

        const callRef = doc(db, 'calls', targetCall.id);
        const unsubscribe = onSnapshot(callRef, (docSnap) => {
            if (!docSnap.exists()) {
                // Call document deleted
                setIncomingCall(null);
                setActiveCall(null);
                setDuration(0);
            } else {
                const updatedCall = { id: docSnap.id, ...docSnap.data() } as Call;
                
                if (updatedCall.status === 'ended' || updatedCall.status === 'declined') {
                    setIncomingCall(null);
                    setActiveCall(null);
                    setDuration(0);
                    // Automatically clean up ended calls after a moment
                    if (updatedCall.callerId === currentUser?.id) {
                         setTimeout(() => deleteDoc(callRef).catch(console.error), 1000);
                    }
                } else if (updatedCall.status === 'connected') {
                    setIncomingCall(null);
                    setActiveCall(updatedCall);
                }
            }
        });

        return () => unsubscribe();
    }, [activeCall?.id, incomingCall?.id, currentUser?.id]);

    // Timer for active call
    useEffect(() => {
        let interval: number;
        if (activeCall?.status === 'connected') {
            interval = window.setInterval(() => {
                setDuration(d => d + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeCall?.status]);

    const handleAccept = async () => {
        if (!incomingCall || !db) return;
        try {
            await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'connected' });
            setActiveCall({...incomingCall, status: 'connected'});
            setIncomingCall(null);
        } catch (e) {
            console.error("Error accepting call:", e);
        }
    };

    const handleDecline = async () => {
        if (!incomingCall || !db) return;
        try {
            await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'declined' });
            setIncomingCall(null);
        } catch (e) {
            console.error("Error declining call:", e);
        }
    };

    const handleEndCall = async () => {
        if (!activeCall || !db) return;
        try {
            await updateDoc(doc(db, 'calls', activeCall.id), { status: 'ended' });
            setActiveCall(null);
            setDuration(0);
        } catch (e) {
            console.error("Error ending call:", e);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (incomingCall) {
        return (
            <div className="fixed inset-0 z-[200] bg-gray-900 flex flex-col items-center pt-20 pb-10 px-6 animate-fade-in">
                <div className="flex-1 flex flex-col items-center">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 rounded-full bg-flame-orange/20 animate-ping" style={{ animationDuration: '2s' }}></div>
                        <div className="absolute inset-0 rounded-full bg-flame-orange/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
                        <img 
                            src={incomingCall.callerPhoto} 
                            alt={incomingCall.callerName} 
                            className="w-32 h-32 rounded-full object-cover border-4 border-white/10 shadow-2xl relative z-10" 
                        />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">{incomingCall.callerName}</h2>
                    <p className="text-gray-400 font-medium tracking-wide">Incoming {incomingCall.type} call...</p>
                </div>
                <div className="w-full flex justify-around items-center max-w-sm">
                    <button onClick={handleDecline} className="p-6 bg-red-500 rounded-full text-white shadow-xl transform active:scale-90 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.36 7.46 6 12 6s8.66 2.36 11.71 5.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                    </button>
                    <button onClick={handleAccept} className="p-6 bg-green-500 rounded-full text-white shadow-xl transform active:scale-90 transition-transform animate-bounce">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.26-.26.35-.63.24-1.01a11.36 11.36 0 01-.56-3.53C8.96 3.55 8.5 3 7.87 3H4.24C3.56 3 3 3.56 3 4.24c0 9.39 7.61 17 17 17 .68 0 1.24-.56 1.24-1.24v-3.63c0-.63-.55-1.09-1.23-1.09z"/></svg>
                    </button>
                </div>
            </div>
        );
    }

    if (activeCall) {
        const isCaller = activeCall.callerId === currentUser?.id;
        const partnerName = isCaller ? (activeCall.status === 'connected' ? 'Connected' : 'Calling...') : activeCall.callerName; 
        const partnerPhoto = isCaller ? (currentUser?.profilePhotos[0] || activeCall.callerPhoto) : activeCall.callerPhoto; // Visual placeholder

        return (
            <div className="fixed inset-0 z-[200] bg-gray-900 flex flex-col items-center pt-20 pb-10 px-6 animate-fade-in">
                <div className="flex-1 flex flex-col items-center">
                    <div className="relative mb-8">
                        <img 
                            src={partnerPhoto} 
                            alt="Call Partner" 
                            className="w-32 h-32 rounded-full object-cover border-4 border-white/10 shadow-2xl relative z-10" 
                        />
                        {!activeCall.status || activeCall.status === 'ringing' ? (
                             <>
                                <div className="absolute inset-0 rounded-full bg-flame-orange/20 animate-ping" style={{ animationDuration: '2s' }}></div>
                                <div className="absolute inset-0 rounded-full bg-flame-orange/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
                            </>
                        ) : null}
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">{partnerName}</h2>
                    <p className="text-gray-400 font-medium tracking-wide">
                        {activeCall.status === 'connected' ? formatTime(duration) : (isCaller ? 'Waiting for answer...' : 'Connecting...')}
                    </p>
                </div>
                <div className="w-full flex justify-around items-center max-w-sm">
                    <button className="p-4 bg-white/10 rounded-full text-white backdrop-blur-md">
                        <MicIcon className="w-6 h-6" />
                    </button>
                    <button onClick={handleEndCall} className="p-6 bg-red-500 rounded-full text-white shadow-xl transform active:scale-90 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.36 7.46 6 12 6s8.66 2.36 11.71 5.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default CallOverlay;
