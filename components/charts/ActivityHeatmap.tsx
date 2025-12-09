import React from 'react';

interface ActivityHeatmapProps {
  // Data would represent activity counts for each day of the year.
  data: { date: string; count: number }[];
  title: string;
}

// This is a simplified placeholder for a GitHub-style activity heatmap.
// A real implementation would be more complex, often using a dedicated library.
const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data, title }) => {
  const today = new Date();
  const days = Array.from({ length: 90 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-200 dark:bg-zinc-800';
    if (count < 3) return 'bg-flame-orange/30';
    if (count < 6) return 'bg-flame-orange/60';
    return 'bg-flame-orange';
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow-sm w-full border border-gray-100 dark:border-zinc-800">
      <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</h3>
      <div className="grid grid-cols-15 gap-1">
        {days.map(day => {
          const activity = data.find(d => d.date === day);
          const count = activity ? activity.count : 0;
          return (
            <div
              key={day}
              className={`w-4 h-4 rounded-sm ${getColor(count)}`}
              title={`${day}: ${count} activities`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ActivityHeatmap;