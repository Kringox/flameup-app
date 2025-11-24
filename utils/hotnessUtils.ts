
/**
 * Weights for calculating the Hotness Score.
 */
export enum HotnessWeight {
    LIKE = 2,
    COMMENT = 3,
    FOLLOW = 5,
    PAID_UNLOCK = 10, // Future feature
}

/**
 * Calculates a rough hotness score based on raw stats.
 * In a real backend, this would likely be an aggregated field updated via Cloud Functions.
 */
export const calculateHotness = (likes: number, followers: number, comments: number): number => {
    return (likes * HotnessWeight.LIKE) + 
           (followers * HotnessWeight.FOLLOW) + 
           (comments * HotnessWeight.COMMENT);
};
