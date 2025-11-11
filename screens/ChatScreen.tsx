import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
// FIX: Added file extension to types import
import { Chat, User } from '../types.ts';
// FIX: Add file extension to ConversationScreen import to resolve module not found error.
import ConversationScreen from './ConversationScreen.tsx';
import { useI18n } from '../contexts/I18nContext.ts';

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

const ChatListItem: React.FC<{ chat: Chat; currentUser: User; onSelect: (partnerId: string) => void; onPinToggle: (chatId: string) => void; isPinned: boolean; }> = ({ chat, currentUser, onSelect, onPinToggle, isPinned }) => {
  const { t } = useI18n();
  const partnerId = chat.userIds.find(id => id !== currentUser.id);
  if (!partnerId) return null;
  
  const partner = chat.users[partnerId];
  if (!partner) return null;

  const unreadCount = chat.unreadCount?.[currentUser.id] || 0;
  const isUnread = unreadCount > 0;

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      onPinToggle(chat.id);
  };

  return (
    <button onClick={() => onSelect(partnerId)} onContextMenu={handleContextMenu} className="w-full flex items-center p-4 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors text-left">
      <div className="relative">
        <img className="w-14 h-14 rounded-full object-cover" src={partner.profilePhoto} alt={partner.name} />
      </div>
      <div className="flex-1 ml-4 border-b border-gray-200 dark:border-zinc-700 pb-4">
        <div className="flex justify-between items-center">
          <h3 className={`text-lg transition-all ${isUnread ? 'font-bold text-dark-gray dark:text-gray-100' : 'font-semibold text-gray-800 dark:text-gray-300'}`}>{partner.name}</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimestamp(chat.lastMessage?.timestamp)}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <p className={`text-sm truncate w-10/12 transition-all ${isUnread ? 'font-semibold text-dark-gray dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'}`}>{chat.lastMessage?.text || t('noMessagesYet')}</p>
          <div className="flex items-center space-x-2">
            {isPinned && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 3.05a7 7 0 119.9 9.9L10 18.9l-4.95-5.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
            {isUnread && (
               <span className="w-2.5 h-2.5 bg-flame-red rounded-full flex-shrink-0" aria-label="Unread message"></span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

const ChatList: React.FC<{ currentUser: User, onStartChat: (partnerId: string) => void, onUpdateUser: (user: User) => void }> = ({ currentUser, onStartChat, onUpdateUser }) => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { t } = useI18n();

    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        const chatsRef = collection(db, 'chats');
        const q = query(
            chatsRef,
            where('userIds', 'array-contains', currentUser.id)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatList = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Chat))
                .filter(chat => !chat.deletedFor?.includes(currentUser.id)); 
            
            // Sort by pinned and then by timestamp
            const sorted = chatList.sort((a, b) => {
                const aIsPinned = currentUser.pinnedChats?.includes(a.id);
                const bIsPinned = currentUser.pinnedChats?.includes(b.id);
                if (aIsPinned && !bIsPinned) return -1;
                if (!aIsPinned && bIsPinned) return 1;
                const aTime = a.lastMessage?.timestamp?.toMillis() || 0;
                const bTime = b.lastMessage?.timestamp?.toMillis() || 0;
                return bTime - aTime;
            });

            setChats(sorted);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching chats: ", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser.id, currentUser.pinnedChats]);

    const handlePinToggle = async (chatId: string) => {
        if (!db) return;
        const userRef = doc(db, 'users', currentUser.id);
        const isPinned = currentUser.pinnedChats?.includes(chatId);
        
        try {
            await updateDoc(userRef, {
                pinnedChats: isPinned ? arrayRemove(chatId) : arrayUnion(chatId)
            });
            // Optimistically update user state to re-render list
            const newPinnedChats = isPinned 
                ? (currentUser.pinnedChats || []).filter(id => id !== chatId)
                : [...(currentUser.pinnedChats || []), chatId];
            onUpdateUser({...currentUser, pinnedChats: newPinnedChats });
        } catch (error) {
            console.error("Error pinning chat:", error);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-200"></div></div>;
    }
    
    if (chats.length === 0) {
        return <p className="text-center text-gray-500 dark:text-gray-400 mt-8">{t('noConversations')}</p>;
    }

    return (
         <div>
            {chats.map(chat => (
                <ChatListItem 
                    key={chat.id} 
                    chat={chat} 
                    currentUser={currentUser} 
                    onSelect={onStartChat} 
                    onPinToggle={handlePinToggle}
                    isPinned={currentUser.pinnedChats?.includes(chat.id) || false}
                />
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
  const { t } = useI18n();
  
  if (activeChatPartnerId) {
    return <ConversationScreen currentUser={currentUser} partnerId={activeChatPartnerId} onClose={onCloseChat} onUpdateUser={onUpdateUser} onViewProfile={onViewProfile} />
  }

  return (
    <div className="w-full h-full flex flex-col">
        <header className="p-4 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-black sticky top-0 z-10">
            <h1 className="text-2xl font-bold text-dark-gray dark:text-gray-100 text-center">{t('chatsTitle')}</h1>
        </header>

        <div className="p-4">
             <input type="text" placeholder={t('searchChats')} className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-full focus:outline-none focus:ring-2 focus:ring-flame-orange bg-transparent dark:text-gray-200" />
        </div>

        <div className="flex-1 overflow-y-auto">
            <ChatList currentUser={currentUser} onStartChat={onStartChat} onUpdateUser={onUpdateUser} />
        </div>
    </div>
  );
};

export default ChatScreen;