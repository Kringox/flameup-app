
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment, arrayUnion, getDocs, limit, setDoc, Timestamp } from 'firebase/firestore';
import { User, Message, Chat, Gift, RetentionPolicy } from '../types.ts';
import MoreVerticalIcon from '../components/icons/MoreVerticalIcon.tsx';
import GiftIcon from '../components/icons/GiftIcon.tsx';
import CameraIcon from '../components/icons/CameraIcon.tsx';
import FlameIcon from '../components/icons/FlameIcon.tsx';
import ChatOptionsModal from '../components/ChatOptionsModal.tsx';
import ReportModal from '../components/ReportModal.tsx';
import GiftModal from '../components/GiftModal.tsx';
import FlameLoader from '../components/FlameLoader.tsx';
import ViewOnceMedia from '../components/ViewOnceMedia.tsx';
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

const MessageBubble: React.FC<{ message: Message, isOwnMessage: boolean, onLongPress: (e: React.MouseEvent, msg: Message) => void, onViewMedia: (msgId: string) => void }> = ({ message, isOwnMessage, onLongPress, onViewMedia }) => {
    // Determine bubble styling
    const isMedia = !!message.mediaUrl;
    const isViewOnce = !!message.isViewOnce;
    
    const bubbleClass = isOwnMessage 
        ? 'bg-flame-orange text-white self-end rounded-2xl rounded-tr-sm' 
        : 'bg-white dark:bg-zinc-800 text-dark-gray dark:text-gray-200 self-start rounded-2xl rounded-tl-sm border border-gray-100 dark:border-zinc-700 shadow-sm';
    
    // Check if viewed
    const viewed = !!message.viewedAt;

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
        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} my-0.5 group`}>
            <div onContextMenu={(e) => onLongPress(e, message)} className={`relative max-w-[75%] md:max-w-[60%] ${isMedia && !isViewOnce ? 'p-1' : 'px-4 py-2'} ${bubbleClass}`}>
                {message.replyTo && (
                    <div className={`p-2 rounded-lg mb-1 text-xs border-l-2 ${isOwnMessage ? 'bg-black/10 border-white/50' : 'bg-gray-100 dark:bg-zinc-700 border-flame-orange'}`}>
                        <p className="font-bold opacity-80">{message.replyTo.senderName}</p>
                        <p className="opacity-70 truncate">{message.replyTo.text || 'Media'}</p>
                    </div>
                )}
                
                {isMedia ? (
                    isViewOnce ? (
                        <ViewOnceMedia 
                            mediaUrl={message.mediaUrl!} 
                            mediaType={message.mediaType || 'image'} 
                            isSender={isOwnMessage}
                            viewed={viewed}
                            onView={() => onViewMedia(message.id)}
                        />
                    ) : (
                        <div className="rounded-xl overflow-hidden">
                             {message.mediaType === 'video' ? (
                                 <video src={message.mediaUrl} controls className="max-h-64 w-full object-cover" />
                             ) : (
                                 <img src={message.mediaUrl} alt="sent media" className="max-h-64 w-full object-cover" />
                             )}
                             {message.text && <p className={`mt-2 text-sm px-2 pb-1 ${isOwnMessage ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>{message.text}</p>}
                        </div>
                    )
                ) : (
                    <p className="text-[15px] leading-relaxed break-words">{message.text}</p>
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
    
    // Adjust position to stay on screen
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
    
    // Media States
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [isViewOnce, setIsViewOnce] = useState(false);
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
    
    // Client-side filtering logic for retention
    useEffect(() => {
        if (!messages.length) {
            setFilteredMessages([]);
            return;
        }

        const now = Date.now();
        const validMessages = messages.filter(msg => {
            // Recalled messages are usually kept as placeholders
            if (msg.isRecalled) return true;

            // Retention: 5 minutes
            if (retentionPolicy === '5min') {
                if (!msg.timestamp) return true; // optimistic update case
                const msgTime = msg.timestamp.toDate().getTime();
                return (now - msgTime) < 5 * 60 * 1000;
            }

            // Retention: Read (Simple Implementation: Hide if viewedAt is set and msg is older than 10s to allow viewing animation)
            // Or strict: Hide immediately if viewed.
            // In Snapchat, they disappear after navigating away. Here we can simulate it.
            // For now, we only hide View Once media that has been viewed.
            // Text messages with "delete after read" policy requires complex "seen" logic per message.
            // We'll stick to '5min' being the main auto-delete for text, and 'viewOnce' for media.
            
            return true;
        });
        
        setFilteredMessages(validMessages);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    }, [messages, retentionPolicy]);

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
            createdAt: serverTimestamp()
        };
        const newChatRef = doc(collection(db, 'chats'));
        await setDoc(newChatRef, newChatData);
        setChatId(newChatRef.id);
        return newChatRef.id;
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setMediaFile(file);
            setMediaPreview(URL.createObjectURL(file));
        }
    };

    const clearMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        setIsViewOnce(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    const handleSendMessage = async () => {
        if ((!newMessage.trim() && !mediaFile) || !db || !partner || isSending) return;
        setIsSending(true);
        
        const text = newMessage.trim();
        const replyContext = replyingTo ? { messageId: replyingTo.id, senderName: replyingTo.senderId === currentUser.id ? currentUser.name : partner.name, text: replyingTo.text || 'Media' } : null;
        
        // Reset UI immediately
        setNewMessage('');
        setReplyingTo(null);
        const currentMediaFile = mediaFile;
        const currentIsViewOnce = isViewOnce;
        clearMedia();

        try {
            const currentChatId = await getOrCreateChat();
            let mediaUrl = '';
            let mediaType: 'image' | 'video' | undefined;

            if (currentMediaFile) {
                const urls = await uploadPhotos([currentMediaFile]);
                mediaUrl = urls[0];
                mediaType = currentMediaFile.type.startsWith('video') ? 'video' : 'image';
            }

            const messagePayload: any = {
                chatId: currentChatId,
                senderId: currentUser.id,
                text,
                timestamp: serverTimestamp(),
                mediaUrl: mediaUrl || null,
                mediaType: mediaType || null,
                isViewOnce: currentIsViewOnce
            };
            
            if (replyContext) messagePayload.replyTo = replyContext;
            
            await addDoc(collection(db, 'chats', currentChatId, 'messages'), messagePayload);
            
            // Update last message
            let lastMsgText = text;
            if (mediaUrl) lastMsgText = currentIsViewOnce ? '📷 View Once Media' : '📷 Media';

            await updateDoc(doc(db, 'chats', currentChatId), {
                lastMessage: { text: lastMsgText, senderId: currentUser.id, timestamp: serverTimestamp() },
                [`unreadCount.${partnerId}`]: increment(1)
            });

        } catch (error) {
            console.error("Error sending:", error);
        } finally {
            setIsSending(false);
        }
    };
    
    // View Once Logic
    const handleViewMedia = async (msgId: string) => {
        if (!chatId || !db) return;
        // Optimistic update locally? 
        // Real implementation relies on Firestore update
        const msgRef = doc(db, 'chats', chatId, 'messages', msgId);
        await updateDoc(msgRef, {
            viewedAt: serverTimestamp()
        });
    };

    // Chat Settings
    const updateRetention = async (policy: RetentionPolicy) => {
        if (!chatId || !db) return;
        setRetentionPolicy(policy); // Optimistic
        await updateDoc(doc(db, 'chats', chatId), { retentionPolicy: policy });
    };

    // ... Standard actions (Gift, Block, Report, Delete, Recall, React) ...
    const handleSendGift = async (gift: Gift) => { /* Same as before but adapted */
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
                [`unreadCount.${partnerId}`]: increment(1) 
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
            
            {/* Header */}
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-2 bg-[#efeae2] dark:bg-black/50">
                {filteredMessages.map(msg => (
                    <MessageBubble 
                        key={msg.id} 
                        message={msg} 
                        isOwnMessage={msg.senderId === currentUser.id} 
                        onLongPress={(e, m) => { e.preventDefault(); setContextMenu({ message: m, position: { x: e.clientX, y: e.clientY } }); }}
                        onViewMedia={handleViewMedia}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>
            
            {/* Input Area */}
            <div className="bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800">
                {replyingTo && <ReplyPreview messageText={replyingTo.text} senderName={replyingTo.senderId === currentUser.id ? 'You' : partner.name} onCancel={() => setReplyingTo(null)} />}
                
                {mediaPreview && (
                    <div className="p-2 px-4 flex items-center justify-between bg-gray-100 dark:bg-zinc-800">
                        <div className="flex items-center overflow-hidden">
                             <img src={mediaPreview} alt="preview" className="h-12 w-12 object-cover rounded-md mr-3 border border-gray-300 dark:border-zinc-600" />
                             <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Attached Media</span>
                        </div>
                        <button onClick={clearMedia} className="bg-gray-200 dark:bg-zinc-600 rounded-full p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                )}

                <div className="p-2 flex items-end space-x-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*" />
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className={`p-3 rounded-full transition-colors ${mediaPreview ? 'bg-flame-orange text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400'}`}
                    >
                        <CameraIcon className="w-6 h-6" />
                    </button>

                    <div className="flex-1 bg-gray-100 dark:bg-zinc-800 rounded-2xl flex items-center p-1 pr-2">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Message..."
                            className="flex-1 bg-transparent border-none focus:outline-none px-3 py-2.5 max-h-32 resize-none dark:text-gray-200 text-sm"
                            rows={1}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        />
                        {mediaPreview && (
                            <button 
                                onClick={() => setIsViewOnce(!isViewOnce)} 
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-colors ${isViewOnce ? 'bg-flame-orange border-flame-orange text-white' : 'border-gray-400 text-gray-400'}`}
                            >
                                1
                            </button>
                        )}
                    </div>

                    <button 
                        onClick={handleSendMessage} 
                        disabled={(!newMessage.trim() && !mediaFile) || isSending} 
                        className={`p-3 rounded-full transition-all ${(!newMessage.trim() && !mediaFile) ? 'bg-gray-200 dark:bg-zinc-800 text-gray-400' : 'bg-flame-orange text-white shadow-md transform hover:scale-105'}`}
                    >
                        {isSending ? (
                             <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        ) : (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-0.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConversationScreen;
