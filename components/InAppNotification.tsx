import React, { useEffect } from 'react';

interface NotificationData {
    senderName: string;
    messageText: string;
    profilePhoto: string;
    partnerId: string;
}

interface InAppNotificationProps {
    notification: NotificationData;
    onReply: (partnerId: string) => void;
    onClose: () => void;
}

const InAppNotification: React.FC<InAppNotificationProps> = ({ notification, onReply, onClose }) => {
    
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // Auto-dismiss after 5 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div 
            className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white rounded-xl shadow-2xl p-3 z-[100] border border-gray-200 animate-slide-down"
            onClick={onClose}
        >
            <style>{`
                @keyframes slide-down {
                    from { top: -100px; opacity: 0; }
                    to { top: 1rem; opacity: 1; }
                }
                .animate-slide-down { animation: slide-down 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
            `}</style>
            <div className="flex items-start space-x-3">
                <img src={notification.profilePhoto} alt={notification.senderName} className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{notification.senderName}</p>
                    <p className="text-gray-600 truncate">{notification.messageText}</p>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent the main div's onClick from firing
                        onReply(notification.partnerId);
                    }}
                    className="flex-shrink-0 bg-flame-orange/10 text-flame-orange font-bold text-sm px-4 py-2 rounded-full hover:bg-flame-orange/20 transition-colors"
                >
                    Reply
                </button>
            </div>
        </div>
    );
};

export default InAppNotification;