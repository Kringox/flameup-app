import React, { useState } from 'react';
import { MOCK_USERS } from '../constants';
import { User } from '../types';
import FlameIcon from '../components/icons/FlameIcon';

const ProfileCard: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-gray-300">
      <img src={user.profilePhotos[0]} alt={user.name} className="w-full h-full object-cover" />
      <div className="absolute bottom-0 left-0 w-full h-2/5 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col justify-end">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-white text-3xl font-bold drop-shadow-lg">{user.name}, {user.age}</h2>
            <p className="text-white text-md drop-shadow-md">{user.distance} km away</p>
          </div>
          <button className="w-10 h-10 rounded-full border-2 border-white/50 flex items-center justify-center backdrop-blur-sm bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>
        <p className="text-gray-200 text-sm mt-2 line-clamp-2 drop-shadow-md">{user.bio}</p>
      </div>
    </div>
  );
};

const MatchModal: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 animate-fade-in">
      <style>{`
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center text-center w-11/12 max-w-sm">
        <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-flame-orange to-flame-red">It's a Match! 🔥</h2>
        <p className="text-gray-600 mt-2">You and {user.name} have liked each other.</p>
        <div className="flex items-center space-x-4 my-6">
          <img src="https://picsum.photos/seed/alex/200/200" alt="Current User" className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg" />
          <img src={user.profilePhotos[0]} alt={user.name} className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg" />
        </div>
        <button className="w-full py-3 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-full mb-3 shadow-lg transform hover:scale-105 transition-transform">
          Send a Message
        </button>
        <button onClick={onClose} className="w-full py-3 text-gray-600 font-semibold rounded-full">
          Keep Swiping
        </button>
      </div>
    </div>
  );
};

const SwipeScreen: React.FC = () => {
    const [users, setUsers] = useState(MOCK_USERS);
    const [coins, setCoins] = useState(125);
    const [showMatch, setShowMatch] = useState<User | null>(null);
    const [swipedUserId, setSwipedUserId] = useState<string | null>(null);
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | null>(null);

    const handleSwipe = (direction: 'left' | 'right' | 'up') => {
        if (users.length === 0 || swipedUserId) return;

        const cost = direction === 'up' ? 2 : 1;
        if (coins >= cost) {
            setCoins(c => c - cost);
            setSwipeDirection(direction);
            setSwipedUserId(users[0].id);

            setTimeout(() => {
                const isMatch = Math.random() > 0.7; // 30% chance of a match
                if (isMatch && direction !== 'left') {
                    setShowMatch(users[0]);
                }
                setUsers(currentUsers => currentUsers.slice(1));
                setSwipedUserId(null);
                setSwipeDirection(null);
            }, 400); // Corresponds to animation duration
        } else {
            alert("No more coins!");
        }
    };

    const closeMatchModal = () => {
        setShowMatch(null);
    };
  
    return (
    <div className="flex flex-col h-full w-full bg-gray-100 overflow-hidden">
      {showMatch && <MatchModal user={showMatch} onClose={closeMatchModal} />}
      <header className="flex justify-between items-center p-4 bg-white border-b flex-shrink-0">
        <FlameIcon className="w-8 h-8" isGradient={true} />
        <div className="flex items-center space-x-2 bg-yellow-100 text-yellow-700 font-bold px-3 py-1 rounded-full">
            <span>🪙</span>
            <span>{coins} Coins</span>
        </div>
      </header>

      <div className="flex-1 relative flex items-center justify-center p-4">
        {users.length > 0 ? (
            users.slice(0, 2).reverse().map((user, index) => {
                const isTopCard = index === 1;
                const isSwiping = isTopCard && swipedUserId === user.id;

                let swipeClass = '';
                if (isSwiping) {
                    if (swipeDirection === 'left') swipeClass = 'transform -translate-x-full -rotate-15';
                    if (swipeDirection === 'right') swipeClass = 'transform translate-x-full rotate-15';
                    if (swipeDirection === 'up') swipeClass = 'transform -translate-y-full';
                }

                return (
                    <div 
                        key={user.id} 
                        className={`absolute w-full h-full transition-all duration-300 ease-in-out ${swipeClass} ${isTopCard ? 'transform scale-100' : 'transform scale-95 -translate-y-2'}`}
                    >
                        <ProfileCard user={user} />
                    </div>
                );
            })
        ) : (
            <div className="w-full h-full flex flex-col justify-center items-center text-center p-8 bg-white rounded-2xl shadow-lg">
                <FlameIcon className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-xl font-semibold text-gray-700">That's everyone for now!</p>
                <p className="text-gray-500 mt-2 mb-6">Check back later or adjust your filters to see new profiles.</p>
                <button className="py-3 px-6 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition-transform">
                    Adjust Filters
                </button>
            </div>
        )}
      </div>

      {users.length > 0 && (
          <div className="flex justify-around items-center w-full max-w-md mx-auto px-4 pb-6 pt-2">
              <button className="bg-white rounded-full p-3 shadow-lg transform hover:scale-110 transition-transform text-yellow-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.5 9.5A8.5 8.5 0 0112 4.055a8.5 8.5 0 019.5 9.5M20 20v-5h-5" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.5 14.5a8.5 8.5 0 01-9.5 5.445A8.5 8.5 0 012.5 14.5" /></svg>
              </button>
              <button onClick={() => handleSwipe('left')} className="bg-white rounded-full p-5 shadow-xl transform hover:scale-110 transition-transform text-error-red">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <button onClick={() => handleSwipe('up')} className="bg-white rounded-full p-3 shadow-lg transform hover:scale-110 transition-transform text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              </button>
              <button onClick={() => handleSwipe('right')} className="bg-white rounded-full p-5 shadow-xl transform hover:scale-110 transition-transform text-success-green">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
              </button>
              <button className="bg-white rounded-full p-3 shadow-lg transform hover:scale-110 transition-transform text-purple-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
              </button>
          </div>
      )}
    </div>
  );
};

export default SwipeScreen;
