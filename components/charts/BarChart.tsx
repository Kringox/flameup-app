import React from 'react';

interface BarChartProps {
  data: { label: string; value: number }[];
  title: string;
}

// This is a simplified, non-interactive bar chart using divs.
// For a real app, a library like Recharts or Chart.js would be used.
const BarChart: React.FC<BarChartProps> = ({ data, title }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow-sm w-full border border-gray-100 dark:border-zinc-800">
      <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</h3>
      <div className="flex justify-around items-end h-48 space-x-2">
        {data.map((item) => (
          <div key={item.label} className="flex flex-col items-center flex-1">
            <div
              className="w-full bg-flame-orange/50 rounded-t-md"
              style={{ height: `${(item.value / maxValue) * 100}%` }}
              title={`${item.label}: ${item.value}`}
            ></div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BarChart;