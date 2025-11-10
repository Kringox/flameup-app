import React, { useState } from 'react';

interface ImageViewerProps {
  images: string[];
  startIndex?: number;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ images, startIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };
  
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, currentTarget } = e;
    const { left, width } = currentTarget.getBoundingClientRect();
    const tapPosition = clientX - left;
    
    if (tapPosition < width / 3) {
      goToPrevious();
    } else {
      goToNext();
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center animate-fade-in" onClick={onClose}>
      <style>{`
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            .animate-fade-in { animation: fade-in 0.2s ease-out; }
        `}</style>
      
      <button onClick={onClose} className="absolute top-4 right-4 text-white z-[101]">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="absolute top-2 left-2 right-2 flex space-x-1 z-[101]">
        {images.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full">
            <div className={`h-full rounded-full ${index === currentIndex ? 'bg-white' : ''}`} />
          </div>
        ))}
      </div>
      
      <div className="relative w-screen h-screen flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img src={images[currentIndex]} alt={`View ${currentIndex + 1}`} className="w-full h-full object-cover" />
        <div 
          className="absolute inset-0 w-full h-full"
          onClick={handleTap}
        />
      </div>
    </div>
  );
};

export default ImageViewer;