import React, { useState } from 'react';
import { User } from '../types';

interface EditProfileScreenProps {
  user: User;
  onSave: (updatedUser: User) => void;
  onClose: () => void;
}

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ user, onSave, onClose }) => {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [interests, setInterests] = useState([...user.interests]);
  const [photos, setPhotos] = useState([...user.profilePhotos]);

  const handleSave = () => {
    onSave({
      ...user,
      name,
      bio,
      interests,
      profilePhotos: photos,
    });
  };
  
  const removeInterest = (interestToRemove: string) => {
    setInterests(interests.filter(i => i !== interestToRemove));
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <button onClick={onClose} className="text-lg text-gray-600">Cancel</button>
        <h1 className="text-xl font-bold text-dark-gray">Edit Profile</h1>
        <button onClick={handleSave} className="text-lg font-bold text-flame-orange">Save</button>
      </header>
      
      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Photos */}
        <div>
          <h2 className="text-md font-semibold text-gray-500 mb-2">Photos</h2>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="aspect-square rounded-lg bg-gray-200 flex items-center justify-center relative overflow-hidden">
                {photos[index] ? (
                  <>
                    <img src={photos[index]} alt={`Profile ${index + 1}`} className="w-full h-full object-cover" />
                    <button className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full text-white text-xs flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </>
                ) : (
                  <button className="w-8 h-8 bg-gray-300 rounded-full text-gray-500 flex items-center justify-center">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="mt-6">
          <label htmlFor="name" className="text-md font-semibold text-gray-500 mb-2 block">Name</label>
          <input 
            type="text" 
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange"
          />
        </div>

        {/* Bio */}
        <div className="mt-6">
          <label htmlFor="bio" className="text-md font-semibold text-gray-500 mb-2 block">Bio</label>
          <textarea 
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange"
            maxLength={500}
          />
           <p className="text-right text-sm text-gray-400 mt-1">{bio.length} / 500</p>
        </div>

        {/* Interests */}
        <div className="mt-6">
          <h2 className="text-md font-semibold text-gray-500 mb-2">Interests</h2>
          <div className="flex flex-wrap gap-2">
            {interests.map(interest => (
              <div key={interest} className="flex items-center bg-flame-orange/20 text-flame-red font-semibold rounded-full px-3 py-1 text-sm">
                <span>{interest}</span>
                <button onClick={() => removeInterest(interest)} className="ml-2 text-flame-red/70 hover:text-flame-red">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfileScreen;