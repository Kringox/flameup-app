
import React, { useState } from 'react';

interface FilterModalProps {
  onClose: () => void;
  onApply: (filters: { ageRange: [number, number], distance: number }) => void;
  currentFilters: { ageRange: [number, number], distance: number };
}

const FilterModal: React.FC<FilterModalProps> = ({ onClose, onApply, currentFilters }) => {
  const [ageRange, setAgeRange] = useState<[number, number]>(currentFilters.ageRange);
  const [distance, setDistance] = useState(currentFilters.distance);

  const handleApply = () => {
    onApply({ ageRange, distance });
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm m-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-center">Filters</h2>
        
        <div className="my-6">
          <label className="font-semibold">Age Range</label>
          <div className="flex justify-between items-center mt-2">
            <span className="text-lg">{ageRange[0]}</span>
            <input
              type="range"
              min="18"
              max="65"
              value={ageRange[1]}
              onChange={(e) => setAgeRange([ageRange[0], parseInt(e.target.value, 10)])}
              className="w-full mx-4"
            />
            <span className="text-lg">{ageRange[1]}</span>
          </div>
        </div>

        <div className="my-6">
          <label className="font-semibold">Maximum Distance</label>
          <div className="flex justify-between items-center mt-2">
            <input
              type="range"
              min="1"
              max="100"
              value={distance}
              onChange={(e) => setDistance(parseInt(e.target.value, 10))}
              className="w-full"
            />
             <span className="text-lg ml-4">{distance} km</span>
          </div>
        </div>

        <button
          onClick={handleApply}
          className="w-full mt-4 py-3 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-lg shadow-lg"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default FilterModal;