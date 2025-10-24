import React from 'react';
// FIX: Added file extension to xpUtils import
import { getLevelProgress } from '../utils/xpUtils.ts';

interface LevelProgressBarProps {
  xp: number;
}

const LevelProgressBar: React.FC<LevelProgressBarProps> = ({ xp }) => {
  const { level, progressPercentage } = getLevelProgress(xp);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-bold text-gray-700">Level {level}</span>
        <span className="text-xs font-semibold text-flame-orange">Next Level</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-gradient-to-r from-flame-orange to-flame-red h-2.5 rounded-full"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default LevelProgressBar;
