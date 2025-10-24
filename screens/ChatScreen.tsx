import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Chat, User } from '../types';
import ConversationScreen from './ConversationScreen';

const formatTimestamp = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (today.getTime() === messageDate.getTime()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (today.getTime() - messageDate.getTime() === 24 * 60 * 60 * 1000) {
        return 'Yesterday';
    }
    return date.toLocaleDateString();
};

const ChatListItem: React.FC<{ chat: Chat; currentUser: User; onSelect: (partnerId: string) => void }> = ({ chat, currentUser, onSelect }) => {
  const partnerId = chat.userIds.find(id => id !== currentUser.id);
  if (!partnerId) return null;
  
  const partner = chat.users[partnerId];
  if (!partner) return null;

  const unreadCount = chat.unreadCount?.[currentUser.id] || 0;
  const isUnread = unreadCount > 0;

  return (
    <div onClick={() => onSelect(partnerId)} className="flex items-center p-4 hover:bg-gray-100 cursor-pointer">
      <div className="relative">
        <img className="w-14 h-14 rounded-full object-cover" src={partner.profilePhoto} alt={partner.name} />
      </div>
      <div className="flex-1 ml-4 border-b border-gray-200 pb-4">
        <div className="flex justify-between items-center">
          <h3 className={`text-lg transition-all ${isUnread ? 'font-bold text-dark-gray' : 'font-semibold text-gray-800'}`}>{partner.name}</h3>
          <span className="text-xs text-gray-500">{formatTimestamp(chat.lastMessage?.timestamp)}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <p className={`text-sm truncate w-11/12 transition-all ${isUnread ? 'font-semibold text-dark-gray' : 'text-gray-600'}`}>{chat.lastMessage?.text || 'No messages yet'}</p>
          {isUnread && (
             <span className="w-2.5 h-2.5 bg-flame-red rounded-full flex-shrink-0" aria-label="Unread message"></span>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatList: React.FC<{ currentUser: User, onStartChat: (partnerId: string) => void }> = ({ currentUser, onStartChat }) => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        const chatsRef = collection(db, 'chats');
        const q = query(
            chatsRef,
            where('userIds', 'array-contains', currentUser.id),
            orderBy('lastMessage.timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
            setChats(chatList);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching chats: ", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser.id]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;
    }
    
    if (chats.length === 0) {
        return <p className="text-center text-gray-500 mt-8">No conversations yet. Start swiping!</p>;
    }

    return (
         <div>
            {chats.map(chat => (
                <ChatListItem key={chat.id} chat={chat} currentUser={currentUser} onSelect={onStartChat} />
            ))}
        </div>
    );
};


interface ChatScreenProps {
    currentUser: User;
    activeChatPartnerId: string | null;
    onStartChat: (partnerId: string) => void;
    onCloseChat: () => void;
    onUpdateUser: (user: User) => void;
    onViewProfile: (userId: string) => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ currentUser, activeChatPartnerId, onStartChat, onCloseChat, onUpdateUser, onViewProfile }) => {
  if (activeChatPartnerId) {
    return <ConversationScreen currentUser={currentUser} partnerId={activeChatPartnerId} onClose={onCloseChat} onUpdateUser={onUpdateUser} onViewProfile={onViewProfile} />
  }

  return (
    <div className="w-full h-full flex flex-col">
        <header className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
            <h1 className="text-2xl font-bold text-dark-gray text-center">Chats</h1>
        </header>

        <div className="p-4">
             <input type="text" placeholder="Search chats..." className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-flame-orange" />
        </div>

        <div className="flex-1 overflow-y-auto">
            <ChatList currentUser={currentUser} onStartChat={onStartChat} />
        </div>
    </div>
  );
};

export default ChatScreen;