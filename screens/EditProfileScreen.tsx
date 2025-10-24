import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { uploadPhotos } from '../utils/photoUploader';
import SparklesIcon from '../components/icons/SparklesIcon';

interface EditProfileScreenProps {
  user: User;
  onSave: (updatedUser: User) => void;
  onClose: () => void;
}

const THEMES = [
    { id: 'default', name: 'Default', bg: 'bg-white', text: 'text-dark-gray', border: 'border-flame-orange' },
    { id: 'dusk', name: 'Dusk', bg: 'bg-theme-dusk-bg', text: 'text-theme-dusk-text', border: 'border-gray-500' },
    { id: 'rose', name: 'Rosé', bg: 'bg-theme-rose-bg', text: 'text-theme-rose-text', border: 'border-pink-300' },
]

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ user, onSave, onClose }) => {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [interests, setInterests] = useState([...user.interests]);
  const [photos, setPhotos] = useState<(string | File)[]>([...user.profilePhotos]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([...user.profilePhotos]);
  const [isLoading, setIsLoading] = useState(false);
  const [profileTheme, setProfileTheme] = useState(user.profileTheme || 'default');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Create or revoke object URLs for previews
    const newPreviews = photos.map(p => typeof p === 'string' ? p : URL.createObjectURL(p));
    setPhotoPreviews(newPreviews);
    
    return () => {
      newPreviews.forEach(p => {
        if (p.startsWith('blob:')) {
          URL.revokeObjectURL(p);
        }
      });
    };
  }, [photos]);


  const handleSave = async () => {
    setIsLoading(true);
    try {
      const newFilesToUpload = photos.filter(p => p instanceof File) as File[];
      const existingUrls = photos.filter(p => typeof p === 'string') as string[];
      
      const uploadedUrls = newFilesToUpload.length > 0 ? await uploadPhotos(newFilesToUpload) : [];

      onSave({
        ...user,
        name,
        bio,
        interests,
        profilePhotos: [...existingUrls, ...uploadedUrls],
        profileTheme,
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Could not save changes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const removeInterest = (interestToRemove: string) => {
    setInterests(interests.filter(i => i !== interestToRemove));
  };

  const handlePhotoClick = (index: number) => {
    // Trigger file input for the clicked slot
    fileInputRef.current?.setAttribute('data-index', String(index));
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const indexStr = event.currentTarget.getAttribute('data-index');
    if (file && indexStr !== null) {
      const index = parseInt(indexStr, 10);
      const newPhotos = [...photos];
      newPhotos[index] = file;
      setPhotos(newPhotos);
    }
    if(event.target) {
        event.target.value = '';
    }
  };
  
  const removePhoto = (index: number) => {
      if (photos.length <= 1) {
          alert("You must have at least one profile photo.");
          return;
      }
      const newPhotos = [...photos];
      newPhotos.splice(index, 1);
      setPhotos(newPhotos);
  }


  return (
    <div className="absolute inset-0 bg-gray-50 z-50 flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <button onClick={onClose} className="text-lg text-gray-600">Cancel</button>
        <h1 className="text-xl font-bold text-dark-gray">Edit Profile</h1>
        <button onClick={handleSave} disabled={isLoading} className="text-lg font-bold text-flame-orange disabled:opacity-50">
            {isLoading ? 'Saving...' : 'Save'}
        </button>
      </header>
      
      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Photos */}
        <div>
          <h2 className="text-md font-semibold text-gray-500 mb-2">Photos</h2>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="aspect-square rounded-lg bg-gray-200 flex items-center justify-center relative overflow-hidden">
                {photoPreviews[index] ? (
                  <>
                    <img src={photoPreviews[index]} alt={`Profile ${index + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => removePhoto(index)} className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full text-white text-xs flex items-center justify-center z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                     <button onClick={() => handlePhotoClick(index)} className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white font-bold text-sm">Change</span>
                    </button>
                  </>
                ) : (
                  <button onClick={() => handlePhotoClick(index)} className="w-8 h-8 bg-gray-300 rounded-full text-gray-500 flex items-center justify-center">
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
             <input type="text" placeholder="Add interest..." onKeyDown={(e) => {
                 if (e.key === 'Enter' && e.currentTarget.value.trim() !== '' && interests.length < 10) {
                     setInterests([...interests, e.currentTarget.value.trim()]);
                     e.currentTarget.value = '';
                 }
             }} className="bg-gray-100 rounded-full px-3 py-1 text-sm flex-1 min-w-[100px]" />
          </div>
        </div>

        {/* Profile Themes (Premium) */}
        {user.isPremium && (
            <div className="mt-6">
                <div className="flex items-center space-x-2 mb-2">
                    <SparklesIcon className="w-5 h-5 text-premium-gold" />
                    <h2 className="text-md font-semibold text-gray-500">Customize Profile (Premium)</h2>
                </div>
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <h3 className="text-sm font-semibold mb-2">Profile Theme</h3>
                    <div className="flex space-x-2">
                        {THEMES.map(theme => (
                            <button key={theme.id} onClick={() => setProfileTheme(theme.id)} className={`flex-1 p-2 rounded-lg border-2 ${profileTheme === theme.id ? theme.border : 'border-transparent'}`}>
                                <div className={`w-full h-12 rounded-md ${theme.bg} flex items-center justify-center`}>
                                    <span className={`font-semibold text-sm ${theme.text}`}>{theme.name}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default EditProfileScreen;