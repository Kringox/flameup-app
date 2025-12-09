
import React, { useState } from 'react';
import { SwipeFilters } from '../types.ts';
import MapPinIcon from './icons/MapPinIcon.tsx';
import FilterIcon from './icons/FilterIcon.tsx';
import { useI18n } from '../contexts/I18nContext.ts';

interface FilterModalProps {
  onClose: () => void;
  onApply: (filters: SwipeFilters) => void;
  currentFilters: SwipeFilters;
}

const FilterModal: React.FC<FilterModalProps> = ({ onClose, onApply, currentFilters }) => {
  const [useMyLocation, setUseMyLocation] = useState(currentFilters.useMyLocation);
  const [manualLocation, setManualLocation] = useState(currentFilters.manualLocation || '');
  const [maxDistance, setMaxDistance] = useState(currentFilters.maxDistance);
  const [ageRange, setAgeRange] = useState<[number, number]>(currentFilters.ageRange);
  const [interestInput, setInterestInput] = useState('');
  const [interests, setInterests] = useState<string[]>(currentFilters.requiredInterests || []);
  const { t } = useI18n();

  const handleApply = () => {
    onApply({
      useMyLocation,
      manualLocation: useMyLocation ? undefined : manualLocation,
      maxDistance,
      ageRange,
      requiredInterests: interests
    });
    onClose();
  };

  const addInterest = () => {
      if (interestInput.trim()) {
          setInterests(prev => [...prev, interestInput.trim()]);
          setInterestInput('');
      }
  };

  const removeInterest = (index: number) => {
      setInterests(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="absolute inset-0 bg-black/70 z-50 flex justify-center items-end md:items-center" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-800 rounded-t-2xl md:rounded-2xl w-full max-w-sm md:m-4 p-6 max-h-[90vh] overflow-y-auto animate-slide-in-right" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center dark:text-white">
                <FilterIcon className="w-6 h-6 mr-2 text-flame-orange" />
                {t('filters')}
            </h2>
            <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800">{t('close')}</button>
        </div>
        
        {/* Location Section */}
        <div className="mb-6 bg-gray-50 dark:bg-zinc-700/50 p-4 rounded-xl">
            <h3 className="font-bold text-sm uppercase text-gray-500 dark:text-gray-400 mb-3 tracking-wide">{t('locationSource')}</h3>
            <div className="flex bg-white dark:bg-zinc-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-zinc-700 mb-4">
                <button 
                    onClick={() => setUseMyLocation(true)}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${useMyLocation ? 'bg-flame-orange text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}
                >
                    {t('myGps')}
                </button>
                <button 
                    onClick={() => setUseMyLocation(false)}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${!useMyLocation ? 'bg-flame-orange text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}
                >
                    {t('manual')}
                </button>
            </div>

            {!useMyLocation && (
                <div className="mb-2">
                    <input 
                        type="text"
                        value={manualLocation}
                        onChange={(e) => setManualLocation(e.target.value)}
                        placeholder={t('enterCity')}
                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-dark-gray dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-flame-orange"
                    />
                </div>
            )}

            {useMyLocation && (
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="font-semibold dark:text-gray-200">{t('radius')}</label>
                        <span className="text-flame-orange font-bold">{maxDistance} km</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="100"
                        value={maxDistance}
                        onChange={(e) => setMaxDistance(parseInt(e.target.value, 10))}
                        className="w-full accent-flame-orange h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            )}
        </div>

        {/* Interests Section */}
        <div className="mb-6">
            <h3 className="font-bold text-sm uppercase text-gray-500 dark:text-gray-400 mb-3 tracking-wide">{t('interests')}</h3>
            <div className="flex mb-2">
                <input 
                    type="text" 
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    placeholder={t('interestsPlaceholder')} 
                    className="flex-1 p-2 border border-gray-300 dark:border-zinc-600 rounded-l-lg dark:bg-zinc-800 dark:text-white focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && addInterest()}
                />
                <button onClick={addInterest} className="bg-flame-orange text-white px-4 rounded-r-lg font-bold">+</button>
            </div>
            <div className="flex flex-wrap gap-2">
                {interests.map((interest, idx) => (
                    <span key={idx} className="bg-gray-100 dark:bg-zinc-700 text-dark-gray dark:text-gray-200 px-3 py-1 rounded-full text-sm flex items-center">
                        {interest}
                        <button onClick={() => removeInterest(idx)} className="ml-2 text-red-500 font-bold">×</button>
                    </span>
                ))}
                {interests.length === 0 && <span className="text-sm text-gray-400 italic">{t('noInterests')}</span>}
            </div>
        </div>

        {/* Age Range */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
             <label className="font-semibold dark:text-gray-200">{t('ageRange')}</label>
             <span className="text-flame-orange font-bold">{ageRange[0]} - {ageRange[1]}</span>
          </div>
          <div className="flex items-center space-x-4">
             <input
              type="range"
              min="18"
              max="99"
              value={ageRange[0]}
              onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val <= ageRange[1]) setAgeRange([val, ageRange[1]]);
              }}
              className="w-full accent-flame-orange h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
             <input
              type="range"
              min="18"
              max="99"
              value={ageRange[1]}
              onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val >= ageRange[0]) setAgeRange([ageRange[0], val]);
              }}
              className="w-full accent-flame-orange h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={handleApply}
          className="w-full py-3 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        >
          {t('applyFilters')}
        </button>
      </div>
    </div>
  );
};

export default FilterModal;
