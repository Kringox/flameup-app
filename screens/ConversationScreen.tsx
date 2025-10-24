import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, setDoc, increment, writeBatch } from 'firebase/firestore';
// FIX: Added file extension to types import
import { User, Message, Chat } from '../types.ts';
// FIX: Added file extension to icon imports
import MoreVerticalIcon from '../components/icons/MoreVerticalIcon.tsx';
import GiftIcon from '../components/icons/GiftIcon.tsx';
import GiftModal from '../components/GiftModal.tsx';
import ChatOptionsModal from '../components/ChatOptionsModal.tsx';
import ReportModal from '../components/ReportModal.tsx';

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
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
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

    // Mark messages as read for the current user
    const chatRef = doc(db, 'chats', generatedChatId);
    getDoc(chatRef).then(docSnap => {
        if (docSnap.exists() && (docSnap.data().unreadCount?.[currentUser.id] || 0) > 0) {
            updateDoc(chatRef, {
                [`unreadCount.${currentUser.id}`]: 0
            });
        }
    });

    const messagesRef = collection(db, 'chats', generatedChatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList = snapshot.docs.map(doc => ({ id: doc.id, chatId: generatedChatId, ...doc.data() } as Message));
      setMessages(messageList);
    }, (error) => {
      console.error("Failed to fetch messages:", error);
    });

    return () => unsubscribe();
  }, [currentUser.id, partner]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!db || !chatId || !partner) return;
    
    const chatRef = doc(db, 'chats', chatId);
    const newMessageRef = doc(collection(db, 'chats', chatId, 'messages'));
    const batch = writeBatch(db);

    batch.set(newMessageRef, {
      senderId: currentUser.id,
      text: messageText,
      timestamp: serverTimestamp(),
    });

    const chatDoc = await getDoc(chatRef);
    const lastMessageData = {
        text: messageText,
        senderId: currentUser.id,
        timestamp: serverTimestamp(),
    };

    if (!chatDoc.exists()) {
        batch.set(chatRef, {
            userIds: [currentUser.id, partner.id],
            users: {
                [currentUser.id]: { name: currentUser.name, profilePhoto: currentUser.profilePhotos[0] },
                [partner.id]: { name: partner.name, profilePhoto: partner.profilePhotos[0] },
            },
            lastMessage: lastMessageData,
            unreadCount: { [currentUser.id]: 0, [partner.id]: 1 }
        });
    } else {
        batch.update(chatRef, {
            lastMessage: lastMessageData,
            [`unreadCount.${partnerId}`]: increment(1),
        });
    }
    
    await batch.commit();
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;
    const tempMessage = newMessage;
    setNewMessage('');
    await sendMessage(tempMessage);
  };
  
  const handleSendGift = async (gift: { name: string; icon: string; cost: number }) => {
    if (!db || !currentUser || !partner || !chatId) return;
    if (currentUser.coins < gift.cost) {
        alert("You don't have enough coins!");
        return;
    }

    const newCoinTotal = currentUser.coins - gift.cost;
    const giftMessage = `Sent you a ${gift.name} ${gift.icon}`;

    onUpdateUser({ ...currentUser, coins: newCoinTotal });
    setIsGiftModalOpen(false);

    try {
        const userRef = doc(db, 'users', currentUser.id);
        await updateDoc(userRef, { coins: newCoinTotal });
        await sendMessage(giftMessage);
    } catch (error) {
        console.error("Failed to send gift:", error);
        onUpdateUser(currentUser); // Revert optimistic update on failure
        alert("Failed to send gift. Please try again.");
    }
  };
  
  const handleReportSubmit = (reason: string, details: string) => {
    console.log("Reporting user:", partner?.id, { reason, details });
    alert("Report submitted. Thank you for helping keep our community safe.");
    setIsReportModalOpen(false);
  };


  if (!partner) {
    return <div className="absolute inset-0 bg-white z-40 flex justify-center items-center">Loading...</div>;
  }

  return (
    <>
    {isGiftModalOpen && (
        <GiftModal
            currentUser={currentUser}
            onClose={() => setIsGiftModalOpen(false)}
            onSendGift={handleSendGift}
        />
    )}
    {isOptionsModalOpen && (
        <ChatOptionsModal
            onClose={() => setIsOptionsModalOpen(false)}
            onViewProfile={() => {
                onViewProfile(partner.id);
                setIsOptionsModalOpen(false);
            }}
            onReport={() => {
                setIsReportModalOpen(true);
                setIsOptionsModalOpen(false);
            }}
            onBlock={() => {
                alert("This feature is coming soon!");
                setIsOptionsModalOpen(false);
            }}
        />
    )}
     {isReportModalOpen && (
        <ReportModal 
            reportedUser={partner}
            onClose={() => setIsReportModalOpen(false)}
            onSubmit={handleReportSubmit}
        />
     )}
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
        <button onClick={() => setIsOptionsModalOpen(true)}><MoreVerticalIcon /></button>
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
          <button onClick={() => setIsGiftModalOpen(true)} className="p-2 text-gray-500 hover:text-flame-orange">
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
    </>
  );
};

export default ConversationScreen;