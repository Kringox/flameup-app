
import React from 'react';
import BarChartIcon from '../components/icons/BarChartIcon';
import UsersIcon from '../components/icons/UsersIcon';
import HeartIcon from '../components/icons/HeartIcon';
import AnalyticsCard from '../components/AnalyticsCard';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import ActivityHeatmap from '../components/charts/ActivityHeatmap';
import { User } from '../types.ts';
import FlameIcon from '../components/icons/FlameIcon.tsx';

interface AnalyticsScreenProps {
  onClose: () => void;
  user: User;
}

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ onClose, user }) => {
  const isPremium = user.isPremium;

  // Mock data (replace with real data if available in user.analytics)
  const mockProfileViews = { label: 'Views', value: user.analytics?.profileViews || 42 };
  const mockLikesData = { label: 'Likes', value: user.analytics?.totalLikesReceived || 15 };
  const mockFollowersData = [
      { label: 'Mon', value: 5 }, { label: 'Tue', value: 8 }, { label: 'Wed', value: 3 },
      { label: 'Thu', value: 12 }, { label: 'Fri', value: 10 }, { label: 'Sat', value: 15 }, { label: 'Sun', value: 7 },
  ];
  const mockActivityData = [{date: new Date().toISOString().split('T')[0], count: 5}];

  return (
    <div className="absolute inset-0 bg-black z-[80] flex flex-col animate-slide-in-right">
      <header className="flex items-center p-4 border-b border-zinc-800 bg-zinc-900">
        <button onClick={onClose} className="w-8 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-center flex-1 text-white">Insights</h1>
        <div className="w-8"></div>
      </header>
      
      <main className="flex-1 p-4 space-y-4 overflow-y-auto relative">
        {!isPremium && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                <FlameIcon isGradient className="w-20 h-20 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">FlameUp+ Exclusive</h2>
                <p className="text-gray-400 mb-6">See who viewed your profile, analyze your engagement, and optimize your reach.</p>
                <button className="px-8 py-3 bg-gradient-to-r from-flame-orange to-flame-red text-white font-bold rounded-full shadow-lg">
                    Upgrade to Unlock
                </button>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AnalyticsCard title="Profile Views" value={mockProfileViews.value} change="+15%" icon={<UsersIcon className="w-6 h-6 text-gray-600" />} />
          <AnalyticsCard title="Post Likes" value={mockLikesData.value} change="+5%" icon={<HeartIcon isLiked={false} className="w-6 h-6 text-gray-600" />} />
          <AnalyticsCard title="Earnings" value={`${user.analytics?.earnings || 0}`} change="+20" icon={<FlameIcon className="w-6 h-6 text-flame-orange" />} />
        </div>
        
        <BarChart data={mockFollowersData} title="New Followers This Week" />
        <LineChart data={mockFollowersData.map(d=>d.value)} labels={mockFollowersData.map(d=>d.label)} title="Daily Activity" />
        <ActivityHeatmap data={mockActivityData} title="Engagement Heatmap" />
      </main>
    </div>
  );
};

export default AnalyticsScreen;
