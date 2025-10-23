import { Timestamp } from 'firebase/firestore';
import { User, Story, Post, Match } from './types';

// MOCK_USERS and MOCK_CURRENT_USER are no longer needed as data comes from Firebase.

// Kept for UI demonstration purposes
// FIX: Export `DEMO_USERS_FOR_UI` to make it accessible to other modules.
export const DEMO_USERS_FOR_UI: User[] = [
  {
    id: '1',
    name: 'Jessica',
    age: 26,
    gender: 'Woman',
    profilePhotos: ['https://picsum.photos/seed/jessica/800/1200', 'https://picsum.photos/seed/jessica2/800/1200', 'https://picsum.photos/seed/jessica3/800/1200'],
    bio: 'Lover of art, music, and spontaneous road trips. Let\'s find a gallery to get lost in.',
    distance: 2,
    interests: ['Art', 'Music', 'Travel', 'Yoga'],
    email: 'jessica@example.com',
    followers: [],
    following: [],
    coins: 100,
    createdAt: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
  },
  {
    id: '2',
    name: 'Mike',
    age: 29,
    gender: 'Man',
    profilePhotos: ['https://picsum.photos/seed/mike/800/1200', 'https://picsum.photos/seed/mike2/800/1200'],
    bio: 'Fitness enthusiast and dog lover. My golden retriever is my best friend. Looking for a workout partner.',
    distance: 5,
    interests: ['Fitness', 'Dogs', 'Cooking', 'Movies'],
    email: 'mike@example.com',
    followers: [],
    following: [],
    coins: 100,
    createdAt: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
  },
  {
    id: '3',
    name: 'Chloe',
    age: 24,
    gender: 'Woman',
    profilePhotos: ['https://picsum.photos/seed/chloe/800/1200', 'https://picsum.photos/seed/chloe2/800/1200', 'https://picsum.photos/seed/chloe3/800/1200'],
    bio: 'Just a girl who loves books, cats, and cozy rainy days. Fluent in sarcasm and movie quotes.',
    distance: 8,
    interests: ['Reading', 'Cats', 'Netflix', 'Baking'],
    email: 'chloe@example.com',
    followers: [],
    following: [],
    coins: 100,
    createdAt: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
  },
   {
    id: '4',
    name: 'David',
    age: 31,
    gender: 'Man',
    profilePhotos: ['https://picsum.photos/seed/david/800/1200', 'https://picsum.photos/seed/david2/800/1200'],
    bio: 'Entrepreneur and foodie. Always on the hunt for the best tacos in town. Tell me your favorite spot!',
    distance: 3,
    interests: ['Startups', 'Food', 'Whiskey', 'Concerts'],
    email: 'david@example.com',
    followers: [],
    following: [],
    coins: 100,
    createdAt: Timestamp.fromDate(new Date()),
  },
];


// FIX: Added missing 'timestamp' property to each story object to satisfy the Story interface.
export const MOCK_STORIES: Story[] = [
    { id: 's1', user: { id: 'currentUser', name: 'Your Story', profilePhoto: 'https://picsum.photos/seed/alex/800/1200' }, mediaUrl: '', viewed: true, timestamp: new Date() },
    { id: 's2', user: { id: '1', name: 'Jessica', profilePhoto: DEMO_USERS_FOR_UI[0].profilePhotos[0] }, mediaUrl: 'https://picsum.photos/seed/story_jessica/400/600', viewed: false, timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    { id: 's3', user: { id: '2', name: 'Mike', profilePhoto: DEMO_USERS_FOR_UI[1].profilePhotos[0] }, mediaUrl: 'https://picsum.photos/seed/story_mike/400/600', viewed: false, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { id: 's4', user: { id: '3', name: 'Chloe', profilePhoto: DEMO_USERS_FOR_UI[2].profilePhotos[0] }, mediaUrl: 'https://picsum.photos/seed/story_chloe/400/600', viewed: true, timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000) },
    { id: 's5', user: { id: '4', name: 'David', profilePhoto: DEMO_USERS_FOR_UI[3].profilePhotos[0] }, mediaUrl: 'https://picsum.photos/seed/story_david/400/600', viewed: false, timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000) },
];

// FIX: Updated MOCK_POSTS to align with the Post interface in types.ts.
// Changed 'likes' to 'likedBy' (an array of user IDs), 'comments' to 'commentCount', and added 'userId'.
export const MOCK_POSTS: Post[] = [
    {
        id: 'p1',
        userId: '1',
        user: { id: '1', name: 'Jessica', profilePhoto: DEMO_USERS_FOR_UI[0].profilePhotos[0] },
        mediaUrls: ['https://picsum.photos/seed/post_jessica/1080/1080'],
        caption: 'Beautiful sunset at the beach today! 🌅 #sunset #beachlife #nofilter',
        likedBy: ['2', '3', '4'],
        commentCount: 12,
        timestamp: '2 hours ago',
    },
    {
        id: 'p2',
        userId: '2',
        user: { id: '2', name: 'Mike', profilePhoto: DEMO_USERS_FOR_UI[1].profilePhotos[0] },
        mediaUrls: ['https://picsum.photos/seed/post_mike/1080/1080'],
        caption: 'Morning hike with the best boy! 🐶 #dogsofinstagram #hiking #adventure',
        likedBy: ['1', '3'],
        commentCount: 34,
        timestamp: '5 hours ago',
    },
];

// FIX: Corrected user object shape to match `Match.user` interface and changed timestamp from string to a `Timestamp` object.
export const MOCK_MATCHES: Match[] = [
    {
        id: 'm1',
        user: {
            id: DEMO_USERS_FOR_UI[0].id,
            name: DEMO_USERS_FOR_UI[0].name,
            profilePhoto: DEMO_USERS_FOR_UI[0].profilePhotos[0],
        },
        lastMessage: "Hey! Loved your profile. That gallery sounds amazing.",
        timestamp: Timestamp.fromDate(new Date(new Date().setHours(10, 32, 0, 0))),
        unreadCount: 2,
    },
    {
        id: 'm2',
        user: {
            id: DEMO_USERS_FOR_UI[3].id,
            name: DEMO_USERS_FOR_UI[3].name,
            profilePhoto: DEMO_USERS_FOR_UI[3].profilePhotos[0],
        },
        lastMessage: "You had me at tacos. We should definitely go!",
        timestamp: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)),
        unreadCount: 0,
    }
];