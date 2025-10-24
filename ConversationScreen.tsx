import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebaseConfig.ts';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
// FIX: Added file extension to types import
import { User, Message, Chat } from './types.ts';
// FIX: Added file extension to icon imports
import MoreVerticalIcon from './components/icons/MoreVerticalIcon.tsx';
import GiftIcon from './components/icons/GiftIcon.tsx';

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
  const [partner, setPartner] = useState<User | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPartnerData = async () => {
      if (!db) return;
      const userDoc = await getDoc(doc(db, 'users', partnerId));
      if (userDoc.exists()) {
        setPartner({ id: userDoc.id, ...userDoc.data() } as User);
      }
    };
    fetchPartnerData();
  }, [partnerId]);

  useEffect(() => {
    if (!db || !partner) return;
    
    const sortedIds = [currentUser.id, partner.id].sort();
    const generatedChatId = sortedIds.join('_');
    setChatId(generatedChatId);

    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, where('chatId', '==', generatedChatId), orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(messageList);
    });

    return () => unsubscribe();
  }, [currentUser.id, partner]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!db || !chatId || !partner || newMessage.trim() === '') return;
    
    const tempMessage = newMessage;
    setNewMessage('');

    const messagesRef = collection(db, 'messages');
    await addDoc(messagesRef, {
      chatId,
      senderId: currentUser.id,
      text: tempMessage,
      timestamp: serverTimestamp(),
    });

    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);

    if (!chatDoc.exists()) {
        await setDoc(chatRef, {
            userIds: [currentUser.id, partner.id],
            users: {
                [currentUser.id]: { name: currentUser.name, profilePhoto: currentUser.profilePhotos[0] },
                [partner.id]: { name: partner.name, profilePhoto: partner.profilePhotos[0] },
            },
            lastMessage: {
                text: tempMessage,
                senderId: currentUser.id,
                timestamp: serverTimestamp(),
            },
            unreadCount: { [currentUser.id]: 0, [partner.id]: 1 }
        });
    } else {
        await updateDoc(chatRef, {
            lastMessage: {
                text: tempMessage,
                senderId: currentUser.id,
                timestamp: serverTimestamp(),
            },
            [`unreadCount.${partnerId}`]: increment(1),
        });
    }
  };

  if (!partner) {
    return <div className="absolute inset-0 bg-white z-40 flex justify-center items-center">Loading...</div>;
  }

  return (
    <div className="absolute inset-0 bg-white z-40 flex flex-col">
      <header className="flex items-center p-3 border-b border-gray-200 sticky top-0 bg-white">
        <button onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={() => onViewProfile(partner.id)} className="flex items-center ml-2">
            <img src={partner.profilePhotos[0]} alt={partner.name} className="w-10 h-10 rounded-full object-cover" />
            <span className="font-bold ml-3">{partner.name}</span>
        </button>
        <div className="flex-grow" />
        <button><MoreVerticalIcon /></button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex mb-4 ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs px-4 py-2 rounded-2xl ${msg.senderId === currentUser.id ? 'bg-flame-orange text-white' : 'bg-gray-200'}`}>
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className="p-2 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-500 hover:text-flame-orange">
            <GiftIcon />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-flame-orange"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button onClick={handleSendMessage} className="text-flame-orange font-semibold disabled:opacity-50" disabled={!newMessage.trim()}>
            Send
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ConversationScreen;