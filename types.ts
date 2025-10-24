import { Timestamp } from "firebase/firestore";

export enum Tab {
  Home = 'Home',
  Swipe = 'Swipe',
  Chat = 'Chat',
  Profile = 'Profile',
}

export interface StoryHighlight {
  id: string;
  title: string;
  coverPhotoUrl: string;
  storyIds: string[];
}

export interface User {
  id:string; // Corresponds to Firebase Auth UID
  name: string;
  age: number;
  gender: string;
  profilePhotos: string[];
  bio: string;
  distance: number;
  interests: string[];
  email: string;
  followers: string[]; // Array of user IDs
  following: string[]; // Array of user IDs
  coins: number; // For sending gifts
  createdAt: any; // For sorting by new users
  isPremium?: boolean;
  incognitoMode?: boolean;
  storyHighlights?: StoryHighlight[];
}

export interface Story {
  id: string;
  user: {
    id: string;
    name: string;
    profilePhoto: string;
  };
  mediaUrl: string;
  viewed: boolean;
  timestamp: any; // For 24-hour expiration
}

export interface Post {
  id: string;
  userId: string; // Added for easier querying
  user: {
    id:string;
    name: string;
    profilePhoto: string;
    isPremium?: boolean;
  };
  mediaUrls: string[];
  caption: string;
  likedBy: string[]; // Changed from 'likes: number' to track who liked the post
  commentCount: number; // Changed from 'comments: number'
  timestamp: any; // For ordering the feed
}

export interface Match {
    id: string;
    user: {
        id: string;
        name: string;
        profilePhoto: string;
    };
    lastMessage: string;
    timestamp: Timestamp;
    unreadCount: number;
}

export interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: Timestamp;
    gift?: { // For sending virtual gifts
      name: 'Rose' | 'Teddy' | 'Heart' | 'Ring';
      icon: string;
      cost: number;
    }
}

export interface Chat {
    id: string; // Combined, sorted user IDs: e.g., 'uid1_uid2'
    userIds: string[];
    // Denormalized user data for easy access in chat list
    users: {
        [key: string]: {
            name: string;
            profilePhoto: string;
            isPremium?: boolean;
        }
    };
    lastMessage: {
        text: string;
        senderId: string;
        timestamp: Timestamp;
    } | null;
    // Tracks unread messages for each user in the chat
    unreadCount: {
        [key: string]: number;
    };
}


export interface Comment {
    id: string;
    postId: string; // Added to query comments for a post
    userId: string;
    userName: string;
    userProfilePhoto: string;
    isPremium?: boolean;
    text: string;
    likedBy: string[];
    timestamp: Timestamp;
}

export enum NotificationType {
    Like = 'like',
    Comment = 'comment',
    Follow = 'follow',
    Match = 'match',
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