import { Timestamp } from "firebase/firestore";

export enum Tab {
  Home = 'Home',
  Swipe = 'Swipe',
  Chat = 'Chat',
  Profile = 'Profile',
}

export interface User {
  id: string; // Corresponds to Firebase Auth UID
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
  };
  mediaUrls: string[];
  caption: string;
  likedBy: string[]; // Changed from 'likes: number' to track who liked the post
  commentCount: number; // Changed from 'comments: number'
  timestamp: any; // For ordering the feed
}

export interface Match {
    id: string;
    user: User;
    lastMessage: string;
    timestamp: string;
    unreadCount: number;
}

export interface Comment {
    id: string;
    userId: string;
    userName: string;
    userProfilePhoto: string;
    text: string;
    likedBy: string[];
    timestamp: Timestamp;
}

export enum NotificationType {
    Like = 'like',
    Comment = 'comment',
    Follow = 'follow',
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