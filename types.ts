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

// FIX: Define and export the Gift interface for reusability.
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
    // FIX: Use the exported Gift interface.
    gift?: Gift;
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
        text: string;
        senderId: string;
        timestamp: Timestamp;
    };
    unreadCount?: {
        [key: string]: number;
    };
    deletedFor?: string[]; // array of user IDs who deleted the chat
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