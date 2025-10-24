// FIX: Import React to provide React namespace for React.ReactElement
import * as React from 'react';
// FIX: Added file extension to types import
// FIX: Corrected import path for types from ./ to ../
import { User, Post } from '../types.ts';
// FIX: Added file extension to icon import
import TrophyIcon from '../components/icons/TrophyIcon.tsx';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactElement;
  isUnlocked: (user: User, data?: any) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_post',
    title: 'Photographer',
    description: 'Make your first post.',
    // FIX: Use React.createElement instead of JSX in a .ts file
    icon: React.createElement(TrophyIcon),
    isUnlocked: (user, data: { posts: Post[] }) => data?.posts.length >= 1,
  },
  {
    id: 'social_butterfly',
    title: 'Social Butterfly',
    description: 'Follow 10 people.',
    // FIX: Use React.createElement instead of JSX in a .ts file
    icon: React.createElement(TrophyIcon),
    isUnlocked: (user) => user.following.length >= 10,
  },
  {
    id: 'popular',
    title: 'Popular',
    description: 'Get 25 followers.',
    // FIX: Use React.createElement instead of JSX in a .ts file
    icon: React.createElement(TrophyIcon),
    isUnlocked: (user) => user.followers.length >= 25,
  },
  {
    id: 'first_match',
    title: 'Spark!',
    description: 'Get your first match.',
    // This would require tracking match data, which is not in the current User model.
    // For now, this will be a placeholder.
    // FIX: Use React.createElement instead of JSX in a .ts file
    icon: React.createElement(TrophyIcon),
    isUnlocked: (user) => false, 
  },
];