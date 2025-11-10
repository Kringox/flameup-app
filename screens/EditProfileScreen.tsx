import React, { useState, useRef, useEffect } from 'react';
// FIX: Added file extension to types import
import { User } from '../types.ts';
import { uploadPhotos } from '../utils/photoUploader.ts';
import SparklesIcon from '../components/icons/SparklesIcon.tsx';
import { db } from '../firebaseConfig.ts';
import { doc, updateDoc } from 'firebase/firestore';
import { useI18n } from '../contexts/I18nContext.ts';


interface EditProfileScreenProps {
  user: User;
  onSave: (updatedUser: User) => void;
  onClose: () => void;
}

// FIX: Add 'as const' to infer literal types for theme IDs, satisfying the 't' function's type requirements.
const THEMES = [
    { id: 'default', name: 'Default', bg: 'bg-white', text: 'text-dark-gray', border: 'border-flame-orange' },
    { id: 'dusk', name: 'Dusk', bg: 'bg-theme-dusk-bg', text: 'text-theme-dusk-text', border: 'border-gray-500' },
    { id: 'rose', name: 'Rosé', bg: 'bg-theme-rose-bg', text: 'text-theme-rose-text', border: 'border-pink-300' },
] as const;

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ user, onSave, onClose }) => {
  const [name, setName] = useState(user.name);
  const [aboutMe, setAboutMe] = useState(user.aboutMe || '');
  const [interests, setInterests] = useState(user.interests || '');
  const [lifestyle, setLifestyle] = useState(user.lifestyle || '');
  const [photos, setPhotos] = useState<(string | File)[]>([...user.profilePhotos]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([...user.profilePhotos]);
  const [isLoading, setIsLoading] = useState(false);
  const [profileTheme, setProfileTheme] = useState(user.profileTheme || 'default');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  
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
    if (!db) return;
    setIsLoading(true);
    try {
      const newFilesToUpload = photos.filter(p => p instanceof File) as File[];
      const existingUrls = photos.filter(p => typeof p === 'string') as string[];
      
      const uploadedUrls = newFilesToUpload.length > 0 ? await uploadPhotos(newFilesToUpload) : [];
      
      const finalPhotos = [...existingUrls, ...uploadedUrls];

      const updatedData = {
        name,
        aboutMe,
        interests,
        lifestyle,
        profilePhotos: finalPhotos,
        profileTheme,
      };

      await updateDoc(doc(db, 'users', user.id), updatedData);

      onSave({
        ...user,
        ...updatedData
      });

    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Could not save changes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoClick = (index: number) => {
    // Trigger file input for the clicked slot
    if (fileInputRef.current) {
        fileInputRef.current.setAttribute('data-index', String(index));
        fileInputRef.current.click();
    }
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
    <div className="absolute inset-0 bg-gray-50 dark:bg-zinc-900 z-50 flex flex-col animate-slide-in-right">
      {/* Header */}
      <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
        <button onClick={onClose} className="text-lg text-gray-600 dark:text-gray-300">{t('cancel')}</button>
        <h1 className="text-xl font-bold text-dark-gray dark:text-gray-100">{t('editProfileTitle')}</h1>
        <button onClick={handleSave} disabled={isLoading} className="text-lg font-bold text-flame-orange disabled:opacity-50">
            {isLoading ? t('saving') : t('save')}
        </button>
      </header>
      
      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Photos */}
        <div>
          <h2 className="text-md font-semibold text-gray-500 dark:text-gray-400 mb-2">{t('photos')}</h2>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="aspect-square rounded-lg bg-gray-200 dark:bg-zinc-800 flex items-center justify-center relative overflow-hidden">
                {photoPreviews[index] ? (
                  <>
                    <img src={photoPreviews[index]} alt={`Profile ${index + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => removePhoto(index)} className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full text-white text-xs flex items-center justify-center z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                     <button onClick={() => handlePhotoClick(index)} className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{t('change')}</span>
                    </button>
                  </>
                ) : (
                  <button onClick={() => handlePhotoClick(index)} className="w-8 h-8 bg-gray-300 dark:bg-zinc-700 rounded-full text-gray-500 dark:text-gray-400 flex items-center justify-center">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="mt-6">
          <label htmlFor="name" className="text-md font-semibold text-gray-500 dark:text-gray-400 mb-2 block">{t('name')}</label>
          <input 
            type="text" 
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-dark-gray dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange"
          />
        </div>

        {/* About Me */}
        <div className="mt-6">
          <label htmlFor="aboutMe" className="text-md font-semibold text-gray-500 dark:text-gray-400 mb-2 block">{t('aboutMe')}</label>
          <textarea 
            id="aboutMe"
            value={aboutMe}
            onChange={(e) => setAboutMe(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-dark-gray dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange"
            maxLength={500}
          />
           <p className="text-right text-sm text-gray-400 mt-1">{aboutMe.length} / 500</p>
        </div>

        {/* Interests */}
        <div className="mt-6">
          <label htmlFor="interests" className="text-md font-semibold text-gray-500 dark:text-gray-400 mb-2 block">{t('interests')}</label>
          <textarea 
            id="interests"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-dark-gray dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange"
            placeholder={t('interestsPlaceholder')}
            maxLength={300}
          />
           <p className="text-right text-sm text-gray-400 mt-1">{interests.length} / 300</p>
        </div>
        
        {/* Lifestyle */}
        <div className="mt-6">
          <label htmlFor="lifestyle" className="text-md font-semibold text-gray-500 dark:text-gray-400 mb-2 block">{t('lifestyle')}</label>
          <textarea 
            id="lifestyle"
            value={lifestyle}
            onChange={(e) => setLifestyle(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-dark-gray dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-flame-orange"
            placeholder={t('lifestylePlaceholder')}
            maxLength={300}
          />
           <p className="text-right text-sm text-gray-400 mt-1">{lifestyle.length} / 300</p>
        </div>

        {/* Profile Themes (Premium) */}
        {user.isPremium && (
            <div className="mt-6">
                <div className="flex items-center space-x-2 mb-2">
                    <SparklesIcon className="w-5 h-5 text-premium-gold" />
                    <h2 className="text-md font-semibold text-gray-500 dark:text-gray-400">{t('customizeProfile')}</h2>
                </div>
                <div className="p-3 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                    <h3 className="text-sm font-semibold mb-2 dark:text-gray-200">{t('profileTheme')}</h3>
                    <div className="flex space-x-2">
                        {THEMES.map(theme => (
                            <button key={theme.id} onClick={() => setProfileTheme(theme.id)} className={`flex-1 p-2 rounded-lg border-2 ${profileTheme === theme.id ? theme.border : 'border-transparent'}`}>
                                <div className={`w-full h-12 rounded-md ${theme.bg} flex items-center justify-center`}>
                                    <span className={`font-semibold text-sm ${theme.text}`}>{t(theme.id)}</span>
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