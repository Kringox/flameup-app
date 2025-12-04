
import React, { useState, useEffect } from 'react';
import { User, Notification, NotificationType } from '../types.ts';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import FlameIcon from '../components/icons/FlameIcon.tsx';
import XIcon from '../components/icons/XIcon.tsx';

const formatTimestamp = (timestamp: any): string => {
    if (!timestamp?.toDate) return 'now';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
};

const NotificationRow: React.FC<{ notification: Notification; onClick: () => void }> = ({ notification, onClick }) => {
    let icon = null;
    let text = "";

    switch (notification.type) {
        case NotificationType.Like:
            icon = <div className="bg-red-500 p-1 rounded-full"><span className="text-xs">❤️</span></div>;
            text = "liked your post.";
            break;
        case NotificationType.Comment:
            icon = <div className="bg-blue-500 p-1 rounded-full"><span className="text-xs">💬</span></div>;
            text = `commented: "${notification.commentText}"`;
            break;
        case NotificationType.Follow:
            icon = <div className="bg-purple-500 p-1 rounded-full"><span className="text-xs">👤</span></div>;
            text = "started following you.";
            break;
        case NotificationType.Match:
            icon = <div className="bg-flame-orange p-1 rounded-full"><span className="text-xs">🔥</span></div>;
            text = "It's a Match!";
            break;
        case NotificationType.Purchase:
            icon = <div className="bg-yellow-500 p-1 rounded-full"><span className="text-xs">💰</span></div>;
            text = `unlocked your post! (+${notification.coinsSpent} coins)`;
            break;
        case NotificationType.Subscribe:
            icon = <div className="bg-green-500 p-1 rounded-full"><span className="text-xs">👑</span></div>;
            text = `subscribed to you! (+${notification.coinsSpent} coins)`;
            break;
    }

    return (
        <button onClick={onClick} className={`w-full flex items-center p-4 hover:bg-white/5 border-b border-white/5 transition-colors ${!notification.read ? 'bg-flame-orange/5' : ''}`}>
            <div className="relative">
                <img src={notification.fromUser.profilePhoto} alt="" className="w-12 h-12 rounded-full object-cover" />
                <div className="absolute -bottom-1 -right-1">{icon}</div>
            </div>
            <div className="flex-1 ml-4 text-left">
                <p className="text-sm text-white">
                    <span className="font-bold">{notification.fromUser.name}</span> {text}
                </p>
                <p className="text-xs text-gray-500 mt-1">{formatTimestamp(notification.timestamp)}</p>
            </div>
            {notification.post && (
                <img src={notification.post.mediaUrl} className="w-10 h-10 rounded object-cover ml-2 opacity-80" />
            )}
            {!notification.read && <div className="w-2 h-2 bg-flame-orange rounded-full ml-2" />}
        </button>
    );
};

interface NotificationsScreenProps {
    user: User;
    onClose: () => void;
    onShowMatch: (notification: Notification) => void;
    onViewProfile: (userId: string) => void;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ user, onClose, onShowMatch, onViewProfile }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'users', user.id, 'notifications'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Notification));
            setNotifications(list);
            setIsLoading(false);
            
            // Auto mark as read logic could go here or on click
        });
        return () => unsubscribe();
    }, [user.id]);

    const handleClick = async (n: Notification) => {
        if (!n.read && db) {
            await writeBatch(db).update(doc(db, 'users', user.id, 'notifications', n.id), { read: true }).commit();
        }
        if (n.type === NotificationType.Match) onShowMatch(n);
        else onViewProfile(n.fromUser.id);
    };

    return (
        <div className="absolute inset-0 bg-black z-[60] flex flex-col animate-slide-in-right">
            <header className="flex items-center p-4 border-b border-zinc-800 bg-zinc-900 sticky top-0 z-10">
                <button onClick={onClose}><XIcon className="w-6 h-6 text-gray-400" /></button>
                <h1 className="flex-1 text-center text-lg font-bold text-white">Notifications</h1>
                <div className="w-6"></div>
            </header>
            <div className="flex-1 overflow-y-auto">
                {isLoading ? <div className="p-8 text-center text-gray-500">Loading...</div> : 
                 notifications.length === 0 ? <div className="p-8 text-center text-gray-500">No notifications yet.</div> :
                 notifications.map(n => <NotificationRow key={n.id} notification={n} onClick={() => handleClick(n)} />)
                }
            </div>
        </div>
    );
};

export default NotificationsScreen;
