// Constants for the leveling system
const BASE_XP = 100; // XP needed for level 2
const GROWTH_FACTOR = 1.5; // How much the required XP increases per level

/**
 * Calculates the total XP required to reach a specific level.
 * @param level - The target level.
 * @returns The total XP needed to reach that level.
 */
export const xpForLevel = (level: number): number => {
    if (level <= 1) return 0;
    return Math.floor(BASE_XP * Math.pow(level - 1, GROWTH_FACTOR));
};

/**
 * Determines the user's current level based on their total XP.
 * @param xp - The user's total experience points.
 * @returns The user's current level.
 */
export const getLevelFromXp = (xp: number): number => {
    let level = 1;
    while (xp >= xpForLevel(level + 1)) {
        level++;
    }
    return level;
};

/**
 * Calculates the progress towards the next level.
 * @param xp - The user's total experience points.
 * @returns An object containing the current level, XP for the current level,
 * XP for the next level, and the progress percentage.
 */
export const getLevelProgress = (xp: number) => {
    const currentLevel = getLevelFromXp(xp);
    const xpForCurrentLevel = xpForLevel(currentLevel);
    const xpForNextLevel = xpForLevel(currentLevel + 1);
    
    const xpIntoCurrentLevel = xp - xpForCurrentLevel;
    const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
    
    const progressPercentage = xpNeededForNextLevel > 0 ? (xpIntoCurrentLevel / xpNeededForNextLevel) * 100 : 100;

    return {
        level: currentLevel,
        xpForCurrentLevel,
        xpForNextLevel,
        progressPercentage: Math.min(100, progressPercentage),
    };
};

// Enum for different actions that can award XP
export enum XpAction {
    SWIPE_LIKE = 1,
    MATCH = 25,
    SEND_MESSAGE = 5,
    CREATE_POST = 20,
    RECEIVE_LIKE = 2,
    RECEIVE_COMMENT = 5,
    SEND_GIFT = 50,
}
