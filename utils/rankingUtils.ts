// FIX: Create content for missing file
import { User } from '../types.ts';
import { getLevelFromXp } from './xpUtils.ts';

export enum Rank {
  Bronze = 'Bronze',
  Silver = 'Silver',
  Gold = 'Gold',
  Platinum = 'Platinum',
  Diamond = 'Diamond',
}

export const getRank = (user: User): Rank => {
  const level = getLevelFromXp(user.xp);
  if (level >= 50) return Rank.Diamond;
  if (level >= 30) return Rank.Platinum;
  if (level >= 15) return Rank.Gold;
  if (level >= 5) return Rank.Silver;
  return Rank.Bronze;
};

export const RANK_COLORS: { [key in Rank]: string } = {
  [Rank.Bronze]: 'text-yellow-700',
  [Rank.Silver]: 'text-gray-500',
  [Rank.Gold]: 'text-yellow-500',
  [Rank.Platinum]: 'text-blue-400',
  [Rank.Diamond]: 'text-purple-500',
};
