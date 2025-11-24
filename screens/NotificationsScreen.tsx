
import React, { useState, useEffect } from 'react';
import { User, Notification, NotificationType } from '../types.ts';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import FlameIcon from '../components/icons/FlameIcon.tsx';

const formatTimestamp = (timestamp: any): string => {
    if (!timestamp?.toDate) return 'now';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
};

const NotificationRow: React.FC<{ notification: Notification; onClick: () => void }> = ({ notification, onClick }) => {
    const renderText = () => {
        switch (notification.type) {
            case NotificationType.Like:
                return <>liked your post.</>;
            case NotificationType.Comment:
                return <>commented: <span className="font-normal italic">"{notification.commentText}"</span></>;
            case NotificationType.Follow:
                return <>started following you.</>;
            case NotificationType.Match:
                return <>You have a new match!</>;
            case NotificationType.Purchase:
                return (
                    <>
                        unlocked your Flame Post! 
                        <span className="ml-1 font-bold text-flame-orange flex items-center inline-flex">
                            +{notification.coinsSpent} <FlameIcon className="w-3 h-3 ml-0.5" />
                        </span>
                    </>
                );
            case NotificationType.Subscribe:
                return (
                    <>
                        subscribed to you!
                        <span className="ml-1 font-bold text-flame-orange flex items-center inline-flex">
                            +{notification.coinsSpent} <FlameIcon className="w-3 h-3 ml-0.5" />
                        </span>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <button onClick={onClick} className="w-full flex items-center p-3 space-x-3 hover:bg-gray-50 text-left">
            <img src={notification.fromUser.profilePhoto} alt={notification.fromUser.name} className="w-12 h-12 rounded-full object-cover" />
            <p className="flex-1 text-sm">
                <span className="font-semibold">{notification.fromUser.name}</span>{' '}
                {renderText()}
                <span className="text-gray-500 ml-2">{formatTimestamp(notification.timestamp)}</span>
            </p>
            {notification.post && (
                <img src={notification.post.mediaUrl} alt="Post thumbnail" className="w-12 h-12 object-cover rounded-md" />
            )}
             {notification.type === NotificationType.Match && (
                <div className="w-12 h-12 flex items-center justify-center">
                    <span className="text-3xl">🔥</span>
                </div>
            )}
            {!notification.read && <div className="w-2 h-2 bg-flame-orange rounded-full flex-shrink-0"></div>}
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
        if (!db) {
            setIsLoading(false);
            return;
        }
        const notificationsRef = collection(db, 'users', user.id, 'notifications');
        const q = query(notificationsRef, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const notifList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Notification));
            setNotifications(notifList);
            setIsLoading(false);
            
            // Mark notifications as read
            const unread = snapshot.docs.filter(d => !d.data().read);
            if (unread.length > 0) {
                const batch = writeBatch(db);
                unread.forEach(d => {
                    batch.update(doc(db, 'users', user.id, 'notifications', d.id), { read: true });
                });
                await batch.commit();
            }
        },
        (error) => {
            console.error("Error fetching notifications: ", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user.id, db]);
    
    const handleNotificationClick = (notification: Notification) => {
        if (notification.type === NotificationType.Match) {
            onShowMatch(notification);
        } else {
            onViewProfile(notification.fromUser.id);
            onClose();
        }
    };

    return (
        <div className="absolute inset-0 bg-white z-50 flex flex-col">
            <header className="flex items-center p-4 border-b border-gray-200 flex-shrink-0">
                <button onClick={onClose} className="text-lg text-gray-600 w-8">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-dark-gray text-center flex-1">Notifications</h1>
                <div className="w-8"></div>
            </header>

            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                     <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
                ) : notifications.length === 0 ? (
                    <p className="text-center text-gray-500 mt-8">No notifications yet.</p>
                ) : (
                    notifications.map(n => <NotificationRow key={n.id} notification={n} onClick={() => handleNotificationClick(n)} />)
                )}
            </div>
        </div>
    );
};

export default NotificationsScreen;
