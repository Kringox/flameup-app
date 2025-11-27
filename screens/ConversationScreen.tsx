
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove, getDocs, writeBatch, setDoc } from 'firebase/firestore';
import { User, Message, Chat, Gift, RetentionPolicy } from '../types.ts';
import MoreVerticalIcon from '../components/icons/MoreVerticalIcon.tsx';
import GiftIcon from '../components/icons/GiftIcon.tsx';
import CameraIcon from '../components/icons/CameraIcon.tsx';
import MicIcon from '../components/icons/MicIcon.tsx';
import ChatOptionsModal from '../components/ChatOptionsModal.tsx';
import ReportModal from '../components/ReportModal.tsx';
import GiftModal from '../components/GiftModal.tsx';
import FlameLoader from '../components/FlameLoader.tsx';
import ViewOnceMedia from '../components/ViewOnceMedia.tsx';
import ChatCamera from '../components/ChatCamera.tsx';
import { useI18n } from '../contexts/I18nContext.ts';
import { uploadPhotos } from '../utils/photoUploader.ts';
import StarIcon from '../components/icons/StarIcon.tsx';

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

const AudioPlayer: React.FC<{ src: string, duration?: number, isOwnMessage: boolean }> = ({ src, duration, isOwnMessage }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [loadedDuration, setLoadedDuration] = useState(duration || 0);
    const [playbackRate, setPlaybackRate] = useState(1);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            setPlaybackRate(1); 
            audio.playbackRate = 1;
        };
        const handleMetadata = () => {
            if (!duration && audio.duration !== Infinity) {
                setLoadedDuration(audio.duration);
            }
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('loadedmetadata', handleMetadata);
        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('loadedmetadata', handleMetadata);
        };
    }, [duration]);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };
    
    const toggleSpeed = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current) return;
        const newRate = playbackRate === 1 ? 1.5 : (playbackRate === 1.5 ? 2 : 1);
        setPlaybackRate(newRate);
        audioRef.current.playbackRate = newRate;
    };
    
    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    const finalDuration = duration || loadedDuration;
    const displayTime = isPlaying ? formatTime(currentTime) : formatTime(finalDuration);

    return (
        <div className="min-w-[170px] p-2 flex items-center space-x-2">
            <audio ref={audioRef} src={src} className="hidden" preload="metadata" />
            <button 
                onClick={togglePlay}
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isOwnMessage ? 'bg-white/20 text-white' : 'bg-flame-orange/10 text-flame-orange'}`}
            >
                {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                )}
            </button>
            <div className="flex-1 flex flex-col justify-center">
                <div className={`h-1 w-full rounded-full overflow-hidden ${isOwnMessage ? 'bg-white/30' : 'bg-gray-200'}`}>
                     <div 
                        className={`h-full ${isOwnMessage ? 'bg-white' : 'bg-flame-orange'}`} 
                        style={{ width: `${finalDuration ? (currentTime / finalDuration) * 100 : 0}%` }}
                     />
                </div>
            </div>
            <button 
                onClick={toggleSpeed}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isOwnMessage ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}
            >
                {playbackRate}x
            </button>
            <span className={`text-xs font-medium whitespace-nowrap ${isOwnMessage ? 'text-white/80' : 'text-gray-500'}`}>
                {displayTime}
            </span>
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
    
    if (message.isSystemMessage) {
        return (
            <div className="flex justify-center my-4 opacity-70">
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 text-center bg-gray-100 dark:bg-zinc-800 px-3 py-1 rounded-full shadow-sm">
                    {message.text}
                </p>
            </div>
        );
    }

    const isMedia = !!message.mediaUrl && message.mediaUrl.length > 0;
    const isAudio = message.mediaType === 'audio';
    const isViewOnce = !!message.isViewOnce;
    const isSaved = !!message.isSaved;
    const isFavorite = !!message.isFavorite;
    
    let bubbleClass = isOwnMessage 
        ? 'self-end rounded-2xl rounded-tr-sm ' 
        : 'self-start rounded-2xl rounded-tl-sm ';
    
    if (isSaved) {
        bubbleClass += 'bg-gray-200 dark:bg-zinc-700 text-dark-gray dark:text-gray-200 border-l-4 border-flame-orange ';
    } else {
        bubbleClass += isOwnMessage 
            ? 'bg-flame-orange text-white ' 
            : 'bg-white dark:bg-zinc-800 text-dark-gray dark:text-gray-200 border border-gray-100 dark:border-zinc-700 shadow-sm ';
    }

    const handleClick = (e: React.MouseEvent) => {
        if (!isViewOnce) {
            if (!isMedia || isAudio) {
                 onToggleSave(message);
            }
        }
    };

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
        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} my-0.5 group transition-all duration-200 w-full`}>
            <div className={`flex items-center gap-1 relative ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                {isFavorite && <StarIcon className={`w-3 h-3 absolute ${isOwnMessage ? '-left-4' : '-right-4'} ${isOwnMessage ? 'text-flame-orange' : 'text-gray-400'}`} />}
                <div 
                    onContextMenu={(e) => onLongPress(e, message)} 
                    onClick={handleClick}
                    className={`relative max-w-[85%] md:max-w-[70%] cursor-pointer w-fit ${isMedia && !isViewOnce && !isAudio ? 'p-1' : 'px-4 py-2'} ${bubbleClass}`}
                >
                    {message.replyTo && (
                        <div className={`p-2 rounded-lg mb-1 text-xs border-l-2 ${isOwnMessage && !isSaved ? 'bg-black/10 border-white/50' : 'bg-gray-100 dark:bg-zinc-700 border-flame-orange'}`}>
                            <p className="font-bold opacity-80 truncate">{message.replyTo.senderName}</p>
                            <p className="opacity-70 truncate">{message.replyTo.text || 'Media'}</p>
                        </div>
                    )}
                    
                    {isMedia ? (
                        isAudio ? (
                            <AudioPlayer src={message.mediaUrl!} duration={message.duration} isOwnMessage={isOwnMessage && !isSaved} />
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
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words min-w-0">{message.text}</p>
                    )}
                    
                    {isSaved && (
                        <span className="text-[10px] font-bold uppercase opacity-50 block mt-1">Saved</span>
                    )}
                </div>
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

const MessageContextMenu: React.FC<{ 
    message: Message; 
    position: { x: number; y: number }; 
    onClose: () => void; 
    onReply: () => void; 
    onReact: (emoji: string) => void; 
    onRecall: () => void; 
    onFavorite: () => void;
    isOwnMessage: boolean 
}> = ({ message, position, onClose, onReply, onReact, onRecall, onFavorite, isOwnMessage }) => {
    const isRecallable = isOwnMessage && message.timestamp && (Date.now() - message.timestamp.toDate().getTime()) < 5 * 60 * 1000;
    
    const safeX = Math.min(position.x, window.innerWidth - 200);
    const safeY = Math.min(position.y, window.innerHeight - 200);

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
                    <button onClick={onFavorite} className="p-3 text-left hover:bg-gray-100 dark:hover:bg-zinc-700 dark:text-gray-200 flex items-center">
                         <span className="mr-2">⭐</span> {message.isFavorite ? 'Unfavorite' : 'Favorite'}
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
    
    // Audio Rec
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<number | null>(null);
    
    const messagesRef = useRef<Message[]>([]);
    const retentionPolicyRef = useRef<RetentionPolicy>('forever');
    const chatIdRef = useRef<string | null>(null);
    const currentUserIdRef = useRef<string>(currentUser.id);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Streaks
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        retentionPolicyRef.current = retentionPolicy;
    }, [retentionPolicy]);

    useEffect(() => {
        chatIdRef.current = chatId;
    }, [chatId]);
    
    useEffect(() => {
        currentUserIdRef.current = currentUser.id;
    }, [currentUser.id]);

    useEffect(() => {
        return () => {
            const policy = retentionPolicyRef.current;
            const msgs = messagesRef.current;
            const cId = chatIdRef.current;
            const uId = currentUserIdRef.current;

            if (!cId || !db || msgs.length === 0) return;

            const messagesToDelete: string[] = [];
            const now = Date.now();

            if (policy !== 'forever') {
                msgs.forEach(msg => {
                    if (msg.isSaved || msg.isSystemMessage || msg.isRecalled) return;
                    if (msg.deletedFor?.includes(uId)) return;

                    if (msg.viewedAt) {
                        const viewTime = msg.viewedAt.toDate().getTime();
                        let shouldDelete = false;

                        if (policy === 'read') {
                            shouldDelete = true;
                        } else if (policy === '5min') {
                            if ((now - viewTime) > 5 * 60 * 1000) {
                                shouldDelete = true;
                            }
                        }

                        if (shouldDelete) {
                            messagesToDelete.push(msg.id);
                        }
                    }
                });
            }
            
            if (messagesToDelete.length > 0) {
                const batch = writeBatch(db);
                let batchCount = 0;
                let lastMessageDeleted = false;
                const lastMsgId = msgs[msgs.length - 1]?.id;

                messagesToDelete.forEach(msgId => {
                    if (batchCount < 490) {
                        const msgRef = doc(db, 'chats', cId, 'messages', msgId);
                        batch.update(msgRef, { deletedFor: arrayUnion(uId) });
                        batchCount++;
                        if (msgId === lastMsgId) {
                            lastMessageDeleted = true;
                        }
                    }
                });

                if (lastMessageDeleted) {
                     const chatRef = doc(db, 'chats', cId);
                     batch.update(chatRef, { "lastMessage.deletedFor": arrayUnion(uId) });
                }

                batch.commit().catch(err => console.error("Error cleaning up messages on leave:", err));
            }
        };
    }, []);

    useEffect(() => {
        if (!db) return;
        const fetchPartnerData = async () => {
            const partnerRef = doc(db, 'users', partnerId);
            const unsubscribe = onSnapshot(partnerRef, (docSnap) => {
                if (docSnap.exists()) {
                    setPartner({ id: docSnap.id, ...docSnap.data() } as User);
                }
            });
            return unsubscribe;
        };
        fetchPartnerData();
    }, [partnerId]);

    useEffect(() => {
        if (!db) return;
        
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('userIds', 'array-contains', currentUser.id));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const foundChatDoc = snapshot.docs.find(doc => {
                const data = doc.data();
                const uIds = data.userIds;
                return Array.isArray(uIds) && uIds.length === 2 && uIds.includes(partnerId);
            });

            if (foundChatDoc) {
                setChatId(foundChatDoc.id);
                const data = foundChatDoc.data() as Chat;
                if (data.retentionPolicy) setRetentionPolicy(data.retentionPolicy);
                setStreak(data.streak || 0);
                
                if ((data.unreadCount?.[currentUser.id] || 0) > 0) {
                    updateDoc(doc(db, 'chats', foundChatDoc.id), {
                        [`unreadCount.${currentUser.id}`]: 0
                    });
                }
            } else {
                setChatId(null);
            }
        });
        return () => unsubscribe();
    }, [currentUser.id, partnerId]);

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
    
    useEffect(() => {
        const messagesToMarkViewed: string[] = [];

        const validMessages = messages.filter(msg => {
            const isDeleted = msg.deletedFor && Array.isArray(msg.deletedFor) && msg.deletedFor.includes(currentUser.id);
            if (isDeleted) return false;
            return true;
        });
        
        setFilteredMessages(validMessages);
        
        validMessages.forEach(msg => {
            if (msg.senderId !== currentUser.id && !msg.viewedAt) {
                messagesToMarkViewed.push(msg.id);
            }
        });
        
        if (messagesToMarkViewed.length > 0 && chatId && db) {
            const batchUpdate = async () => {
                const timestamp = serverTimestamp();
                for (const msgId of messagesToMarkViewed) {
                     updateDoc(doc(db, 'chats', chatId, 'messages', msgId), { viewedAt: timestamp }).catch(e => console.error(e));
                }
            };
            batchUpdate();
        }
        
        if (messages.length > 0) {
           setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }

    }, [messages, chatId, currentUser.id]);
    
    // Swipe to Back
    const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
    const onTouchMove = (e: React.TouchEvent) => {
        if (touchStart === null) return;
        const currentTouch = e.targetTouches[0].clientX;
        if (currentTouch - touchStart > 100) {
            onClose();
        }
    };

    const getOrCreateChat = async (): Promise<string> => {
        if (chatId) return chatId;
        const userIds = [currentUser.id, partnerId].sort();
        
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('userIds', 'array-contains', currentUser.id));
        const snapshot = await getDocs(q);
        const existingChat = snapshot.docs.find(doc => {
             const uIds = doc.data().userIds;
             return Array.isArray(uIds) && uIds.length === 2 && uIds.includes(partnerId);
        });

        if (existingChat) {
            setChatId(existingChat.id);
            return existingChat.id;
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
            deletedFor: [],
            streak: 0
        };
        const newChatRef = doc(collection(db, 'chats'));
        await setDoc(newChatRef, newChatData);
        setChatId(newChatRef.id);
        return newChatRef.id;
    };

    const initiateCall = async (type: 'audio' | 'video') => {
        if (!db || !partner) return;
        try {
            await addDoc(collection(db, 'calls'), {
                callerId: currentUser.id,
                callerName: currentUser.name,
                callerPhoto: currentUser.profilePhotos[0],
                calleeId: partner.id,
                status: 'ringing',
                type: type,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error starting call:", error);
        }
    };

    const handleSendMessage = async (customText?: string, mediaFile?: File, mediaType?: 'image' | 'video' | 'audio', isViewOnce?: boolean, duration?: number) => {
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
                isSaved: false,
                duration: duration || 0,
                deletedFor: [],
                isFavorite: false
            };
            
            if (replyContext) messagePayload.replyTo = replyContext;
            
            const msgRef = await addDoc(collection(db, 'chats', currentChatId, 'messages'), messagePayload);
            
            let lastMsgText = textToSend;
            if (mediaUrl) {
                if (mediaType === 'audio') lastMsgText = '🎤 Voice Message';
                else if (isViewOnce) lastMsgText = '📷 View Once Media';
                else lastMsgText = '📷 Media';
            }

            // Streak Logic
            const chatRef = doc(db, 'chats', currentChatId);
            const chatSnap = await getDoc(chatRef);
            const chatData = chatSnap.data() as Chat;
            
            let newStreak = chatData.streak || 0;
            const lastUpdate = chatData.lastStreakUpdate?.toDate();
            const now = new Date();
            
            if (lastUpdate) {
                const diffTime = Math.abs(now.getTime() - lastUpdate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (diffDays === 1) {
                    newStreak += 1; 
                } else if (diffDays > 1) {
                    newStreak = 1; 
                }
            } else {
                newStreak = 1;
            }

            await updateDoc(chatRef, {
                lastMessage: { 
                    id: msgRef.id,
                    text: lastMsgText, 
                    senderId: currentUser.id, 
                    timestamp: serverTimestamp(),
                    deletedFor: [] 
                },
                [`unreadCount.${partnerId}`]: increment(1),
                deletedFor: arrayRemove(partnerId, currentUser.id),
                streak: newStreak,
                lastStreakUpdate: serverTimestamp()
            });

        } catch (error) {
            console.error("Error sending:", error);
        } finally {
            setIsSending(false);
        }
    };

    const startRecording = async (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if(isRecording) return;

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
            setRecordingDuration(0);
            
            timerIntervalRef.current = window.setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
            
        } catch (err) {
            console.error("Error starting microphone:", err);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (mediaRecorderRef.current && isRecording) {
            const finalDuration = recordingDuration;
            
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp4' });
                const audioFile = new File([audioBlob], `voice_${Date.now()}.m4a`, { type: 'audio/mp4' });
                
                mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
                
                if (finalDuration > 0) {
                   handleSendMessage('', audioFile, 'audio', false, finalDuration);
                }
            };
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            setRecordingDuration(0);
        }
    };
    
    const handleViewMedia = async (msgId: string, currentCount: number) => {
        if (!chatId || !db) return;
        if (currentCount >= 2) return;

        const msgRef = doc(db, 'chats', chatId, 'messages', msgId);
        await updateDoc(msgRef, {
            viewedAt: serverTimestamp(),
            viewCount: increment(1)
        });
    };
    
    const handleToggleSave = async (msg: Message) => {
        if (!chatId || !db) return;
        await updateDoc(doc(db, 'chats', chatId, 'messages', msg.id), { isSaved: !msg.isSaved });
    };
    
    const handleFavorite = async (msg: Message) => {
        if (!chatId || !db) return;
        await updateDoc(doc(db, 'chats', chatId, 'messages', msg.id), { isFavorite: !msg.isFavorite });
        setContextMenu(null);
    }

    const updateRetention = async (policy: RetentionPolicy) => {
        if (!chatId || !db) return;
        
        await updateDoc(doc(db, 'chats', chatId), { retentionPolicy: policy });
        setRetentionPolicy(policy);
        
        let policyText = 'Messages are kept forever';
        if (policy === '5min') policyText = 'Messages expire 5 minutes after reading';
        if (policy === 'read') policyText = 'Messages expire immediately after reading';

        await addDoc(collection(db, 'chats', chatId, 'messages'), {
            chatId: chatId,
            senderId: currentUser.id,
            text: `${currentUser.name} set chat to: ${policyText}`,
            timestamp: serverTimestamp(),
            isSystemMessage: true
        });
    };

    const handleCameraCapture = (file: File, type: 'image' | 'video') => {
        handleSendMessage('', file, type, true);
    };

    const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const type = file.type.startsWith('video') ? 'video' : 'image';
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
            const msgRef = await addDoc(collection(db, 'chats', currentChatId, 'messages'), { 
                chatId: currentChatId, senderId: currentUser.id, gift, timestamp: serverTimestamp() 
            });
            await updateDoc(doc(db, 'chats', currentChatId), { 
                lastMessage: { id: msgRef.id, text: `${gift.icon} ${gift.name}`, senderId: currentUser.id, timestamp: serverTimestamp(), deletedFor: [] }, 
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
            await updateDoc(doc(db, 'chats', chatId), {
                lastMessage: { text: 'Message recalled', senderId: currentUser.id, timestamp: serverTimestamp(), deletedFor: [] }
            });
         }
         setContextMenu(null);
    }
    
    const getStatusText = () => {
        if (partner?.isOnline) return 'Online';
        if (partner?.lastOnline && partner.privacySettings?.showLastOnline !== false) {
            const date = partner.lastOnline.toDate();
            const diff = Date.now() - date.getTime();
            if (diff < 60 * 60 * 1000) {
                return `Last seen ${Math.floor(diff / 60000)}m ago`;
            }
            return `Last seen ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
        return '';
    };

    if (!partner) return <div className="absolute inset-0 bg-white dark:bg-black z-50 flex justify-center items-center"><FlameLoader /></div>;

    return (
        <div 
            className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-black h-[100dvh] w-full max-w-md mx-auto shadow-2xl animate-slide-in-right"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
        >
            {contextMenu && <MessageContextMenu {...contextMenu} onClose={() => setContextMenu(null)} onReact={(emoji) => handleReact(contextMenu.message, emoji)} onRecall={() => handleRecall(contextMenu.message)} onReply={() => { setReplyingTo(contextMenu.message); setContextMenu(null); }} onFavorite={() => handleFavorite(contextMenu.message)} isOwnMessage={contextMenu.message.senderId === currentUser.id} />}
            {isOptionsOpen && <ChatOptionsModal onClose={() => setIsOptionsOpen(false)} onViewProfile={() => { setIsOptionsOpen(false); onViewProfile(partner.id); }} onReport={() => setIsReportOpen(true)} onBlock={handleBlock} onDeleteChat={handleDeleteChat} currentRetention={retentionPolicy} onUpdateRetention={updateRetention} />}
            {isReportOpen && <ReportModal reportedUser={partner} onClose={() => setIsReportOpen(false)} onSubmit={handleReport} />}
            {isGiftModalOpen && <GiftModal onClose={() => setIsGiftModalOpen(false)} currentUser={currentUser} onSendGift={handleSendGift}/>}
            {isCameraOpen && <ChatCamera onClose={() => setIsCameraOpen(false)} onCapture={handleCameraCapture} />}
            
            <header className="flex-shrink-0 flex items-center px-4 py-3 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 backdrop-blur-md sticky top-0 z-20">
                <button onClick={onClose} className="mr-3 text-dark-gray dark:text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => onViewProfile(partner.id)} className="flex-1 flex items-center min-w-0">
                    <div className="relative">
                        <img src={partner.profilePhotos[0]} alt={partner.name} className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-zinc-700" />
                        {partner.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></div>
                        )}
                    </div>
                    <div className="ml-3">
                        <span className="font-bold block text-dark-gray dark:text-gray-100 text-base">{partner.name}</span>
                        <div className="flex items-center">
                            {streak > 0 && (
                                <span className="text-xs font-bold text-flame-orange mr-2 flex items-center">
                                    🔥 {streak}
                                </span>
                            )}
                            <span className="text-xs text-gray-500">
                                {getStatusText()}
                            </span>
                        </div>
                    </div>
                </button>
                <div className="flex items-center space-x-3">
                    <button onClick={() => initiateCall('audio')} className="text-gray-500 dark:text-gray-400 hover:text-flame-orange">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </button>
                    <button onClick={() => initiateCall('video')} className="text-gray-500 dark:text-gray-400 hover:text-flame-orange">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                    <button onClick={() => setIsOptionsOpen(true)} className="text-gray-500 dark:text-gray-400">
                        <MoreVerticalIcon />
                    </button>
                </div>
            </header>

            {/* FIXED: flex-1 and overflow-y-auto ensures scrolling works within the fixed container */}
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
            
            <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 pb-[env(safe-area-inset-bottom)]">
                {replyingTo && <ReplyPreview messageText={replyingTo.text} senderName={replyingTo.senderId === currentUser.id ? 'You' : partner.name} onCancel={() => setReplyingTo(null)} />}
                
                <div className="flex items-end space-x-2 p-2 px-3">
                    <button 
                        onClick={() => setIsCameraOpen(true)}
                        className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <CameraIcon className="w-6 h-6" />
                    </button>
                    
                    <button onClick={() => setIsGiftModalOpen(true)} className="p-2 text-gray-500 hover:text-flame-orange">
                        <GiftIcon className="w-6 h-6" />
                    </button>

                    <div className="flex-1 bg-gray-100 dark:bg-zinc-800 rounded-2xl flex items-center relative">
                        <input type="file" ref={fileInputRef} onChange={handleGallerySelect} className="hidden" accept="image/*,video/*" />
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={isRecording ? `Recording ${recordingDuration}s...` : "Chat"}
                            disabled={isRecording}
                            className={`flex-1 bg-transparent border-none focus:outline-none px-4 py-3 max-h-32 resize-none dark:text-gray-200 text-base ${isRecording ? 'text-red-500 animate-pulse font-bold' : ''}`}
                            rows={1}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        />
                        {!isRecording && !newMessage && (
                             <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <span className="text-2xl">🖼️</span>
                            </button>
                        )}
                    </div>
                    
                    {newMessage || replyingTo ? (
                        <button 
                            onClick={() => handleSendMessage()} 
                            disabled={isSending}
                            className="p-3 bg-flame-orange text-white rounded-full shadow-md hover:scale-105 transition-transform disabled:opacity-50"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-90" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        </button>
                    ) : (
                        <button 
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            onMouseLeave={stopRecording}
                            onTouchStart={startRecording}
                            onTouchEnd={stopRecording}
                            className={`p-3 rounded-full shadow-md transition-all ${isRecording ? 'bg-red-500 scale-125' : 'bg-flame-orange'} text-white touch-none select-none`}
                            style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
                        >
                            <MicIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConversationScreen;
