
import React from 'react';
import { MOCK_MATCHES } from '../constants';
import { Match } from '../types';

const ChatListItem: React.FC<{ match: Match }> = ({ match }) => {
  return (
    <div className="flex items-center p-4 hover:bg-gray-100 cursor-pointer">
      <div className="relative">
        <img className="w-14 h-14 rounded-full object-cover" src={match.user.profilePhotos[0]} alt={match.user.name} />
      </div>
      <div className="flex-1 ml-4 border-b border-gray-200 pb-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">{match.user.name}</h3>
          <span className="text-xs text-gray-500">{match.timestamp}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <p className="text-gray-600 text-sm truncate w-4/5">{match.lastMessage}</p>
          {match.unreadCount > 0 && (
            <span className="bg-flame-red text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {match.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};


const ChatScreen: React.FC = () => {
  return (
    <div className="w-full">
        <header className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
            <h1 className="text-2xl font-bold text-dark-gray text-center">Chats</h1>
        </header>

        <div className="p-4">
             <input type="text" placeholder="Search chats..." className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-flame-orange" />
        </div>

        <div>
            {MOCK_MATCHES.map(match => (
                <ChatListItem key={match.id} match={match} />
            ))}
        </div>
    </div>
  );
};

export default ChatScreen;
