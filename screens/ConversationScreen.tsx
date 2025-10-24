import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { db } from '../firebaseConfig';
import { collection, doc, getDoc, query, onSnapshot, serverTimestamp, setDoc, addDoc, runTransaction, Timestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import GiftIcon from '../components/icons/GiftIcon';
import MoreVerticalIcon from '../components/icons/MoreVerticalIcon';
import VerifiedIcon from '../components/icons/VerifiedIcon';

const PLACEHOLDER_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';

const getChatId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
};

const GIFTS = [
    { name: 'Rose', cost: 1, icon: '🌹' },
    { name: 'Teddy', cost: 5, icon: '🧸' },
    { name: 'Heart', cost: 10, icon: '❤️' },
    { name: 'Ring', cost: 50, icon: '💍' },
] as const;


interface ConversationScreenProps {
    currentUser: User;
    partnerId: string;
    onClose: () => void;
    onUpdateUser: (user: User) => void;
    onViewProfile: (userId: string) => void;
}

const ConversationScreen: React.FC<ConversationScreenProps> = ({ currentUser, partnerId, onClose, onUpdateUser, onViewProfile }) => {
    const [partner, setPartner] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showGifts, setShowGifts] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
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
        runTransaction(db, async (transaction) => {
            const chatDoc = await transaction.get(chatDocRef);
            if (chatDoc.exists()) {
                const currentUnreadCount = chatDoc.data().unreadCount?.[currentUser.id] || 0;
                if (currentUnreadCount > 0) {
                    const unreadCountKey = `unreadCount.${currentUser.id}`;
                    transaction.update(chatDocRef, { [unreadCountKey]: 0 });
                }
            }
        }).catch(err => console.log("Transaction to reset unread count failed. This is okay if the chat is new.", err));


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
            // First, add the new message to the subcollection.
            await addDoc(messagesCollectionRef, {
                text: tempMessage,
                senderId: currentUser.id,
                timestamp: serverTimestamp(),
            });
    
            // Then, update the parent chat document for chat list metadata.
            const chatDoc = await getDoc(chatDocRef);
            const lastMessagePayload = {
                text: tempMessage,
                senderId: currentUser.id,
                timestamp: Timestamp.now() // Use client timestamp for the payload
            };
    
            if (!chatDoc.exists()) {
                // If chat doesn't exist, create it.
                await setDoc(chatDocRef, {
                    userIds: [currentUser.id, partner.id],
                    users: {
                        [currentUser.id]: { name: currentUser.name, profilePhoto: currentUser.profilePhotos?.[0] || PLACEHOLDER_AVATAR, isPremium: currentUser.isPremium },
                        [partner.id]: { name: partner.name, profilePhoto: partner.profilePhotos?.[0] || PLACEHOLDER_AVATAR, isPremium: partner.isPremium }
                    },
                    lastMessage: lastMessagePayload,
                    unreadCount: { [partner.id]: 1, [currentUser.id]: 0 }
                });
            } else {
                // If chat exists, update it using set with merge to avoid 'update' permission issues.
                const currentUnread = chatDoc.data().unreadCount?.[partner.id] || 0;
                const newUnreadCount = { ...chatDoc.data().unreadCount, [partner.id]: currentUnread + 1 };
                
                await setDoc(chatDocRef, {
                    lastMessage: lastMessagePayload,
                    unreadCount: newUnreadCount
                }, { merge: true });
            }
    
        } catch (error: any) {
            console.error("Error sending message:", error);
            let detailedError = "Could not send message. Please try again.";
            if (error.code === 'permission-denied') {
                detailedError = "PERMISSION DENIED: Your Firestore Security Rules are blocking this message.\n\nFIX: Go to Firebase -> Firestore -> Rules and ensure your rule for `match /chats/{chatId}` includes `allow write: if request.auth.uid in resource.data.userIds;`";
            }
            alert(detailedError);
            setNewMessage(tempMessage); // Restore message on failure
        }
    };

    const handleSendGift = async (gift: typeof GIFTS[number]) => {
        if (!db || !partner || currentUser.coins < gift.cost) {
            alert("Not enough coins!");
            return;
        }
        setShowGifts(false);

        const chatDocRef = doc(db, 'chats', chatId);
        const messagesCollectionRef = collection(chatDocRef, 'messages');
        const userDocRef = doc(db, 'users', currentUser.id);

        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists() || userDoc.data().coins < gift.cost) {
                    throw new Error("Insufficient coins.");
                }

                // 1. Deduct coins
                transaction.update(userDocRef, { coins: userDoc.data().coins - gift.cost });

                // 2. Update chat document
                const lastMessagePayload = {
                    text: `Sent a ${gift.name} ${gift.icon}`,
                    senderId: currentUser.id,
                    timestamp: serverTimestamp()
                };
                transaction.set(chatDocRef, { lastMessage: lastMessagePayload }, { merge: true });
            });

            // 3. Add gift message
            await addDoc(messagesCollectionRef, {
                senderId: currentUser.id,
                text: `Sent a ${gift.name}`,
                gift: gift,
                timestamp: serverTimestamp(),
            });
            
            // 4. Update local user state
            onUpdateUser({...currentUser, coins: currentUser.coins - gift.cost });

        } catch (error) {
            console.error("Error sending gift:", error);
            alert("Could not send gift. Please try again.");
        }
    };
    
    const handleUnmatch = async () => {
        if (!db || !partner) return;
        if (window.confirm(`Are you sure you want to unmatch with ${partner.name}? This will delete your conversation.`)) {
            try {
                await deleteDoc(doc(db, 'chats', chatId));
                onClose(); // Close the conversation screen
            } catch (error) {
                console.error("Error unmatching:", error);
                alert("Could not unmatch. Please try again.");
            }
        }
        setShowMenu(false);
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
                <button 
                    onClick={() => { onViewProfile(partner.id); onClose(); }} 
                    className="flex items-center flex-1 ml-2"
                >
                    <img src={partner.profilePhotos?.[0] || PLACEHOLDER_AVATAR} alt={partner.name} className="w-10 h-10 rounded-full object-cover"/>
                    <div className="ml-3 text-left">
                        <div className="flex items-center space-x-1">
                            <span className="font-semibold text-lg">{partner.name}</span>
                            {partner.isPremium && <VerifiedIcon />}
                        </div>
                    </div>
                </button>
                <div className="relative">
                    <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-gray-600">
                        <MoreVerticalIcon />
                    </button>
                    {showMenu && (
                         <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20">
                            <ul className="py-1">
                                <li>
                                    <button onClick={handleUnmatch} className="w-full text-left px-4 py-2 text-sm text-error-red hover:bg-gray-100">
                                        Unmatch
                                    </button>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {messages.map(msg => {
                    const isSentByCurrentUser = msg.senderId === currentUser.id;
                    if (msg.gift) {
                        return (
                            <div key={msg.id} className="flex flex-col items-center justify-center my-4 text-center">
                                <div className="text-6xl">{msg.gift.icon}</div>
                                <p className="text-sm text-gray-500 mt-2">
                                    {isSentByCurrentUser ? `You sent a ${msg.gift.name}` : `${partner.name} sent you a ${msg.gift.name}`}
                                </p>
                            </div>
                        )
                    }
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

            {/* Gift Picker */}
            {showGifts && (
                <div className="p-2 border-t bg-white">
                    <div className="grid grid-cols-4 gap-2 text-center">
                        {GIFTS.map(gift => (
                            <button key={gift.name} onClick={() => handleSendGift(gift)} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50" disabled={currentUser.coins < gift.cost}>
                                <div className="text-3xl">{gift.icon}</div>
                                <div className="text-xs font-semibold">{gift.name}</div>
                                <div className="text-xs text-gray-500 flex items-center justify-center">
                                    <span className="mr-1">🪙</span>{gift.cost}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Footer */}
            <footer className="p-2 border-t border-gray-200 bg-white">
                <div className="flex items-center space-x-2">
                     <button onClick={() => setShowGifts(!showGifts)} className="p-2 text-gray-500 hover:text-flame-orange">
                        <GiftIcon className="w-6 h-6" />
                    </button>
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