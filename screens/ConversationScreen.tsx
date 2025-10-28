import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, writeBatch, increment } from 'firebase/firestore';
// FIX: Added file extension to types import
import { User, Message, Chat } from '../types.ts';
// FIX: Added file extensions to icon imports
import MoreVerticalIcon from '../components/icons/MoreVerticalIcon.tsx';
import GiftIcon from '../components/icons/GiftIcon.tsx';

const MessageBubble: React.FC<{ message: Message, isOwnMessage: boolean }> = ({ message, isOwnMessage }) => {
    const bubbleClass = isOwnMessage ? 'bg-flame-orange text-white self-end rounded-br-none' : 'bg-gray-200 text-dark-gray self-start rounded-bl-none';
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

                // Mark messages as read
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
        if (!chatId || !db) return;
        const messagesQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);
        });
        return () => unsubscribe();
    }, [chatId]);

    const handleSendMessage = async () => {
        if (newMessage.trim() === '' || !db || !partner) return;

        const text = newMessage.trim();
        setNewMessage('');

        try {
            const userIds = [currentUser.id, partnerId].sort();
            let currentChatId = chatId;
            const batch = writeBatch(db);

            // If chat doesn't exist, create it
            if (!currentChatId) {
                const newChatRef = doc(collection(db, 'chats'));
                batch.set(newChatRef, {
                    userIds,
                    users: {
                        [currentUser.id]: { name: currentUser.name, profilePhoto: currentUser.profilePhotos[0] },
                        [partner.id]: { name: partner.name, profilePhoto: partner.profilePhotos[0] }
                    },
                    unreadCount: { [currentUser.id]: 0, [partner.id]: 1 },
                    lastMessage: { text, senderId: currentUser.id, timestamp: serverTimestamp() }
                });
                currentChatId = newChatRef.id;
                setChatId(currentChatId);

                const messageRef = doc(collection(db, 'chats', currentChatId, 'messages'));
                batch.set(messageRef, {
                    chatId: currentChatId,
                    senderId: currentUser.id,
                    text,
                    timestamp: serverTimestamp()
                });
            } else {
                 // Add new message
                const messageRef = doc(collection(db, 'chats', currentChatId, 'messages'));
                batch.set(messageRef, {
                    chatId: currentChatId,
                    senderId: currentUser.id,
                    text,
                    timestamp: serverTimestamp()
                });

                // Update last message and unread count on chat document
                const chatRef = doc(db, 'chats', currentChatId);
                batch.update(chatRef, {
                    lastMessage: { text, senderId: currentUser.id, timestamp: serverTimestamp() },
                    [`unreadCount.${partnerId}`]: increment(1)
                });
            }

            await batch.commit();

        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    if (!partner) {
        return <div className="absolute inset-0 bg-white z-50 flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;
    }

    return (
        <div className="absolute inset-0 bg-white z-50 flex flex-col">
            <header className="flex items-center p-3 border-b border-gray-200">
                <button onClick={onClose} className="w-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => onViewProfile(partner.id)} className="flex-1 flex items-center min-w-0">
                    <img src={partner.profilePhotos[0]} alt={partner.name} className="w-10 h-10 rounded-full" />
                    <span className="font-bold ml-3 truncate">{partner.name}</span>
                </button>
                <button className="w-8">
                    <MoreVerticalIcon />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
                {messages.map(msg => <MessageBubble key={msg.id} message={msg} isOwnMessage={msg.senderId === currentUser.id} />)}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-2 border-t border-gray-200 flex items-center space-x-2">
                <button className="p-2 text-gray-500">
                    <GiftIcon className="w-6 h-6" />
                </button>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 p-2 bg-gray-100 rounded-full focus:outline-none px-4"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button onClick={handleSendMessage} disabled={!newMessage.trim()} className="font-bold text-flame-orange disabled:opacity-50">
                    Send
                </button>
            </div>
        </div>
    );
};

export default ConversationScreen;
