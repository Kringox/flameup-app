// FIX: Create content for missing file
import React from 'react';
import { User } from '../types.ts';
import { getRank, Rank, RANK_COLORS } from '../utils/rankingUtils.ts';
import DiamondIcon from './icons/DiamondIcon.tsx';
import TrophyIcon from './icons/TrophyIcon.tsx';

interface RankBadgeProps {
  user: User;
  size?: 'sm' | 'md';
}

const RankBadge: React.FC<RankBadgeProps> = ({ user, size = 'md' }) => {
  const rank = getRank(user);
  const colorClass = RANK_COLORS[rank];
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  const getIcon = () => {
    switch (rank) {
      case Rank.Diamond:
        return <DiamondIcon className={`${sizeClass} ${colorClass}`} />;
      default:
        return <TrophyIcon className={`${sizeClass} ${colorClass}`} />;
    }
  };

  return (
    <div className={`flex items-center space-x-1 font-semibold ${colorClass}`}>
      {getIcon()}
      <span className={size === 'sm' ? 'text-xs' : 'text-sm'}>{rank}</span>
    </div>
  );
};

export default RankBadge;
