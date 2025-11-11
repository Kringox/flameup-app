import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, writeBatch, increment, arrayUnion, getDocs, limit, setDoc, Timestamp, arrayRemove } from 'firebase/firestore';
import { User, Message, Chat, Gift } from '../types.ts';
import MoreVerticalIcon from '../components/icons/MoreVerticalIcon.tsx';
import GiftIcon from '../components/icons/GiftIcon.tsx';
import ChatOptionsModal from '../components/ChatOptionsModal.tsx';
import ReportModal from '../components/ReportModal.tsx';
import GiftModal from '../components/GiftModal.tsx';
import FlameLoader from '../components/FlameLoader.tsx';
import { useI18n } from '../contexts/I18nContext.ts';

const REACTION_EMOJIS = ['🔥', '❤️', '😂', '😮', '👍', '😢'];

const ReplyPreview: React.FC<{ messageText: string, senderName: string, onCancel: () => void }> = ({ messageText, senderName, onCancel }) => {
    const { t } = useI18n();
    return (
        <div className="p-2 border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 flex justify-between items-center">
            <div className="text-xs text-gray-600 dark:text-gray-400 overflow-hidden">
                <p className="font-semibold">{t('replyingTo')} {senderName}</p>
                <p className="italic truncate">{messageText}</p>
            </div>
            <button onClick={onCancel} className="p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
};

const MessageBubble: React.FC<{ message: Message, isOwnMessage: boolean, onLongPress: (e: React.MouseEvent, msg: Message) => void }> = ({ message, isOwnMessage, onLongPress }) => {
    const bubbleClass = isOwnMessage ? 'bg-flame-orange text-white self-end rounded-br-none' : 'bg-gray-200 dark:bg-zinc-700 text-dark-gray dark:text-gray-200 self-start rounded-bl-none';
    
    if (message.isRecalled) {
        return (
             <div className="p-3 rounded-2xl max-w-xs md:max-w-md bg-gray-100 dark:bg-zinc-800 self-center text-center text-sm italic text-gray-500 dark:text-gray-400">
                Message recalled
            </div>
        )
    }

    if (message.gift) {
        return (
             <div onContextMenu={(e) => onLongPress(e, message)} className={`p-3 rounded-2xl max-w-xs md:max-w-md text-center flex flex-col items-center ${bubbleClass}`}>
                <span className="text-4xl">{message.gift.icon}</span>
                <p className="font-semibold mt-1">Sent a {message.gift.name}</p>
            </div>
        )
    }
    
    // FIX: Use a type guard with filter to correctly type the 'reactions' array, ensuring 'userIds' is recognized as a string array in subsequent operations.
    const reactions = message.reactions && Object.entries(message.reactions).filter(
        (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0
    );
    
    return (
        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
            <div onContextMenu={(e) => onLongPress(e, message)} className={`p-3 rounded-2xl max-w-xs md:max-w-md relative ${bubbleClass}`}>
                {message.replyTo && (
                    <div className="p-2 bg-black/10 dark:bg-white/10 rounded-lg mb-1 text-sm">
                        <p className="font-bold">{message.replyTo.senderName}</p>
                        <p className="opacity-80 truncate">{message.replyTo.text}</p>
                    </div>
                )}
                {message.text}
            </div>
             {reactions && reactions.length > 0 && (
                <div className="flex space-x-1 mt-1">
                    {reactions.map(([emoji, userIds]) => (
                        <div key={emoji} className="px-2 py-0.5 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-full flex items-center shadow-sm">
                            <span className="text-sm">{emoji}</span>
                            <span className="text-xs ml-1 font-semibold text-gray-700 dark:text-gray-300">{userIds.length}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const MessageContextMenu: React.FC<{ message: Message; position: { x: number; y: number }; onClose: () => void; onReply: () => void; onReact: (emoji: string) => void; onRecall: () => void; isOwnMessage: boolean }> = ({ message, position, onClose, onReply, onReact, onRecall, isOwnMessage }) => {
    const isRecallable = isOwnMessage && message.timestamp && (Date.now() - message.timestamp.toDate().getTime()) < 5 * 60 * 1000;
    
    return (
        <>
            <div className="fixed inset-0 z-[90]" onClick={onClose} />
            <div style={{ top: position.y, left: position.x }} className="fixed bg-white dark:bg-zinc-800 rounded-lg shadow-2xl z-[100] animate-fade-in-fast overflow-hidden">
                <div className="flex p-2 space-x-2 border-b dark:border-zinc-700">
                    {REACTION_EMOJIS.map(emoji => (
                        <button key={emoji} onClick={() => onReact(emoji)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 text-2xl transition-transform hover:scale-125">
                            {emoji}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col text-sm font-semibold">
                    <button onClick={onReply} className="p-3 text-left hover:bg-gray-100 dark:hover:bg-zinc-700 dark:text-gray-200">Reply</button>
                    {isRecallable && <button onClick={onRecall} className="p-3 text-left text-error-red hover:bg-gray-100 dark:hover:bg-zinc-700">Recall</button>}
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
    const [newMessage, setNewMessage] = useState('');
    const [chatId, setChatId] = useState<string | null>(null);
    const [partner, setPartner] = useState<User | null>(null);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [contextMenu, setContextMenu] = useState<{ message: Message; position: { x: number; y: number } } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!db) return;
        const userIds = [currentUser.id, partnerId].sort();
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('userIds', '==', userIds));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (!snapshot.empty) {
                const chatDoc = snapshot.docs[0];
                const foundChatId = chatDoc.id;
                setChatId(foundChatId);

                const chatData = chatDoc.data() as Chat;
                if ((chatData.unreadCount?.[currentUser.id] || 0) > 0) {
                    await updateDoc(doc(db, 'chats', foundChatId), {
                        [`unreadCount.${currentUser.id}`]: 0
                    });
                }
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
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp } as Message));
            setMessages(msgs);
        });
        return () => unsubscribe();
    }, [chatId]);

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

        const newChatData: Omit<Chat, 'id'> = {
            userIds,
            users: {
                [currentUser.id]: { name: currentUser.name, profilePhoto: currentUser.profilePhotos[0] },
                [partner.id]: { name: partner.name, profilePhoto: partner.profilePhotos[0] }
            },
        };
        const newChatRef = doc(collection(db, 'chats'));
        await setDoc(newChatRef, newChatData);
        setChatId(newChatRef.id);
        return newChatRef.id;
    };

    const handleSendMessage = async () => {
        if (newMessage.trim() === '' || !db || !partner || isSending) return;
        setIsSending(true);
        const text = newMessage.trim();
        const replyContext = replyingTo ? { messageId: replyingTo.id, senderName: replyingTo.senderId === currentUser.id ? currentUser.name : partner.name, text: replyingTo.text } : null;
        setNewMessage('');
        setReplyingTo(null);

        try {
            const currentChatId = await getOrCreateChat();
            const messageRef = collection(db, 'chats', currentChatId, 'messages');
            const messagePayload: any = {
                chatId: currentChatId,
                senderId: currentUser.id,
                text,
                timestamp: serverTimestamp()
            };
            if(replyContext) {
                messagePayload.replyTo = replyContext;
            }
            
            const chatRef = doc(db, 'chats', currentChatId);
            const chatPayload = {
                lastMessage: { text, senderId: currentUser.id, timestamp: serverTimestamp() },
                [`unreadCount.${partnerId}`]: increment(1)
            };

            await Promise.all([
                addDoc(messageRef, messagePayload),
                updateDoc(chatRef, chatPayload)
            ]);

        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message.");
        } finally {
            setIsSending(false);
        }
    };
    
    const handleSendGift = async (gift: Gift) => {
        const currentCoins = Number(currentUser.coins) || 0;
        if (!db || !partner || isSending || currentCoins < gift.cost) {
            if (currentCoins < gift.cost) alert("Not enough coins.");
            return;
        }
        setIsSending(true);
        setIsGiftModalOpen(false);
        
        try {
            const currentChatId = await getOrCreateChat();
            const userRef = doc(db, 'users', currentUser.id);
            await updateDoc(userRef, { coins: increment(-gift.cost) });
            onUpdateUser({...currentUser, coins: (currentCoins - gift.cost) }); 

            await addDoc(collection(db, 'chats', currentChatId, 'messages'), { 
                chatId: currentChatId, 
                senderId: currentUser.id, 
                gift, 
                timestamp: serverTimestamp() 
            });

            const chatRef = doc(db, 'chats', currentChatId);
            await updateDoc(chatRef, { 
                lastMessage: { text: `${gift.icon} ${gift.name}`, senderId: currentUser.id, timestamp: serverTimestamp() }, 
                [`unreadCount.${partnerId}`]: increment(1) 
            });

        } catch(error) {
            console.error("Error sending gift:", error);
            onUpdateUser(currentUser); 
            alert("Could not send gift. Please try again.");
        } finally {
            setIsSending(false);
        }
    };

    const handleBlock = async () => {
        if(!db || !partner) return;
        await updateDoc(doc(db, 'users', currentUser.id), {
            blockedUsers: arrayUnion(partner.id)
        });
        onClose();
    };
    
    const handleDeleteChat = async () => {
        if (!chatId || !db) return;
        if (window.confirm("Delete this chat? It will only be removed for you.")) {
             await updateDoc(doc(db, 'chats', chatId), {
                deletedFor: arrayUnion(currentUser.id)
            });
            onClose();
        }
    }

    const handleReport = async (reason: string, details: string) => {
        if(!db || !partner) return;
        await addDoc(collection(db, 'reports'), {
            reportedUserId: partner.id,
            reportingUserId: currentUser.id,
            reason,
            details,
            timestamp: serverTimestamp()
        });
        setIsReportOpen(false);
        setIsOptionsOpen(false);
        alert('Report submitted. Thank you.');
    };
    
    const handleLongPress = (e: React.MouseEvent, message: Message) => {
        e.preventDefault();
        setContextMenu({ message, position: { x: e.clientX, y: e.clientY } });
    };

    const handleReact = async (message: Message, emoji: string) => {
        if (!chatId || !db) return;
        const messageRef = doc(db, 'chats', chatId, 'messages', message.id);
        const currentReactions = message.reactions || {};
        const usersForEmoji = currentReactions[emoji] || [];
        const isReacted = usersForEmoji.includes(currentUser.id);

        const newReactions = { ...currentReactions };
        if (isReacted) {
            newReactions[emoji] = usersForEmoji.filter(id => id !== currentUser.id);
        } else {
            newReactions[emoji] = [...usersForEmoji, currentUser.id];
        }

        await updateDoc(messageRef, { reactions: newReactions });
        setContextMenu(null);
    };
    
    const handleRecall = async (message: Message) => {
         if (!chatId || !db) return;
         if (window.confirm("Recall this message?")) {
            const messageRef = doc(db, 'chats', chatId, 'messages', message.id);
            await updateDoc(messageRef, { isRecalled: true, text: '' });
         }
         setContextMenu(null);
    }

    if (!partner) {
        return <div className="absolute inset-0 bg-white dark:bg-black z-50 flex justify-center items-center"><FlameLoader /></div>;
    }

    const replySenderName = replyingTo ? (replyingTo.senderId === currentUser.id ? currentUser.name : partner.name) : '';

    return (
        <div className="absolute inset-0 bg-white dark:bg-black z-50 flex flex-col animate-slide-in-right">
            {contextMenu && <MessageContextMenu {...contextMenu} onClose={() => setContextMenu(null)} onReact={(emoji) => handleReact(contextMenu.message, emoji)} onRecall={() => handleRecall(contextMenu.message)} onReply={() => { setReplyingTo(contextMenu.message); setContextMenu(null); }} isOwnMessage={contextMenu.message.senderId === currentUser.id} />}
            {isOptionsOpen && <ChatOptionsModal onClose={() => setIsOptionsOpen(false)} onViewProfile={() => { setIsOptionsOpen(false); onViewProfile(partner.id); }} onReport={() => setIsReportOpen(true)} onBlock={handleBlock} onDeleteChat={handleDeleteChat} />}
            {isReportOpen && partner && <ReportModal reportedUser={partner} onClose={() => setIsReportOpen(false)} onSubmit={handleReport} />}
            {isGiftModalOpen && <GiftModal onClose={() => setIsGiftModalOpen(false)} currentUser={currentUser} onSendGift={handleSendGift}/>}
            <header className="flex items-center p-3 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <button onClick={onClose} className="w-8 text-dark-gray dark:text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => onViewProfile(partner.id)} className="flex-1 flex items-center min-w-0">
                    <img src={partner.profilePhotos[0]} alt={partner.name} className="w-10 h-10 rounded-full" />
                    <span className="font-bold ml-3 truncate text-dark-gray dark:text-gray-200">{partner.name}</span>
                </button>
                <button onClick={() => setIsOptionsOpen(true)} className="w-8 text-dark-gray dark:text-gray-200">
                    <MoreVerticalIcon />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
                {messages.map(msg => <MessageBubble key={msg.id} message={msg} isOwnMessage={msg.senderId === currentUser.id} onLongPress={handleLongPress} />)}
                <div ref={messagesEndRef} />
            </div>
            
            <div>
                 {replyingTo && <ReplyPreview messageText={replyingTo.text} senderName={replySenderName} onCancel={() => setReplyingTo(null)} />}
                <div className="p-2 border-t border-gray-200 dark:border-zinc-800 flex items-center space-x-2 bg-white dark:bg-zinc-900">
                    <button onClick={() => setIsGiftModalOpen(true)} className="p-2 text-gray-500 dark:text-gray-400">
                        <GiftIcon className="w-6 h-6" />
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 p-2 bg-gray-100 dark:bg-zinc-800 rounded-full focus:outline-none px-4 text-dark-gray dark:text-gray-200"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button onClick={handleSendMessage} disabled={!newMessage.trim() || isSending} className="font-bold text-flame-orange disabled:opacity-50">
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConversationScreen;