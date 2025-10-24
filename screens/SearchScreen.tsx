
import React, { useState } from 'react';
import SearchIcon from '../components/icons/SearchIcon';
import MapPinIcon from '../components/icons/MapPinIcon';

const SearchScreen: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <div className="w-full h-full flex flex-col">
            <header className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-dark-gray text-center">Discover</h1>
            </header>
            
            <div className="p-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search for users or places..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-flame-orange"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <SearchIcon className="w-5 h-5 text-gray-400" />
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center text-center p-8">
                <MapPinIcon className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700">Find People Nearby</h2>
                <p className="text-gray-500 mt-2">
                    Enable location services to discover and connect with users in your area.
                </p>
                <button className="mt-6 px-6 py-2 bg-flame-orange text-white font-bold rounded-full shadow-md">
                    Enable Location
                </button>
            </div>
        </div>
    );
};

export default SearchScreen;
