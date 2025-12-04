
import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { User } from '../types.ts';
import XIcon from './icons/XIcon.tsx';
import HotnessDisplay from './HotnessDisplay.tsx';

interface RankingModalProps {
    onClose: () => void;
    onViewProfile: (userId: string) => void;
}

const RankingModal: React.FC<RankingModalProps> = ({ onClose, onViewProfile }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRankings = async () => {
            if (!db) return;
            const q = query(collection(db, 'users'), orderBy('hotnessScore', 'desc'), limit(50));
            const snap = await getDocs(q);
            setUsers(snap.docs.map(d => ({id: d.id, ...d.data()} as User)));
            setLoading(false);
        };
        fetchRankings();
    }, []);

    return (
        <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col animate-slide-in-right">
            <header className="flex items-center p-4 border-b border-zinc-800 bg-zinc-900 sticky top-0">
                <button onClick={onClose}><XIcon className="w-6 h-6 text-gray-400" /></button>
                <h1 className="flex-1 text-center text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 uppercase italic">
                    Global Hotness
                </h1>
                <div className="w-6"></div>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? <div className="text-center text-gray-500 mt-10">Loading Rankings...</div> : (
                    <div className="space-y-4">
                        {users.map((user, index) => (
                            <div key={user.id} onClick={() => { onViewProfile(user.id); onClose(); }} className="flex items-center bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50 hover:bg-zinc-800 transition-colors cursor-pointer">
                                <div className={`w-8 text-center font-bold text-lg ${index < 3 ? 'text-yellow-400' : 'text-gray-500'}`}>#{index + 1}</div>
                                <img src={user.profilePhotos[0]} className="w-12 h-12 rounded-full object-cover mx-4 border border-zinc-600" />
                                <div className="flex-1">
                                    <p className="font-bold text-white">{user.name}</p>
                                    <p className="text-xs text-gray-500">{user.followers?.length || 0} Followers</p>
                                </div>
                                <HotnessDisplay score={user.hotnessScore || 0} size="sm" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RankingModal;
