import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
// FIX: Added file extension to types import
import { User } from '../types.ts';
// FIX: Added file extension to photoUploader import
import { uploadPhotos } from '../utils/photoUploader.ts';

interface ProfileSetupScreenProps {
  user: { uid: string; email: string | null };
  onSetupComplete: (user: User) => void;
}

const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({ user, onSetupComplete }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState<number>(18);
  const [gender, setGender] = useState<'Man' | 'Woman' | 'Other'>('Woman');
  const [photos, setPhotos] = useState<(File | null)[]>([null, null, null]);
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([null, null, null]);
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const newPhotos = [...photos];
      newPhotos[index] = file;
      setPhotos(newPhotos);

      const newPreviews = [...photoPreviews];
      newPreviews[index] = URL.createObjectURL(file);
      setPhotoPreviews(newPreviews);
    }
  };

  const handleFinish = async () => {
    setIsLoading(true);
    try {
        const filesToUpload = photos.filter(p => p !== null) as File[];
        if (filesToUpload.length === 0) {
            alert("Please upload at least one photo.");
            setIsLoading(false);
            return;
        }
      const uploadedUrls = await uploadPhotos(filesToUpload);

      const newUser: User = {
        id: user.uid,
        email: user.email!,
        name,
        age,
        gender,
        profilePhotos: uploadedUrls,
        bio,
        interests,
        followers: [],
        following: [],
        coins: 100, // Welcome bonus
        xp: 0,
        level: 1,
        createdAt: Timestamp.now(),
      };

      if (!db) {
        throw new Error("Firestore is not initialized");
      }
      await setDoc(doc(db, 'users', user.uid), newUser);
      onSetupComplete(newUser);
    } catch (error) {
      console.error("Error setting up profile:", error);
      alert("Could not complete profile setup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1: // Photos
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Add Your Photos</h2>
            <div className="grid grid-cols-2 gap-4">
              {photoPreviews.map((preview, index) => (
                <div key={index} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, index)} className="hidden" id={`photo-upload-${index}`} />
                  <label htmlFor={`photo-upload-${index}`} className="cursor-pointer w-full h-full">
                    {preview ? <img src={preview} alt={`preview ${index}`} className="w-full h-full object-cover rounded-lg"/> : <span className="text-3xl text-gray-400">+</span>}
                  </label>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="w-full mt-6 py-3 bg-flame-orange text-white font-bold rounded-lg">Next</button>
          </div>
        );
      case 2: // Details
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">About You</h2>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="w-full mb-4 p-3 border rounded-lg" />
            <input type="number" value={age} onChange={e => setAge(parseInt(e.target.value))} placeholder="Age" className="w-full mb-4 p-3 border rounded-lg" />
            <select value={gender} onChange={e => setGender(e.target.value as any)} className="w-full mb-4 p-3 border rounded-lg">
              <option>Woman</option>
              <option>Man</option>
              <option>Other</option>
            </select>
             <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio" className="w-full mb-4 p-3 border rounded-lg" rows={3}/>
            <button onClick={() => setStep(3)} className="w-full mt-6 py-3 bg-flame-orange text-white font-bold rounded-lg">Next</button>
          </div>
        );
      case 3: // Interests & Finish
         return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Your Interests</h2>
            <p className="text-gray-500 mb-4">Add up to 5 interests. Press Enter to add.</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {interests.map(i => <div key={i} className="bg-flame-orange/20 text-flame-red font-semibold rounded-full px-3 py-1">{i}</div>)}
            </div>
            <input type="text" placeholder="Type an interest..." onKeyDown={(e) => {
                 if (e.key === 'Enter' && e.currentTarget.value && interests.length < 5) {
                     setInterests([...interests, e.currentTarget.value]);
                     e.currentTarget.value = '';
                 }
             }} className="w-full p-3 border rounded-lg"/>
            <button onClick={handleFinish} disabled={isLoading} className="w-full mt-6 py-3 bg-flame-orange text-white font-bold rounded-lg disabled:opacity-50">
                {isLoading ? 'Finishing...' : 'Finish Setup'}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-screen flex justify-center items-center bg-gray-100 p-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-lg">
        {renderStep()}
      </div>
    </div>
  );
};

export default ProfileSetupScreen;