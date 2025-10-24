import React from 'react';

interface LineChartProps {
  data: number[];
  labels: string[];
  title: string;
}

// This is a simplified, non-interactive line chart using SVG.
// For a real app, a library like Recharts or Chart.js would be used.
const LineChart: React.FC<LineChartProps> = ({ data, labels, title }) => {
  const width = 300;
  const height = 150;
  const padding = 20;
  const maxValue = Math.max(...data, 1);
  const stepX = (width - padding * 2) / (data.length - 1);
  
  const points = data.map((d, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (d / maxValue) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm w-full">
      <h3 className="font-semibold text-gray-700 mb-2">{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <polyline
          fill="none"
          stroke="#FF6B35"
          strokeWidth="2"
          points={points}
        />
        {/* Simple labels (optional) */}
        {labels.map((label, i) => (
           <text key={i} x={padding + i * stepX} y={height-5} fontSize="8" textAnchor="middle">{label}</text>
        ))}
      </svg>
    </div>
  );
};

export default LineChart;
