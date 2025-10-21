import React, { useState } from 'react';
import { User } from '../types';

interface ProfileSetupScreenProps {
  onComplete: (newUser: User) => void;
}

const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({ onComplete }) => {
    const [name, setName] = useState('');
    const [birthday, setBirthday] = useState('');
    const [bio, setBio] = useState('');
    const [gender, setGender] = useState('');

    const handleComplete = () => {
        const birthDate = new Date(birthday);
        let age = 18; // Default age
        if (!isNaN(birthDate.getTime())) {
            const ageDiffMs = Date.now() - birthDate.getTime();
            const ageDate = new Date(ageDiffMs);
            age = Math.abs(ageDate.getUTCFullYear() - 1970);
        }

        const newUser: User = {
            id: `user_${Date.now()}`,
            name,
            age,
            gender,
            bio,
            profilePhotos: [
                `https://picsum.photos/seed/${name.toLowerCase() || 'user'}/800/1200`,
                `https://picsum.photos/seed/${name.toLowerCase() || 'user'}2/800/1200`,
                `https://picsum.photos/seed/${name.toLowerCase() || 'user'}3/800/1200`,
            ],
            distance: 0,
            interests: [],
        };
        onComplete(newUser);
    }

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      {/* Header */}
      <header className="flex justify-center items-center p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <h1 className="text-2xl font-bold text-dark-gray">Set Up Your Profile</h1>
      </header>
      
      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Photos */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Add Your Best Photos</h2>
          <p className="text-sm text-gray-500 mb-4">Add at least 3 photos to continue.</p>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="aspect-square rounded-lg bg-gray-200 flex items-center justify-center relative overflow-hidden cursor-pointer hover:bg-gray-300">
                <div className="w-8 h-8 bg-gray-300 rounded-full text-gray-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* About You */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">About You</h2>
          <div className="space-y-4">
            <input 
                type="text" 
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange"
            />
            <input 
                type="date" 
                placeholder="Birthday"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange text-gray-500"
            />
             <div>
                <h3 className="text-md font-semibold text-gray-600 mb-2">Gender</h3>
                <div className="flex space-x-2">
                    {['Woman', 'Man', 'Other'].map(g => (
                         <button key={g} onClick={() => setGender(g)} className={`flex-1 py-2 rounded-lg border-2 transition-colors ${gender === g ? 'bg-flame-orange text-white border-flame-orange' : 'bg-white text-gray-700 border-gray-300'}`}>{g}</button>
                    ))}
                </div>
            </div>
             <textarea 
                placeholder="Write a short bio..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange"
                maxLength={500}
            />
          </div>
        </div>

         {/* Location */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Enable Location</h2>
           <p className="text-sm text-gray-500 mb-4">We use your location to show you potential matches nearby.</p>
          <button className="w-full flex items-center justify-center py-3 border-2 border-flame-orange text-flame-orange font-bold rounded-lg hover:bg-flame-orange/10 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Enable Location
          </button>
        </div>

      </div>

      {/* Footer */}
      <footer className="p-4 bg-white border-t border-gray-200">
        <button 
            onClick={handleComplete}
            className="w-full py-3 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-lg shadow-lg transform hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!name || !bio || !gender || !birthday}
        >
            Get Started
        </button>
      </footer>
    </div>
  );
};

export default ProfileSetupScreen;