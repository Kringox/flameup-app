
import { User, Story, Post, Match } from './types';

export const MOCK_CURRENT_USER: User = {
    id: 'currentUser',
    name: 'Alex',
    age: 28,
    gender: 'Man',
    profilePhotos: [
        'https://picsum.photos/seed/alex/800/1200',
        'https://picsum.photos/seed/alex2/800/1200',
    ],
    bio: 'Software engineer by day, adventurer by weekend. Looking for someone to join my next journey. 🏔️💻☕',
    distance: 0,
    interests: ['Coding', 'Hiking', 'Coffee', 'Photography'],
};

export const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Jessica',
    age: 26,
    gender: 'Woman',
    profilePhotos: ['https://picsum.photos/seed/jessica/800/1200', 'https://picsum.photos/seed/jessica2/800/1200', 'https://picsum.photos/seed/jessica3/800/1200'],
    bio: 'Lover of art, music, and spontaneous road trips. Let\'s find a gallery to get lost in.',
    distance: 2,
    interests: ['Art', 'Music', 'Travel', 'Yoga'],
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
  },
];

export const MOCK_STORIES: Story[] = [
    { id: 's1', user: { id: MOCK_CURRENT_USER.id, name: 'Your Story', profilePhoto: MOCK_CURRENT_USER.profilePhotos[0] }, mediaUrl: '', viewed: true },
    { id: 's2', user: { id: '1', name: 'Jessica', profilePhoto: MOCK_USERS[0].profilePhotos[0] }, mediaUrl: 'https://picsum.photos/seed/story_jessica/400/600', viewed: false },
    { id: 's3', user: { id: '2', name: 'Mike', profilePhoto: MOCK_USERS[1].profilePhotos[0] }, mediaUrl: 'https://picsum.photos/seed/story_mike/400/600', viewed: false },
    { id: 's4', user: { id: '3', name: 'Chloe', profilePhoto: MOCK_USERS[2].profilePhotos[0] }, mediaUrl: 'https://picsum.photos/seed/story_chloe/400/600', viewed: true },
    { id: 's5', user: { id: '4', name: 'David', profilePhoto: MOCK_USERS[3].profilePhotos[0] }, mediaUrl: 'https://picsum.photos/seed/story_david/400/600', viewed: false },
];

export const MOCK_POSTS: Post[] = [
    {
        id: 'p1',
        user: { id: '1', name: 'Jessica', profilePhoto: MOCK_USERS[0].profilePhotos[0] },
        mediaUrls: ['https://picsum.photos/seed/post_jessica/1080/1080'],
        caption: 'Beautiful sunset at the beach today! 🌅 #sunset #beachlife #nofilter',
        likes: 124,
        comments: 12,
        timestamp: '2 hours ago',
    },
    {
        id: 'p2',
        user: { id: '2', name: 'Mike', profilePhoto: MOCK_USERS[1].profilePhotos[0] },
        mediaUrls: ['https://picsum.photos/seed/post_mike/1080/1080'],
        caption: 'Morning hike with the best boy! 🐶 #dogsofinstagram #hiking #adventure',
        likes: 256,
        comments: 34,
        timestamp: '5 hours ago',
    },
    {
        id: 'p3',
        user: { id: 'currentUser', name: MOCK_CURRENT_USER.name, profilePhoto: MOCK_CURRENT_USER.profilePhotos[0] },
        mediaUrls: ['https://picsum.photos/seed/post_alex/1080/1080'],
        caption: 'New project deployed! Time for some well-deserved coffee. ☕️ #coding #developer #coffee',
        likes: 98,
        comments: 21,
        timestamp: '1 day ago',
    }
];

export const MOCK_MATCHES: Match[] = [
    {
        id: 'm1',
        user: MOCK_USERS[0],
        lastMessage: "Hey! Loved your profile. That gallery sounds amazing.",
        timestamp: "10:32 AM",
        unreadCount: 2,
    },
    {
        id: 'm2',
        user: MOCK_USERS[3],
        lastMessage: "You had me at tacos. We should definitely go!",
        timestamp: "Yesterday",
        unreadCount: 0,
    }
];