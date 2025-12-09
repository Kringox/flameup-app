import React from 'react';
import { Message } from '../types.ts';
import ViewOnceMedia from './ViewOnceMedia.tsx';
import StarIcon from './icons/StarIcon.tsx';
import FlameLoader from './FlameLoader.tsx';

const AudioPlayer: React.FC<{ src: string, duration?: number, isOwnMessage: boolean }> = ({ src, duration, isOwnMessage }) => {
    // This is a simplified placeholder. A real implementation would handle audio playback.
    return <div className="p-2">🎤 Voice Message ({duration}s)</div>;
};

const MessageBubble: React.FC<{ 
    message: Message, 
    isOwnMessage: boolean, 
    onLongPress: (e: React.MouseEvent, msg: Message) => void, 
    onViewMedia: (msgId: string, currentCount: number) => void,
    onToggleSave: (msg: Message) => void,
    onResend: (msg: Message) => void;
    onDelete: (msgId: string) => void;
}> = ({ message, isOwnMessage, onLongPress, onViewMedia, onToggleSave, onResend, onDelete }) => {
    
    if (message.isSystemMessage) {
        return (
            <div className="flex justify-center my-4 opacity-70 w-full">
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 text-center bg-gray-100 dark:bg-zinc-800 px-3 py-1 rounded-full shadow-sm">
                    {message.text}
                </p>
            </div>
        );
    }

    const isMedia = !!message.mediaUrl;
    const isAudio = message.mediaType === 'audio';
    const isViewOnce = !!message.isViewOnce;
    const isSaved = !!message.isSaved;
    const isFavorite = !!message.isFavorite;
    const status = message.status;
    
    let bubbleClass = isOwnMessage 
        ? 'rounded-2xl rounded-tr-sm ' 
        : 'rounded-2xl rounded-tl-sm ';
    
    if (isSaved) {
        bubbleClass += 'bg-gray-200 dark:bg-zinc-700 text-dark-gray dark:text-gray-200 border-l-4 border-flame-orange ';
    } else {
        bubbleClass += isOwnMessage 
            ? 'bg-flame-orange text-white ' 
            : 'bg-white dark:bg-zinc-800 text-dark-gray dark:text-gray-200 border border-gray-100 dark:border-zinc-700 shadow-sm ';
    }

    const handleClick = (e: React.MouseEvent) => {
        if (!isViewOnce) {
            if (!isMedia || isAudio) {
                 onToggleSave(message);
            }
        }
    };

    const viewed = !!message.viewedAt;
    const viewCount = message.viewCount || (viewed ? 1 : 0);

    if (message.isRecalled) {
        return (
             <div className="px-3 py-2 rounded-full text-xs italic text-gray-400 dark:text-gray-500 self-center border border-gray-200 dark:border-zinc-800 my-1">
                Message recalled
            </div>
        )
    }

    if (message.gift) {
        return (
             <div onContextMenu={(e) => onLongPress(e, message)} className={`p-3 rounded-2xl max-w-[70%] text-center flex flex-col items-center my-1 ${bubbleClass} self-center`}>
                <span className="text-4xl animate-bounce">{message.gift.icon}</span>
                <p className="font-semibold mt-1 text-sm">Sent a {message.gift.name}</p>
            </div>
        )
    }
    
    const reactions = message.reactions && Object.entries(message.reactions).filter(
        (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0
    );
    
    return (
        <div className={`w-full flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} my-0.5 group`}>
            <div className={`flex items-center gap-1 relative max-w-[85%] ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                {isFavorite && <StarIcon className={`w-3 h-3 absolute ${isOwnMessage ? '-left-4' : '-right-4'} ${isOwnMessage ? 'text-flame-orange' : 'text-gray-400'}`} />}
                <div 
                    onContextMenu={(e) => onLongPress(e, message)} 
                    onClick={handleClick}
                    className={`relative cursor-pointer w-fit ${isMedia && !isViewOnce && !isAudio ? 'p-1' : 'px-4 py-2'} ${bubbleClass}`}
                >
                    {message.replyTo && (
                        <div className={`p-2 rounded-lg mb-1 text-xs border-l-2 ${isOwnMessage && !isSaved ? 'bg-black/10 border-white/50' : 'bg-gray-100 dark:bg-zinc-700 border-flame-orange'}`}>
                            <p className="font-bold opacity-80 truncate">{message.replyTo.senderName}</p>
                            <p className="opacity-70 truncate">{message.replyTo.text || 'Media'}</p>
                        </div>
                    )}
                    
                    {isMedia ? (
                        isAudio ? (
                            <AudioPlayer src={message.mediaUrl!} duration={message.duration} isOwnMessage={isOwnMessage && !isSaved} />
                        ) : (
                            isViewOnce ? (
                                <div onClick={(e) => e.stopPropagation()}>
                                    <ViewOnceMedia 
                                        mediaUrl={message.mediaUrl!} 
                                        mediaType={(message.mediaType || 'image') as 'image' | 'video'} 
                                        isSender={isOwnMessage}
                                        viewed={viewed}
                                        viewCount={viewCount}
                                        onView={() => onViewMedia(message.id, viewCount)}
                                    />
                                </div>
                            ) : (
                                <div className="rounded-xl overflow-hidden relative">
                                    {message.mediaType === 'video' ? (
                                        <video src={message.mediaUrl} controls className={`max-h-64 w-full object-cover ${status === 'sending' ? 'opacity-50' : ''}`} onClick={(e) => e.stopPropagation()} />
                                    ) : (
                                        <img src={message.mediaUrl} alt="sent media" className={`max-h-64 w-full object-cover ${status === 'sending' ? 'opacity-50' : ''}`} />
                                    )}
                                     {status === 'sending' && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <FlameLoader size="sm" />
                                        </div>
                                    )}
                                    {status === 'failed' && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                                            <p className="text-white text-xs font-bold">Failed</p>
                                            <button onClick={() => onResend(message)} className="text-white text-xs underline">Retry</button>
                                        </div>
                                    )}
                                    {message.text && <p className={`mt-2 text-sm px-2 pb-1 whitespace-pre-wrap break-words ${isOwnMessage && !isSaved ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>{message.text}</p>}
                                </div>
                            )
                        )
                    ) : (
                        <p className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words ${status === 'sending' ? 'opacity-70' : ''}`}>{message.text}</p>
                    )}
                    
                    {isSaved && (
                        <span className="text-[10px] font-bold uppercase opacity-50 block mt-1">Saved</span>
                    )}
                </div>
            </div>
            
             {reactions && reactions.length > 0 && (
                <div className={`flex -mt-2 z-10 ${isOwnMessage ? 'mr-2' : 'ml-2'}`}>
                    {reactions.map(([emoji, userIds]) => (
                        <div key={emoji} className="px-1.5 py-0.5 bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-full flex items-center shadow-sm text-xs">
                            <span>{emoji}</span>
                            {userIds.length > 1 && <span className="ml-0.5 font-bold">{userIds.length}</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MessageBubble;