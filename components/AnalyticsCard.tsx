import React from 'react';

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ title, value, change, icon }) => {
  const isPositive = change && (change.startsWith('+') || parseFloat(change) > 0);
  const changeColor = isPositive ? 'text-green-500' : 'text-red-500';

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow-sm flex items-start border border-gray-100 dark:border-zinc-800">
      <div className="bg-gray-100 dark:bg-zinc-800 rounded-full p-3 mr-4">{icon}</div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-dark-gray dark:text-gray-100">{value}</p>
        {change && (
          <p className={`text-xs font-semibold ${changeColor}`}>{change}</p>
        )}
      </div>
    </div>
  );
};

export default AnalyticsCard;