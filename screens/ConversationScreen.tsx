
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove, getDocs, limit, setDoc, Timestamp } from 'firebase/firestore';
import { User, Message, Chat, Gift, RetentionPolicy } from '../types.ts';
import MoreVerticalIcon from '../components/icons/MoreVerticalIcon.tsx';
import GiftIcon from '../components/icons/GiftIcon.tsx';
import CameraIcon from '../components/icons/CameraIcon.tsx';
import MicIcon from '../components/icons/MicIcon.tsx';
import GalleryIcon from '../components/icons/GalleryIcon.tsx';
import ChatOptionsModal from '../components/ChatOptionsModal.tsx';
import ReportModal from '../components/ReportModal.tsx';
import GiftModal from '../components/GiftModal.tsx';
import FlameLoader from '../components/FlameLoader.tsx';
import ViewOnceMedia from '../components/ViewOnceMedia.tsx';
import ChatCamera from '../components/ChatCamera.tsx';
import { useI18n } from '../contexts/I18nContext.ts';
import { uploadPhotos } from '../utils/photoUploader.ts';

const REACTION_EMOJIS = ['🔥', '❤️', '😂', '😮', '👍', '😢'];

const ReplyPreview: React.FC<{ messageText: string, senderName: string, onCancel: () => void }> = ({ messageText, senderName, onCancel }) => {
    const { t } = useI18n();
    return (
        <div className="p-2 border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 flex justify-between items-center">
            <div className="text-xs text-gray-600 dark:text-gray-400 overflow-hidden">
                <p className="font-semibold">{t('replyingTo')} {senderName}</p>
                <p className="italic truncate">{messageText || 'Media'}</p>
            </div>
            <button onClick={onCancel} className="p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
};

const AudioPlayer: React.FC<{ src: string, isOwnMessage: boolean }> = ({ src, isOwnMessage }) => {
    return (
        <div className="min-w-[150px] p-2 flex items-center">
            <audio controls src={src} className="h-8 w-full max-w-[200px]" />
        </div>
    );
};

const MessageBubble: React.FC<{ 
    message: Message, 
    isOwnMessage: boolean, 
    onLongPress: (e: React.MouseEvent, msg: Message) => void, 
    onViewMedia: (msgId: string, currentCount: number) => void,
    onToggleSave: (msg: Message) => void,
}> = ({ message, isOwnMessage, onLongPress, onViewMedia, onToggleSave }) => {
    
    // Handle System Messages (e.g. "User changed settings")
    if (message.isSystemMessage) {
        return (
            <div className="flex justify-center my-4 opacity-70">
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 text-center bg-gray-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                    {message.text}
                </p>
            </div>
        );
    }

    // Determine bubble styling
    const isMedia = !!message.mediaUrl;
    const isAudio = message.mediaType === 'audio';
    const isViewOnce = !!message.isViewOnce;
    const isSaved = !!message.isSaved;
    
    // Base styles
    let bubbleClass = isOwnMessage 
        ? 'self-end rounded-2xl rounded-tr-sm ' 
        : 'self-start rounded-2xl rounded-tl-sm ';
    
    // Color logic based on "Saved" status
    if (isSaved) {
        // Saved state: distinct look (grayish background usually)
        bubbleClass += 'bg-gray-200 dark:bg-zinc-700 text-dark-gray dark:text-gray-200 border-l-4 border-flame-orange ';
    } else {
        // Default State
        bubbleClass += isOwnMessage 
            ? 'bg-flame-orange text-white ' 
            : 'bg-white dark:bg-zinc-800 text-dark-gray dark:text-gray-200 border border-gray-100 dark:border-zinc-700 shadow-sm ';
    }

    const handleClick = (e: React.MouseEvent) => {
        // Don't toggle save on view once media or if it's already an interactive element
        if (!isViewOnce) {
             // In Snapchat, tapping text saves it. Tapping media usually opens it.
             // We'll allow tap-to-save for text and audio.
            if (!isMedia || isAudio) {
                 onToggleSave(message);
            }
        }
    };

    // Check if viewed
    const viewed = !!message.viewedAt;
    const viewCount = message.viewCount || (viewed ? 1 : 0);

    if (message.isRecalled) {
        return (
             <div className="px-3 py-2 rounded-full text-xs italic text-gray-400 dark:text-gray-500 self-center border border-gray-200 dark:border-zinc-800 my-1">
                Message recalled
            </div>
        )
    }

    if (message.gift) {
        return (
             <div onContextMenu={(e) => onLongPress(e, message)} className={`p-3 rounded-2xl max-w-[70%] text-center flex flex-col items-center my-1 ${bubbleClass}`}>
                <span className="text-4xl animate-bounce">{message.gift.icon}</span>
                <p className="font-semibold mt-1 text-sm">Sent a {message.gift.name}</p>
            </div>
        )
    }
    
    const reactions = message.reactions && Object.entries(message.reactions).filter(
        (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0
    );
    
    return (
        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} my-0.5 group transition-all duration-200`}>
            <div 
                onContextMenu={(e) => onLongPress(e, message)} 
                onClick={handleClick}
                className={`relative max-w-[85%] md:max-w-[70%] cursor-pointer ${isMedia && !isViewOnce && !isAudio ? 'p-1' : 'px-4 py-2'} ${bubbleClass}`}
            >
                {message.replyTo && (
                    <div className={`p-2 rounded-lg mb-1 text-xs border-l-2 ${isOwnMessage && !isSaved ? 'bg-black/10 border-white/50' : 'bg-gray-100 dark:bg-zinc-700 border-flame-orange'}`}>
                        <p className="font-bold opacity-80">{message.replyTo.senderName}</p>
                        <p className="opacity-70 truncate">{message.replyTo.text || 'Media'}</p>
                    </div>
                )}
                
                {isMedia ? (
                    isAudio ? (
                        <AudioPlayer src={message.mediaUrl!} isOwnMessage={isOwnMessage && !isSaved} />
                    ) : (
                        isViewOnce ? (
                            <div onClick={(e) => e.stopPropagation()}>
                                <ViewOnceMedia 
                                    mediaUrl={message.mediaUrl!} 
                                    mediaType={message.mediaType || 'image'} 
                                    isSender={isOwnMessage}
                                    viewed={viewed}
                                    viewCount={viewCount}
                                    onView={() => onViewMedia(message.id, viewCount)}
                                />
                            </div>
                        ) : (
                            <div className="rounded-xl overflow-hidden">
                                {message.mediaType === 'video' ? (
                                    <video src={message.mediaUrl} controls className="max-h-64 w-full object-cover" onClick={(e) => e.stopPropagation()} />
                                ) : (
                                    <img src={message.mediaUrl} alt="sent media" className="max-h-64 w-full object-cover" />
                                )}
                                {message.text && <p className={`mt-2 text-sm px-2 pb-1 ${isOwnMessage && !isSaved ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>{message.text}</p>}
                            </div>
                        )
                    )
                ) : (
                    <p className="text-[15px] leading-relaxed break-words">{message.text}</p>
                )}
                
                {isSaved && (
                    <span className="text-[10px] font-bold uppercase opacity-50 block mt-1">Saved</span>
                )}
            </div>
            
             {reactions && reactions.length > 0 && (
                <div className={`flex -mt-2 z-10 ${isOwnMessage ? 'mr-2' : 'ml-2'}`}>
                    {reactions.map(([emoji, userIds]) => (
                        <div key={emoji} className="px-1.5 py-0.5 bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-full flex items-center shadow-sm text-xs">
                            <span>{emoji}</span>
                            {userIds.length > 1 && <span className="ml-0.5 font-bold">{userIds.length}</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const MessageContextMenu: React.FC<{ message: Message; position: { x: number; y: number }; onClose: () => void; onReply: () => void; onReact: (emoji: string) => void; onRecall: () => void; isOwnMessage: boolean }> = ({ message, position, onClose, onReply, onReact, onRecall, isOwnMessage }) => {
    const isRecallable = isOwnMessage && message.timestamp && (Date.now() - message.timestamp.toDate().getTime()) < 5 * 60 * 1000;
    
    const safeX = Math.min(position.x, window.innerWidth - 200);
    const safeY = Math.min(position.y, window.innerHeight - 150);

    return (
        <>
            <div className="fixed inset-0 z-[90]" onClick={onClose} />
            <div style={{ top: safeY, left: safeX }} className="fixed bg-white dark:bg-zinc-800 rounded-xl shadow-2xl z-[100] animate-fade-in-fast overflow-hidden border border-gray-100 dark:border-zinc-700 w-48">
                <div className="flex justify-between p-3 border-b dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900">
                    {REACTION_EMOJIS.slice(0, 4).map(emoji => (
                        <button key={emoji} onClick={() => onReact(emoji)} className="text-xl hover:scale-125 transition-transform">
                            {emoji}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col text-sm font-medium">
                    <button onClick={onReply} className="p-3 text-left hover:bg-gray-100 dark:hover:bg-zinc-700 dark:text-gray-200 flex items-center">
                         <span className="mr-2">↩️</span> Reply
                    </button>
                    {isRecallable && (
                        <button onClick={onRecall} className="p-3 text-left text-error-red hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center">
                            <span className="mr-2">🗑️</span> Recall
                        </button>
                    )}
                </div>
            </div>
        </>
    )
};


interface ConversationScreenProps {
    currentUser: User;
    partnerId: string;
    onClose: () => void;
    onUpdateUser: (user: User) => void;
    onViewProfile: (userId: string) => void;
}

const ConversationScreen: React.FC<ConversationScreenProps> = ({ currentUser, partnerId, onClose, onUpdateUser, onViewProfile }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [chatId, setChatId] = useState<string | null>(null);
    const [retentionPolicy, setRetentionPolicy] = useState<RetentionPolicy>('forever');
    const [partner, setPartner] = useState<User | null>(null);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [contextMenu, setContextMenu] = useState<{ message: Message; position: { x: number; y: number } } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    
    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Load: Partner & Chat
    useEffect(() => {
        if (!db) return;
        const fetchPartnerData = async () => {
            const partnerRef = doc(db, 'users', partnerId);
            const docSnap = await getDoc(partnerRef);
            if (docSnap.exists()) {
                setPartner({ id: docSnap.id, ...docSnap.data() } as User);
            }
        };
        fetchPartnerData();
    }, [partnerId]);

    // Chat Subscription
    useEffect(() => {
        if (!db) return;
        const userIds = [currentUser.id, partnerId].sort();
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('userIds', '==', userIds));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (!snapshot.empty) {
                const chatDoc = snapshot.docs[0];
                setChatId(chatDoc.id);
                const data = chatDoc.data() as Chat;
                if (data.retentionPolicy) setRetentionPolicy(data.retentionPolicy);
                
                // Mark read if needed
                if ((data.unreadCount?.[currentUser.id] || 0) > 0) {
                    updateDoc(doc(db, 'chats', chatDoc.id), {
                        [`unreadCount.${currentUser.id}`]: 0
                    });
                }
            } else {
                // Chat might not exist yet, wait for creation
                setChatId(null);
            }
        });
        return () => unsubscribe();
    }, [currentUser.id, partnerId]);

    // Messages Subscription & Filtering
    useEffect(() => {
        if (!chatId || !db) {
            setMessages([]);
            return;
        };
        
        const messagesQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);
        });
        return () => unsubscribe();
    }, [chatId]);
    
    // Client-side filtering and auto-marking as viewed for retention
    useEffect(() => {
        const now = Date.now();
        const messagesToMarkViewed: string[] = [];

        const validMessages = messages.filter(msg => {
            // Recalled messages placeholder
            if (msg.isRecalled) return true;
            
            // Saved messages are ALWAYS kept
            if (msg.isSaved) return true;
            
            // System messages are kept for context
            if (msg.isSystemMessage) return true;

            // Logic to mark unviewed messages as viewed if a retention policy is active
            if (retentionPolicy !== 'forever' && !msg.viewedAt && msg.senderId !== currentUser.id) {
                // Only mark as viewed if we are filtering. 
                // This ensures "read" starts the timer.
                // We add to a list to batch update.
                messagesToMarkViewed.push(msg.id);
            }

            // Retention Logic
            if (retentionPolicy === '5min') {
                if (!msg.viewedAt) return true; // Not viewed yet, keep it.
                // If viewed, check time diff
                const viewTime = msg.viewedAt.toDate().getTime();
                return (now - viewTime) < 5 * 60 * 1000;
            }

            if (retentionPolicy === 'read') {
                 if (!msg.viewedAt) return true; // Not viewed yet
                 // If I just marked it as viewed in this render cycle, it will disappear on next render/filter check
                 // Check if it was viewed more than a few seconds ago to prevent instant flicker
                 const viewTime = msg.viewedAt.toDate().getTime();
                 return (now - viewTime) < 2000; // Keep for 2 seconds after read
            }
            
            return true;
        });
        
        setFilteredMessages(validMessages);
        
        // Batch update viewedAt for messages that need it
        if (messagesToMarkViewed.length > 0 && chatId && db) {
            const batchUpdate = async () => {
                const timestamp = serverTimestamp();
                // We do one by one or batch. Firestore batch limit is 500.
                for (const msgId of messagesToMarkViewed) {
                     await updateDoc(doc(db, 'chats', chatId, 'messages', msgId), { viewedAt: timestamp });
                }
            };
            batchUpdate();
        }
        
        if (messages.length > 0) {
           setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }

    }, [messages, retentionPolicy, chatId, currentUser.id]);
    
    // Re-run filter periodically to hide expired messages without needing a db update
    useEffect(() => {
        if (retentionPolicy === 'forever') return;
        const interval = setInterval(() => {
             // Trigger re-render by creating a new array reference
             setMessages(prev => [...prev]);
        }, 5000); 
        return () => clearInterval(interval);
    }, [retentionPolicy]);

    const getOrCreateChat = async (): Promise<string> => {
        if (chatId) return chatId;
        const userIds = [currentUser.id, partnerId].sort();
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('userIds', '==', userIds), limit(1));
        const existingChatSnapshot = await getDocs(q);
        if (!existingChatSnapshot.empty) {
            const existingChatId = existingChatSnapshot.docs[0].id;
            setChatId(existingChatId);
            return existingChatId;
        }
        if (!partner) throw new Error("Partner data not available");
        const newChatData: any = {
            userIds,
            users: {
                [currentUser.id]: { name: currentUser.name, profilePhoto: currentUser.profilePhotos[0] },
                [partner.id]: { name: partner.name, profilePhoto: partner.profilePhotos[0] }
            },
            retentionPolicy: 'forever',
            createdAt: serverTimestamp(),
            // Important: initialize deletedFor as empty
            deletedFor: []
        };
        const newChatRef = doc(collection(db, 'chats'));
        await setDoc(newChatRef, newChatData);
        setChatId(newChatRef.id);
        return newChatRef.id;
    };

    const handleSendMessage = async (customText?: string, mediaFile?: File, mediaType?: 'image' | 'video' | 'audio', isViewOnce?: boolean) => {
        if ((!newMessage.trim() && !customText && !mediaFile) || !db || !partner || isSending) return;
        setIsSending(true);
        
        const textToSend = customText !== undefined ? customText : newMessage.trim();
        const replyContext = replyingTo ? { messageId: replyingTo.id, senderName: replyingTo.senderId === currentUser.id ? currentUser.name : partner.name, text: replyingTo.text || 'Media' } : null;
        
        setNewMessage('');
        setReplyingTo(null);

        try {
            const currentChatId = await getOrCreateChat();
            let mediaUrl = '';

            if (mediaFile) {
                const urls = await uploadPhotos([mediaFile]);
                mediaUrl = urls[0];
            }

            const messagePayload: any = {
                chatId: currentChatId,
                senderId: currentUser.id,
                text: textToSend,
                timestamp: serverTimestamp(),
                mediaUrl: mediaUrl || null,
                mediaType: mediaType || null,
                isViewOnce: !!isViewOnce,
                isSaved: false 
            };
            
            if (replyContext) messagePayload.replyTo = replyContext;
            
            await addDoc(collection(db, 'chats', currentChatId, 'messages'), messagePayload);
            
            // Update last message
            let lastMsgText = textToSend;
            if (mediaUrl) {
                if (mediaType === 'audio') lastMsgText = '🎤 Voice Message';
                else if (isViewOnce) lastMsgText = '📷 View Once Media';
                else lastMsgText = '📷 Media';
            }

            // Ensure we clear deletedFor so the partner sees the new message even if they deleted the chat
            await updateDoc(doc(db, 'chats', currentChatId), {
                lastMessage: { text: lastMsgText, senderId: currentUser.id, timestamp: serverTimestamp() },
                [`unreadCount.${partnerId}`]: increment(1),
                deletedFor: arrayRemove(partnerId, currentUser.id) 
            });

        } catch (error) {
            console.error("Error sending:", error);
        } finally {
            setIsSending(false);
        }
    };

    // Audio Recorder Functions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];
            
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
        } catch (err) {
            console.error("Error starting microphone:", err);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp4' }); // mp4 or webm
                const audioFile = new File([audioBlob], `voice_${Date.now()}.m4a`, { type: 'audio/mp4' });
                handleSendMessage('', audioFile, 'audio', false);
                
                // Stop tracks
                mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };
    
    const handleViewMedia = async (msgId: string, currentCount: number) => {
        if (!chatId || !db) return;
        
        // Max 2 views allowed (Original + 1 Replay)
        if (currentCount >= 2) return;

        const msgRef = doc(db, 'chats', chatId, 'messages', msgId);
        await updateDoc(msgRef, {
            viewedAt: serverTimestamp(), // Update timestamp on latest view
            viewCount: increment(1)
        });
    };
    
    const handleToggleSave = async (msg: Message) => {
        if (!chatId || !db) return;
        // Toggle saved status
        await updateDoc(doc(db, 'chats', chatId, 'messages', msg.id), { isSaved: !msg.isSaved });
    };

    const updateRetention = async (policy: RetentionPolicy) => {
        if (!chatId || !db) return;
        
        // Update the chat document first (this syncs the setting to both users)
        await updateDoc(doc(db, 'chats', chatId), { retentionPolicy: policy });
        setRetentionPolicy(policy);
        
        let policyText = 'Messages are kept forever';
        if (policy === '5min') policyText = 'Messages expire 5 minutes after reading';
        if (policy === 'read') policyText = 'Messages expire immediately after reading';

        // Add system message to the chat so the other user sees it
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
            chatId: chatId,
            senderId: currentUser.id,
            text: `${currentUser.name} set chat to: ${policyText}`,
            timestamp: serverTimestamp(),
            isSystemMessage: true
        });
    };

    const handleCameraCapture = (file: File, type: 'image' | 'video') => {
        // Camera captures are View Once by default
        handleSendMessage('', file, type, true);
    };

    const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const type = file.type.startsWith('video') ? 'video' : 'image';
            // Gallery uploads are PERMANENT by default
            handleSendMessage('', file, type, false);
        }
    };

    const handleSendGift = async (gift: Gift) => { 
         const currentCoins = Number(currentUser.coins) || 0;
        if (!db || !partner || isSending || currentCoins < gift.cost) return;
        setIsSending(true);
        setIsGiftModalOpen(false);
        try {
            const currentChatId = await getOrCreateChat();
            const userRef = doc(db, 'users', currentUser.id);
            await updateDoc(userRef, { coins: increment(-gift.cost) });
            onUpdateUser({...currentUser, coins: (currentCoins - gift.cost) }); 
            await addDoc(collection(db, 'chats', currentChatId, 'messages'), { 
                chatId: currentChatId, senderId: currentUser.id, gift, timestamp: serverTimestamp() 
            });
            await updateDoc(doc(db, 'chats', currentChatId), { 
                lastMessage: { text: `${gift.icon} ${gift.name}`, senderId: currentUser.id, timestamp: serverTimestamp() }, 
                [`unreadCount.${partnerId}`]: increment(1),
                deletedFor: arrayRemove(partnerId, currentUser.id)
            });
        } catch(error) { console.error(error); } finally { setIsSending(false); }
    };

    const handleBlock = async () => {
        if(!db || !partner) return;
        await updateDoc(doc(db, 'users', currentUser.id), { blockedUsers: arrayUnion(partner.id) });
        onClose();
    };
    
    const handleDeleteChat = async () => {
        if (!chatId || !db) return;
        if (window.confirm("Delete this chat?")) {
             await updateDoc(doc(db, 'chats', chatId), { deletedFor: arrayUnion(currentUser.id) });
            onClose();
        }
    }

    const handleReport = async (reason: string, details: string) => {
        if(!db || !partner) return;
        await addDoc(collection(db, 'reports'), { reportedUserId: partner.id, reportingUserId: currentUser.id, reason, details, timestamp: serverTimestamp() });
        setIsReportOpen(false); setIsOptionsOpen(false);
    };

    const handleReact = async (message: Message, emoji: string) => {
        if (!chatId || !db) return;
        const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
        const reactions = message.reactions || {};
        const users = reactions[emoji] || [];
        const newReactions = { ...reactions, [emoji]: users.includes(currentUser.id) ? users.filter(id => id !== currentUser.id) : [...users, currentUser.id] };
        await updateDoc(msgRef, { reactions: newReactions });
        setContextMenu(null);
    };
    
    const handleRecall = async (message: Message) => {
         if (!chatId || !db) return;
         if (window.confirm("Recall this message?")) {
            await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), { isRecalled: true, text: '', mediaUrl: null });
         }
         setContextMenu(null);
    }

    if (!partner) return <div className="absolute inset-0 bg-white dark:bg-black z-50 flex justify-center items-center"><FlameLoader /></div>;

    return (
        <div className="absolute inset-0 bg-gray-50 dark:bg-black z-50 flex flex-col animate-slide-in-right">
            {contextMenu && <MessageContextMenu {...contextMenu} onClose={() => setContextMenu(null)} onReact={(emoji) => handleReact(contextMenu.message, emoji)} onRecall={() => handleRecall(contextMenu.message)} onReply={() => { setReplyingTo(contextMenu.message); setContextMenu(null); }} isOwnMessage={contextMenu.message.senderId === currentUser.id} />}
            {isOptionsOpen && <ChatOptionsModal onClose={() => setIsOptionsOpen(false)} onViewProfile={() => { setIsOptionsOpen(false); onViewProfile(partner.id); }} onReport={() => setIsReportOpen(true)} onBlock={handleBlock} onDeleteChat={handleDeleteChat} currentRetention={retentionPolicy} onUpdateRetention={updateRetention} />}
            {isReportOpen && <ReportModal reportedUser={partner} onClose={() => setIsReportOpen(false)} onSubmit={handleReport} />}
            {isGiftModalOpen && <GiftModal onClose={() => setIsGiftModalOpen(false)} currentUser={currentUser} onSendGift={handleSendGift}/>}
            {isCameraOpen && <ChatCamera onClose={() => setIsCameraOpen(false)} onCapture={handleCameraCapture} />}
            
            <header className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 backdrop-blur-md sticky top-0 z-20">
                <button onClick={onClose} className="mr-3 text-dark-gray dark:text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => onViewProfile(partner.id)} className="flex-1 flex items-center min-w-0">
                    <div className="relative">
                        <img src={partner.profilePhotos[0]} alt={partner.name} className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-zinc-700" />
                        {retentionPolicy !== 'forever' && (
                            <div className="absolute -bottom-1 -right-1 bg-gray-100 dark:bg-zinc-800 rounded-full p-0.5 border border-white dark:border-zinc-900">
                                <span className="text-[10px]">⏱️</span>
                            </div>
                        )}
                    </div>
                    <div className="ml-3">
                        <span className="font-bold block text-dark-gray dark:text-gray-100 text-base">{partner.name}</span>
                        {retentionPolicy !== 'forever' && (
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">
                                {retentionPolicy === '5min' ? 'Delete after 5m' : 'Delete after read'}
                            </span>
                        )}
                    </div>
                </button>
                <div className="flex items-center space-x-3">
                    <button onClick={() => setIsGiftModalOpen(true)} className="text-gray-500 dark:text-gray-400 hover:scale-110 transition-transform">
                        <GiftIcon className="w-6 h-6" />
                    </button>
                    <button onClick={() => setIsOptionsOpen(true)} className="text-gray-500 dark:text-gray-400">
                        <MoreVerticalIcon />
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-1 bg-[#efeae2] dark:bg-black/50">
                {filteredMessages.map(msg => (
                    <MessageBubble 
                        key={msg.id} 
                        message={msg} 
                        isOwnMessage={msg.senderId === currentUser.id} 
                        onLongPress={(e, m) => { e.preventDefault(); setContextMenu({ message: m, position: { x: e.clientX, y: e.clientY } }); }}
                        onViewMedia={handleViewMedia}
                        onToggleSave={handleToggleSave}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>
            
            <div className="bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 pb-safe">
                {replyingTo && <ReplyPreview messageText={replyingTo.text} senderName={replyingTo.senderId === currentUser.id ? 'You' : partner.name} onCancel={() => setReplyingTo(null)} />}
                
                <div className="flex items-end space-x-2 p-2 px-3">
                    <button 
                        onClick={() => setIsCameraOpen(true)}
                        className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <CameraIcon className="w-6 h-6" />
                    </button>

                    <div className="flex-1 bg-gray-100 dark:bg-zinc-800 rounded-2xl flex items-center relative">
                        <input type="file" ref={fileInputRef} onChange={handleGallerySelect} className="hidden" accept="image/*,video/*" />
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={isRecording ? "Recording..." : "Chat"}
                            disabled={isRecording}
                            className={`flex-1 bg-transparent border-none focus:outline-none px-4 py-3 max-h-32 resize-none dark:text-gray-200 text-base ${isRecording ? 'text-red-500 animate-pulse font-bold' : ''}`}
                            rows={1}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                            <GalleryIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <button 
                        className={`p-3 rounded-full transition-all ${newMessage.trim() || isRecording ? 'bg-flame-orange text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300'}`}
                        onClick={() => newMessage.trim() ? handleSendMessage() : null}
                        // Mouse/Touch events for recording
                        onMouseDown={!newMessage.trim() ? startRecording : undefined}
                        onMouseUp={!newMessage.trim() ? stopRecording : undefined}
                        onTouchStart={!newMessage.trim() ? startRecording : undefined}
                        onTouchEnd={!newMessage.trim() ? stopRecording : undefined}
                    >
                        {newMessage.trim() ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-0.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        ) : (
                             <MicIcon className={`w-5 h-5 ${isRecording ? 'animate-pulse scale-110' : ''}`} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConversationScreen;
