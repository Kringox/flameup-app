import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { db } from '../firebaseConfig';
import { collection, doc, getDoc, query, onSnapshot, serverTimestamp, setDoc, addDoc, updateDoc, increment } from 'firebase/firestore';

const PLACEHOLDER_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';

const getChatId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
};

interface ConversationScreenProps {
    currentUser: User;
    partnerId: string;
    onClose: () => void;
}

const ConversationScreen: React.FC<ConversationScreenProps> = ({ currentUser, partnerId, onClose }) => {
    const [partner, setPartner] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatId = getChatId(currentUser.id, partnerId);

    useEffect(() => {
        const fetchPartnerData = async () => {
            if (!db) return;
            const userDoc = await getDoc(doc(db, 'users', partnerId));
            if (userDoc.exists()) {
                setPartner({ id: userDoc.id, ...userDoc.data() } as User);
            } else {
                console.error("Chat partner not found");
                onClose();
            }
        };

        fetchPartnerData();
    }, [partnerId, onClose]);
    
    useEffect(() => {
        if (!db) return;

        // Mark messages as read when opening the conversation
        const chatDocRef = doc(db, 'chats', chatId);
        updateDoc(chatDocRef, {
            [`unreadCount.${currentUser.id}`]: 0
        }).catch(err => console.log("No chat document to update yet or permission error. This is okay on first message."));


        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            
            msgs.sort((a, b) => {
                const timeA = a.timestamp?.toMillis() || 0;
                const timeB = b.timestamp?.toMillis() || 0;
                return timeA - timeB;
            });

            setMessages(msgs);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching messages: ", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [chatId, currentUser.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!db || newMessage.trim() === '' || !partner) return;

        const tempMessage = newMessage;
        setNewMessage('');

        const chatDocRef = doc(db, 'chats', chatId);
        const messagesCollectionRef = collection(chatDocRef, 'messages');

        try {
            // Step 1: Create or update the chat document.
            await setDoc(chatDocRef, {
                userIds: [currentUser.id, partner.id],
                users: {
                    [currentUser.id]: {
                        name: currentUser.name,
                        profilePhoto: currentUser.profilePhotos?.[0] || PLACEHOLDER_AVATAR
                    },
                    [partner.id]: {
                        name: partner.name,
                        profilePhoto: partner.profilePhotos?.[0] || PLACEHOLDER_AVATAR
                    }
                },
                lastMessage: {
                    text: tempMessage,
                    senderId: currentUser.id,
                    timestamp: serverTimestamp()
                },
                // Increment unread count for the partner. Initialize if it doesn't exist.
                [`unreadCount.${partner.id}`]: increment(1)
            }, { merge: true });

            // Step 2: Add the new message to the 'messages' subcollection.
            await addDoc(messagesCollectionRef, {
                text: tempMessage,
                senderId: currentUser.id,
                timestamp: serverTimestamp(),
            });

        } catch (error: any) {
            console.error("Error sending message:", error);
            let detailedError = "Could not send message. Please try again.";
            if (error.code === 'permission-denied') {
                detailedError = "PERMISSION DENIED: Your Firestore Security Rules are blocking this message.\n\nFIX: Go to Firebase -> Firestore -> Rules and ensure your rule for `match /chats/{chatId}` includes `allow update: if request.auth.uid in resource.data.userIds;`";
            }
            alert(detailedError);
            setNewMessage(tempMessage);
        }
    };

    if (isLoading || !partner) {
        return (
            <div className="w-full h-full flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-white flex flex-col">
            {/* Header */}
            <header className="flex items-center p-3 border-b border-gray-200 flex-shrink-0">
                <button onClick={onClose} className="p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <img src={partner.profilePhotos?.[0] || PLACEHOLDER_AVATAR} alt={partner.name} className="w-10 h-10 rounded-full object-cover ml-2"/>
                <span className="ml-3 font-semibold text-lg">{partner.name}</span>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {messages.map(msg => {
                    const isSentByCurrentUser = msg.senderId === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex ${isSentByCurrentUser ? 'justify-end' : 'justify-start'} mb-3`}>
                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${isSentByCurrentUser ? 'bg-flame-orange text-white rounded-br-lg' : 'bg-gray-200 text-dark-gray rounded-bl-lg'}`}>
                                <p>{msg.text}</p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <footer className="p-2 border-t border-gray-200 bg-white">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-flame-orange"
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button onClick={handleSendMessage} className="bg-flame-orange text-white rounded-full p-3 disabled:opacity-50" disabled={!newMessage.trim()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default ConversationScreen;