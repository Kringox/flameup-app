
import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
// FIX: Added QuerySnapshot and DocumentData to imports to resolve typing issue with onSnapshot.
import { collection, query, where, onSnapshot, Timestamp, doc, updateDoc, arrayUnion, arrayRemove, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { Chat, User } from '../types.ts';
import ConversationScreen from './ConversationScreen.tsx';
import { useI18n } from '../contexts/I18nContext.ts';
import SearchIcon from '../components/icons/SearchIcon.tsx';
import FlameIcon from '../components/icons/FlameIcon.tsx';
import MoreVerticalIcon from '../components/icons/MoreVerticalIcon.tsx';

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

const ChatListItem: React.FC<{ 
    chat: Chat; 
    currentUser: User; 
    onSelect: (partnerId: string) => void; 
    onAction: (chatId: string, action: 'pin' | 'archive' | 'unarchive' | 'mute') => void;
    isPinned: boolean;
    isArchived: boolean;
}> = ({ chat, currentUser, onSelect, onAction, isPinned, isArchived }) => {
  const { t } = useI18n();
  const partnerId = chat.userIds.find(id => id !== currentUser.id);
  if (!partnerId) return null;
  
  const partner = chat.users[partnerId];
  if (!partner) return null;

  const unreadCount = chat.unreadCount?.[currentUser.id] || 0;
  const isUnread = unreadCount > 0;
  const isMuted = chat.mutedBy?.includes(currentUser.id);
  const hasStreak = (chat.streak || 0) > 0;

  let previewText = chat.lastMessage?.text || t('noMessagesYet');
  
  if (chat.lastMessage?.deletedFor?.includes(currentUser.id)) {
      previewText = t('messageRecalled');
      if (chat.retentionPolicy !== 'forever') {
          previewText = "Message expired";
      }
  } else if (chat.retentionPolicy === '5min' && chat.lastMessage?.timestamp) {
      const msgTime = chat.lastMessage.timestamp.toDate().getTime();
      const now = Date.now();
      if (now - msgTime > 5 * 60 * 1000) {
          previewText = 'Message expired'; 
      }
  }

  const [showMenu, setShowMenu] = useState(false);

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      setShowMenu(true);
  };

  const toggleMenu = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowMenu(!showMenu);
  };

  return (
    <div className="relative border-b border-gray-100 dark:border-zinc-800/50">
        <div 
            onClick={() => onSelect(partnerId)} 
            onContextMenu={handleContextMenu} 
            className={`w-full flex items-center p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors ${isPinned ? 'bg-gray-50 dark:bg-zinc-900/50' : ''}`}
        >
            <div className="relative">
                <img className="w-14 h-14 rounded-full object-cover" src={partner.profilePhoto} alt={partner.name} />
                {hasStreak && (
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-black rounded-full p-0.5 border border-white dark:border-black">
                        <span className="text-xs">🔥</span>
                    </div>
                )}
            </div>
            <div className="flex-1 ml-4 min-w-0">
                <div className="flex justify-between items-center">
                    <h3 className={`text-lg truncate pr-2 transition-all ${isUnread ? 'font-bold text-dark-gray dark:text-gray-100' : 'font-semibold text-gray-800 dark:text-gray-300'}`}>
                        {partner.name}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{formatTimestamp(chat.lastMessage?.timestamp)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                    <p className={`text-sm truncate w-10/12 transition-all ${isUnread ? 'font-semibold text-dark-gray dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'} ${previewText === 'Message expired' ? 'italic opacity-60' : ''}`}>
                        {previewText}
                    </p>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                        {isMuted && <span className="text-xs text-gray-400">🔇</span>}
                        {isPinned && <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400 transform rotate-45" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>}
                        {isUnread && !isMuted && (
                            <span className="w-2.5 h-2.5 bg-flame-red rounded-full flex-shrink-0" aria-label="Unread message"></span>
                        )}
                    </div>
                </div>
            </div>
            <button onClick={toggleMenu} className="ml-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full active:bg-gray-200 dark:active:bg-zinc-700">
                <MoreVerticalIcon className="w-5 h-5" />
            </button>
        </div>
        
        {/* Context Menu Overlay */}
        {showMenu && (
            <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                <div className="absolute right-4 top-12 z-20 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-gray-100 dark:border-zinc-700 w-40 overflow-hidden animate-fade-in-fast">
                    <button onClick={() => { onAction(chat.id, 'pin'); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 dark:text-gray-200 border-b border-gray-100 dark:border-zinc-700">
                        {isPinned ? 'Unpin Chat' : 'Pin Chat'}
                    </button>
                    <button onClick={() => { onAction(chat.id, 'mute'); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 dark:text-gray-200 border-b border-gray-100 dark:border-zinc-700">
                        {isMuted ? 'Unmute' : 'Mute Notifications'}
                    </button>
                    {isArchived ? (
                        <button onClick={() => { onAction(chat.id, 'unarchive'); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 dark:text-gray-200">
                            Unarchive Chat
                        </button>
                    ) : (
                        <button onClick={() => { onAction(chat.id, 'archive'); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 dark:text-gray-200">
                            Archive Chat
                        </button>
                    )}
                </div>
            </>
        )}
    </div>
  );
};

const ChatList: React.FC<{ 
    currentUser: User, 
    onStartChat: (partnerId: string) => void, 
    onUpdateUser: (user: User) => void,
    viewArchived: boolean,
    filterText: string 
}> = ({ currentUser, onStartChat, onUpdateUser, viewArchived, filterText }) => {
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

        // FIX: Explicitly type snapshot as QuerySnapshot to resolve 'docs' property error.
        const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            let chatList = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Chat))
                .filter(chat => !chat.deletedFor?.includes(currentUser.id)); 
            
            // Filter by Archive Status
            chatList = chatList.filter(chat => {
                const isArchived = chat.archivedBy?.includes(currentUser.id);
                return viewArchived ? isArchived : !isArchived;
            });

            // Filter by Search Text
            if (filterText) {
                const lowerFilter = filterText.toLowerCase();
                chatList = chatList.filter(chat => {
                    const partnerId = chat.userIds.find(id => id !== currentUser.id);
                    if (!partnerId) return false;
                    const name = chat.users[partnerId]?.name || '';
                    return name.toLowerCase().includes(lowerFilter);
                });
            }
            
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
    }, [currentUser.id, currentUser.pinnedChats, viewArchived, filterText]);

    const handleAction = async (chatId: string, action: 'pin' | 'archive' | 'unarchive' | 'mute') => {
        if (!db) return;
        const userRef = doc(db, 'users', currentUser.id);
        const chatRef = doc(db, 'chats', chatId);

        try {
            if (action === 'pin') {
                const isPinned = currentUser.pinnedChats?.includes(chatId);
                const currentPinned = currentUser.pinnedChats || [];
                
                if (!isPinned && currentPinned.length >= 3) {
                    alert("You can only pin up to 3 chats.");
                    return;
                }

                await updateDoc(userRef, {
                    pinnedChats: isPinned ? arrayRemove(chatId) : arrayUnion(chatId)
                });
                onUpdateUser({...currentUser, pinnedChats: isPinned ? currentPinned.filter(id => id !== chatId) : [...currentPinned, chatId] });
            } 
            else if (action === 'archive') {
                await updateDoc(chatRef, { archivedBy: arrayUnion(currentUser.id) });
            }
            else if (action === 'unarchive') {
                await updateDoc(chatRef, { archivedBy: arrayRemove(currentUser.id) });
            }
            else if (action === 'mute') {
                const chat = chats.find(c => c.id === chatId);
                const isMuted = chat?.mutedBy?.includes(currentUser.id);
                await updateDoc(chatRef, { mutedBy: isMuted ? arrayRemove(currentUser.id) : arrayUnion(currentUser.id) });
            }
        } catch (error) {
            console.error(`Error performing ${action}:`, error);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-200"></div></div>;
    }
    
    if (chats.length === 0) {
        return <p className="text-center text-gray-500 dark:text-gray-400 mt-8">{filterText ? 'No chats found.' : (viewArchived ? 'No archived chats.' : t('noConversations'))}</p>;
    }

    return (
         <div className="pb-24">
            {chats.map(chat => (
                <ChatListItem 
                    key={chat.id} 
                    chat={chat} 
                    currentUser={currentUser} 
                    onSelect={onStartChat} 
                    onAction={handleAction}
                    isPinned={currentUser.pinnedChats?.includes(chat.id) || false}
                    isArchived={viewArchived}
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
  const [filterText, setFilterText] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'archived'>('all');
  
  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black relative">
        <header className="p-4 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-black sticky top-0 z-10">
            <h1 className="text-2xl font-bold text-dark-gray dark:text-gray-100 text-center mb-2">{t('chatsTitle')}</h1>
            
            {/* Search Bar */}
            <div className="relative mb-3">
                <input 
                    type="text" 
                    placeholder={t('searchChats')} 
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-full focus:outline-none focus:ring-2 focus:ring-flame-orange bg-gray-100 dark:bg-zinc-800 dark:text-gray-200 text-sm" 
                />
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>

            {/* Organization Tabs */}
            <div className="flex space-x-4 text-sm font-semibold border-b border-transparent">
                <button 
                    onClick={() => setActiveTab('all')}
                    className={`pb-2 border-b-2 transition-colors ${activeTab === 'all' ? 'border-flame-orange text-flame-orange' : 'border-transparent text-gray-500'}`}
                >
                    All Chats
                </button>
                <button 
                    onClick={() => setActiveTab('archived')}
                    className={`pb-2 border-b-2 transition-colors ${activeTab === 'archived' ? 'border-flame-orange text-flame-orange' : 'border-transparent text-gray-500'}`}
                >
                    Archived
                </button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto">
            <ChatList 
                currentUser={currentUser} 
                onStartChat={onStartChat} 
                onUpdateUser={onUpdateUser} 
                viewArchived={activeTab === 'archived'}
                filterText={filterText}
            />
        </div>

        {/* Conversation Overlay */}
        {activeChatPartnerId && (
            <ConversationScreen 
                currentUser={currentUser} 
                partnerId={activeChatPartnerId} 
                onClose={onCloseChat} 
                onUpdateUser={onUpdateUser} 
                onViewProfile={onViewProfile} 
            />
        )}
    </div>
  );
};

export default ChatScreen;
