// FIX: Add file extension
import { User } from './types.ts';

// This is demo data for the UI, as we don't have a backend for swiping/matching logic yet.
export const DEMO_USERS_FOR_UI: User[] = [
  {
    id: 'demo-user-1',
    name: 'Jessica',
    age: 28,
    email: 'jessica@example.com',
    bio: 'Lover of hiking, coffee, and good books. Looking for someone to join my adventures. 🏔️☕',
    profilePhotos: ['https://images.unsplash.com/photo-1520466809213-7b9a56adcd45?q=80&w=800', 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=800'],
    interests: ['Hiking', 'Reading', 'Photography', 'Travel'],
    gender: 'Woman',
    followers: [],
    following: [],
    coins: 0,
    xp: 0,
    level: 1,
    createdAt: new Date() as any, // Cast for demo
  },
  {
    id: 'demo-user-2',
    name: 'Alex',
    age: 31,
    email: 'alex@example.com',
    bio: 'Software engineer by day, musician by night. Let\'s find the best tacos in town. 🌮🎸',
    profilePhotos: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800', 'https://images.unsplash.com/photo-1521119989659-a83eee488004?q=80&w=800'],
    interests: ['Music', 'Coding', 'Foodie', 'Concerts'],
    gender: 'Man',
    followers: [],
    following: [],
    coins: 0,
    xp: 0,
    level: 1,
    createdAt: new Date() as any,
  },
    {
    id: 'demo-user-3',
    name: 'Chloe',
    age: 25,
    email: 'chloe@example.com',
    bio: 'Art student who spends too much time in museums. Probably covered in paint. 🎨',
    profilePhotos: ['https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=800'],
    interests: ['Art', 'Museums', 'Painting', 'Indie Films'],
    gender: 'Woman',
    followers: [],
    following: [],
    coins: 0,
    xp: 0,
    level: 1,
    createdAt: new Date() as any,
  },
];
