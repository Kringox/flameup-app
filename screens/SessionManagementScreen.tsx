import React from 'react';

interface SessionManagementScreenProps {
  onClose: () => void;
}

const SessionManagementScreen: React.FC<SessionManagementScreenProps> = ({ onClose }) => {
  // This is a placeholder. A real implementation would require a backend
  // to track sessions and provide an API to list and revoke them.
  const mockSessions = [
    { id: '1', device: 'Chrome on macOS', location: 'New York, USA', lastActive: 'Now', isCurrent: true },
    { id: '2', device: 'FlameUp for iOS', location: 'Los Angeles, USA', lastActive: '2 hours ago', isCurrent: false },
  ];

  return (
    <div className="absolute inset-0 bg-gray-100 z-[80] flex flex-col">
      <header className="flex items-center p-4 border-b bg-white">
        <button onClick={onClose} className="w-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-center flex-1">Manage Sessions</h1>
        <div className="w-8"></div>
      </header>
      <main className="flex-1 p-4 space-y-3">
        {mockSessions.map(session => (
          <div key={session.id} className="bg-white rounded-lg p-4 shadow-sm">
            <p className="font-bold">{session.device}</p>
            <p className="text-sm text-gray-600">{session.location}</p>
            <p className="text-xs text-gray-500 mt-1">Last active: {session.lastActive}</p>
            {session.isCurrent ? (
              <p className="text-sm font-semibold text-green-600 mt-2">Current Session</p>
            ) : (
              <button className="mt-2 text-sm font-semibold text-error-red">Log Out</button>
            )}
          </div>
        ))}
      </main>
    </div>
  );
};

export default SessionManagementScreen;
