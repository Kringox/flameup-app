/**
 * Provides simple haptic feedback.
 */
export const hapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection') => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(40);
          break;
        case 'heavy':
          navigator.vibrate(100);
          break;
        case 'success':
          navigator.vibrate([100, 30, 100]);
          break;
        case 'warning':
          navigator.vibrate([100, 30, 100, 30, 100]);
          break;
        case 'error':
          navigator.vibrate([100, 30, 100, 30, 100, 30, 100]);
          break;
        case 'selection':
          navigator.vibrate(5);
          break;
        default:
          break;
      }
    } catch (e) {
      console.warn('Haptic feedback failed', e);
    }
  }
};
