
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
// FIX: Import 'limit' from 'firebase/firestore' to resolve 'Cannot find name' error.
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, writeBatch, increment, arrayUnion, getDocs, limit, setDoc, Timestamp } from 'firebase/firestore';
// FIX: Added file extension to types import
import { User, Message, Chat, Gift } from '../types.ts';
// FIX: Added file extensions to icon imports
import MoreVerticalIcon from '../components/icons/MoreVerticalIcon.tsx';
import GiftIcon from '../components/icons/GiftIcon.tsx';
import ChatOptionsModal from '../components/ChatOptionsModal.tsx';
import ReportModal from '../components/ReportModal.tsx';
import GiftModal from '../components/GiftModal.tsx';
// FIX: Import FlameLoader component to resolve 'Cannot find name' error.
import FlameLoader from '../components/FlameLoader.tsx';

const MessageBubble: React.FC<{ message: Message, isOwnMessage: boolean }> = ({ message, isOwnMessage }) => {
    const bubbleClass = isOwnMessage ? 'bg-flame-orange text-white self-end rounded-br-none' : 'bg-gray-200 dark:bg-zinc-700 text-dark-gray dark:text-gray-200 self-start rounded-bl-none';
    
    if (message.gift) {
        return (
             <div className={`p-3 rounded-2xl max-w-xs md:max-w-md text-center flex flex-col items-center ${bubbleClass}`}>
                <span className="text-4xl">{message.gift.icon}</span>
                <p className="font-semibold mt-1">Sent a {message.gift.name}</p>
            </div>
        )
    }
    
    return (
        <div className={`p-3 rounded-2xl max-w-xs md:max-w-md ${bubbleClass}`}>
            {message.text}
        </div>
    );
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
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);
        });
        return () => unsubscribe();
    }, [chatId]);

    const getOrCreateChat = async (): Promise<string> => {
        if (chatId) return chatId;

        // Check if chat exists again to prevent race conditions
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

        // Create new chat
        const newChatData: Omit<Chat, 'id'> = {
            userIds,
            users: {
                [currentUser.id]: { name: currentUser.name, profilePhoto: currentUser.profilePhotos[0] },
                [partner.id]: { name: partner.name, profilePhoto: partner.profilePhotos[0] }
            },
            unreadCount: { [currentUser.id]: 0, [partner.id]: 0 },
            deletedFor: [],
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
        setNewMessage('');

        try {
            const currentChatId = await getOrCreateChat();

            // Optimistic UI update
            const tempMessage: Message = {
                id: `temp-${Date.now()}`,
                chatId: currentChatId,
                senderId: currentUser.id,
                text,
                timestamp: Timestamp.now(),
            };
            setMessages(prev => [...prev, tempMessage]);
            
            // First, add the message document
            const messageRef = collection(db, 'chats', currentChatId, 'messages');
            await addDoc(messageRef, {
                chatId: currentChatId,
                senderId: currentUser.id,
                text,
                timestamp: serverTimestamp()
            });

            // Then, update the parent chat document
            const chatRef = doc(db, 'chats', currentChatId);
            await updateDoc(chatRef, {
                lastMessage: { text, senderId: currentUser.id, timestamp: serverTimestamp() },
                [`unreadCount.${partnerId}`]: increment(1)
            });

        } catch (error) {
            console.error("Error sending message:", error);
            setNewMessage(text); // Restore message on error
            setMessages(prev => prev.filter(m => !m.id.startsWith('temp-'))); // Remove optimistic message
        } finally {
            setIsSending(false);
        }
    };
    
    const handleSendGift = async (gift: Gift) => {
        if (!db || !partner || isSending || currentUser.coins < gift.cost) {
            if(currentUser.coins < gift.cost) alert("Not enough coins.");
            return;
        }
        setIsSending(true);
        setIsGiftModalOpen(false);
        
        try {
            const currentChatId = await getOrCreateChat();
            const newCoinTotal = currentUser.coins - gift.cost;

            // 1. Debit the user's coins. This can be done first.
            const userRef = doc(db, 'users', currentUser.id);
            await updateDoc(userRef, { coins: increment(-gift.cost) });
            onUpdateUser({...currentUser, coins: newCoinTotal }); // Optimistic update

            // 2. Add the gift message.
            await addDoc(collection(db, 'chats', currentChatId, 'messages'), { 
                chatId: currentChatId, 
                senderId: currentUser.id, 
                gift, 
                timestamp: serverTimestamp() 
            });

            // 3. Update the chat document.
            const chatRef = doc(db, 'chats', currentChatId);
            await updateDoc(chatRef, { 
                lastMessage: { text: `${gift.icon} ${gift.name}`, senderId: currentUser.id, timestamp: serverTimestamp() }, 
                [`unreadCount.${partnerId}`]: increment(1) 
            });

        } catch(error) {
            console.error("Error sending gift:", error);
            // Rollback the optimistic update if something fails later
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

    if (!partner) {
        return <div className="absolute inset-0 bg-white z-50 flex justify-center items-center"><FlameLoader /></div>;
    }

    return (
        <div className="absolute inset-0 bg-white dark:bg-black z-50 flex flex-col animate-slide-in-right">
            {isOptionsOpen && <ChatOptionsModal onClose={() => setIsOptionsOpen(false)} onViewProfile={() => { setIsOptionsOpen(false); onViewProfile(partner.id); }} onReport={() => setIsReportOpen(true)} onBlock={handleBlock} />}
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
                {messages.map(msg => <MessageBubble key={msg.id} message={msg} isOwnMessage={msg.senderId === currentUser.id} />)}
                <div ref={messagesEndRef} />
            </div>

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
    );
};

export default ConversationScreen;
