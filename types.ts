
export enum Tab {
  Home = 'Home',
  Swipe = 'Swipe',
  Chat = 'Chat',
  Profile = 'Profile',
}

export interface User {
  id: string;
  name: string;
  age: number;
  gender: string;
  profilePhotos: string[];
  bio: string;
  distance: number;
  interests: string[];
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
}

export interface Post {
  id: string;
  user: {
    id: string;
    name: string;
    profilePhoto: string;
  };
  mediaUrls: string[];
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
}

export interface Match {
    id: string;
    user: User;
    lastMessage: string;
    timestamp: string;
    unreadCount: number;
}