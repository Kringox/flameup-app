
import { Timestamp } from 'firebase/firestore';

export enum Tab {
  Home = 'Home',
  Swipe = 'Swipe',
  Chat = 'Chat',
  Profile = 'Profile',
}

export enum NotificationType {
    Like = 'like',
    Comment = 'comment',
    Follow = 'follow',
    Match = 'match',
    SuperLike = 'superlike',
}

export type RetentionPolicy = 'forever' | '5min' | 'read';

export interface User {
  id: string;
  email: string;
  name: string;
  age: number;
  gender: 'Man' | 'Woman' | 'Other';
  profilePhotos: string[];
  aboutMe?: string;
  interests?: string;
  lifestyle?: string;
  language?: 'en' | 'de';
  followers: string[]; // array of user IDs
  following: string[]; // array of user IDs
  coins?: number;
  
  // New System
  hotnessScore?: number;

  // Legacy (kept for type safety during migration, but effectively unused logic-wise)
  xp: number;
  level: number;
  
  createdAt: Timestamp;
  isPremium?: boolean;
  profileTheme?: 'default' | 'dusk' | 'rose';
  lastDailyBonus?: Timestamp;
  swipedLeft?: string[]; // array of user IDs
  swipedRight?: string[]; // array of user IDs
  dailySwipesUsed?: number;
  lastSwipeReset?: Timestamp;
  boostEndTime?: Timestamp;
  blockedUsers?: string[]; // array of user IDs
  pinnedChats?: string[]; // array of chat IDs
  privacySettings?: {
    showTyping: boolean;
    sendReadReceipts: boolean;
    showLastOnline: boolean;
  };
}

export interface Post {
    id: string;
    userId: string;
    mediaUrls: string[];
    caption: string;
    likedBy: string[]; // array of user IDs
    commentCount: number;
    timestamp: Timestamp;
    user: { // denormalized user data
        id: string;
        name: string;
        profilePhoto: string;
        isPremium?: boolean;
    };
}

export interface Story {
    id: string;
    mediaUrl: string;
    viewed: string[] | boolean; // Can be array of user IDs who viewed or a simple boolean for own story viewed status
    timestamp: Timestamp | null;
    likedBy?: string[]; // array of user IDs
    user: {
        id: string;
        name: string;
        profilePhoto: string;
    };
}

export interface Gift {
    name: string;
    icon: string;
    cost: number;
}

export interface Message {
    id: string;
    chatId: string;
    senderId: string;
    text: string;
    timestamp: Timestamp;
    gift?: Gift;
    
    // New Media Fields
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'audio';
    duration?: number; // Duration in seconds for audio/video
    isViewOnce?: boolean;
    viewedAt?: Timestamp; // For View Once logic and Retention Logic
    viewCount?: number; // 0 = new, 1 = viewed once, 2 = viewed & replayed (max)
    isSaved?: boolean; // For saving messages in Snapchat style
    isSystemMessage?: boolean; // For status updates like changing retention policy
    deletedFor?: string[]; // Array of user IDs for whom this message is deleted

    reactions?: { [key: string]: string[] }; // emoji: array of user IDs
    replyTo?: {
        messageId: string;
        senderName: string;
        text: string;
    };
    isRecalled?: boolean;
}

export interface Chat {
    id:string;
    userIds: string[];
    users: {
        [key: string]: {
            name: string;
            profilePhoto: string;
        }
    };
    lastMessage?: {
        id?: string; // Add ID to track specific message deletion status
        text: string;
        senderId: string;
        timestamp: Timestamp;
        deletedFor?: string[]; // Array of user IDs who have deleted this specific last message
    };
    unreadCount?: {
        [key: string]: number;
    };
    deletedFor?: string[]; // array of user IDs who deleted the chat
    retentionPolicy?: RetentionPolicy; // 'forever' | '5min' | 'read'
}

export interface Comment {
    id: string;
    postId: string;
    userId: string;
    userName: string;
    userProfilePhoto: string;
    isPremium?: boolean;
    text: string;
    likedBy: string[];
    timestamp: Timestamp;
}

export interface Notification {
    id: string;
    type: NotificationType;
    fromUser: {
        id: string;
        name: string;
        profilePhoto: string;
    };
    post?: {
        id: string;
        mediaUrl: string;
    };
    commentText?: string;
    read: boolean;
    timestamp: Timestamp;
}
