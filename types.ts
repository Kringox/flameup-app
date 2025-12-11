
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
    Purchase = 'purchase',
    Subscribe = 'subscribe',
    System = 'system',
}

export type RetentionPolicy = 'forever' | '5min' | 'read';

export type AppTint = 'white' | 'black' | 'red';

export interface UserLocation {
    latitude: number;
    longitude: number;
    cityName?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  age: number;
  gender: 'Man' | 'Woman' | 'Other';
  profilePhotos: string[];
  aboutMe?: string;
  bio?: string; // FIX: Add bio for consistency as it's used in some components
  interests?: string;
  lifestyle?: string;
  language?: 'en' | 'de';
  followers: string[]; // array of user IDs
  following: string[]; // array of user IDs
  coins?: number;
  freeSuperLikes?: number;
  
  isOnline?: boolean;
  lastOnline?: Timestamp;
  
  location?: UserLocation;
  
  hotnessScore?: number;
  
  subscriptionPrice?: number;
  subscriptions?: string[]; // IDs of users I subscribe to

  xp: number;
  level: number;
  
  createdAt: Timestamp;
  isPremium?: boolean; // FlameUp+ status
  profileTheme?: AppTint;
  lastDailyBonus?: Timestamp;
  lastReviewPrompt?: Timestamp;
  swipedLeft?: string[];
  swipedRight?: string[];
  dailySwipesUsed?: number;
  lastSwipeReset?: Timestamp;
  swipeFilters?: SwipeFilters;
  boostEndTime?: Timestamp;
  blockedUsers?: string[];
  pinnedChats?: string[];
  privacySettings?: {
    showTyping: boolean;
    sendReadReceipts: boolean;
    showLastOnline: boolean;
  };
  
  // Analytics Data (FlameUp+)
  analytics?: {
      profileViews: number;
      totalLikesReceived: number;
      matchRate: number;
      earnings: number;
  }
}

export interface SwipeFilters {
    useMyLocation: boolean;
    manualLocation?: string;
    maxDistance: number;
    ageRange: [number, number];
    requiredInterests: string[];
    // Premium Filters
    height?: number;
    education?: string;
    hasChildren?: boolean;
}

export interface Post {
    id: string;
    userId: string;
    mediaUrls: string[];
    caption: string;
    likedBy: string[];
    repostedBy?: string[]; // IDs of users who reposted this
    commentCount: number;
    timestamp: Timestamp;
    isPaid?: boolean;
    price?: number;
    unlockedBy?: string[];
    user: {
        id: string;
        name: string;
        profilePhoto: string;
        isPremium?: boolean;
    };
}

export interface Story {
    id: string;
    mediaUrl: string;
    viewed: string[] | boolean;
    timestamp: Timestamp | null;
    likedBy?: string[];
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
    mediaUrl?: string;
    // FIX: mediaType for ViewOnceMedia can be audio, but the component does not support it, this is a temporary fix
    mediaType?: 'image' | 'video' | 'audio';
    duration?: number;
    isViewOnce?: boolean;
    viewedAt?: Timestamp;
    viewCount?: number;
    isSaved?: boolean;
    isFavorite?: boolean;
    isSystemMessage?: boolean;
    deletedFor?: string[];
    reactions?: { [key: string]: string[] };
    replyTo?: {
        messageId: string;
        senderName: string;
        text: string;
    };
    isRecalled?: boolean;
    status?: 'sending' | 'failed';
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
        id?: string;
        text: string;
        senderId: string;
        timestamp: Timestamp;
        deletedFor?: string[];
    };
    unreadCount?: {
        [key: string]: number;
    };
    deletedFor?: string[];
    archivedBy?: string[];
    mutedBy?: string[];
    streak?: number;
    lastStreakUpdate?: Timestamp;
    retentionPolicy?: RetentionPolicy;
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
    replyTo?: {
        commentId: string;
        userName: string;
    };
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
    coinsSpent?: number;
}

// FIX: Add missing properties to Call interface for callee info and querying.
export interface Call {
    id: string;
    callerId: string;
    callerName: string;
    callerPhoto: string;
    calleeId: string;
    calleeName: string;
    calleePhoto: string;
    userIds: string[];
    status: 'ringing' | 'connected' | 'ended' | 'declined' | 'cancelled';
    type: 'audio' | 'video';
    timestamp: Timestamp;
    offer?: any;
    answer?: any;
}
