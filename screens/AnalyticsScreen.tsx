import React from 'react';
import BarChartIcon from '../components/icons/BarChartIcon';
import UsersIcon from '../components/icons/UsersIcon';
import HeartIcon from '../components/icons/HeartIcon';
import AnalyticsCard from '../components/AnalyticsCard';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import ActivityHeatmap from '../components/charts/ActivityHeatmap';

interface AnalyticsScreenProps {
  onClose: () => void;
}

// Mock data for demonstration purposes
const mockProfileViews = { label: 'Views', value: 1230 };
const mockLikesData = { label: 'Likes', value: 450 };
const mockFollowersData = [
    { label: 'Mon', value: 5 },
    { label: 'Tue', value: 8 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 12 },
    { label: 'Fri', value: 10 },
    { label: 'Sat', value: 15 },
    { label: 'Sun', value: 7 },
];
const mockActivityData = [{date: new Date().toISOString().split('T')[0], count: 5}];

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 bg-gray-100 z-[80] flex flex-col">
      <header className="flex items-center p-4 border-b bg-white">
        <button onClick={onClose} className="w-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-center flex-1">Profile Analytics</h1>
        <div className="w-8"></div>
      </header>
      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AnalyticsCard title="Profile Views" value={mockProfileViews.value} change="+15%" icon={<UsersIcon className="w-6 h-6 text-gray-600" />} />
          <AnalyticsCard title="Post Likes" value={mockLikesData.value} change="+5%" icon={<HeartIcon isLiked={false} className="w-6 h-6 text-gray-600" />} />
          <AnalyticsCard title="New Followers" value={7} change="-2" icon={<BarChartIcon className="w-6 h-6 text-gray-600" />} />
        </div>
        
        <BarChart data={mockFollowersData} title="New Followers This Week" />

        <LineChart data={mockFollowersData.map(d=>d.value)} labels={mockFollowersData.map(d=>d.label)} title="Daily Activity" />
        
        <ActivityHeatmap data={mockActivityData} title="Your Activity" />
      </main>
    </div>
  );
};

export default AnalyticsScreen;
