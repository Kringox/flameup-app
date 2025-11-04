/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./screens/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'flame-orange': '#FF6B35',
        'flame-red': '#FF4757',
        'error-red': '#E74C3C',
        'premium-gold': '#FFD700',
        'dark-gray': '#333333',
        'theme-dusk-bg': '#1a202c',
        'theme-dusk-text': '#e2e8f0',
        'theme-rose-bg': '#fff5f7',
        'theme-rose-text': '#9f1239',
      },
      keyframes: {
        'like-pop': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.4)' },
        },
        'fade-in': {
          'from': { opacity: '0', transform: 'scale(0.95)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
        'fade-in-fast': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        'slide-in-right': {
            'from': { transform: 'translateX(100%)' },
            'to': { transform: 'translateX(0)' },
        },
        'swipe-out-left': {
            'to': { transform: 'translateX(-150%) rotate(-15deg)', opacity: '0' },
        },
        'swipe-out-right': {
            'to': { transform: 'translateX(150%) rotate(15deg)', opacity: '0' },
        },
        'toast-in': {
            'from': { transform: 'translateY(-100%)', opacity: '0' },
            'to': { transform: 'translateY(0)', opacity: '1' },
        },
        'toast-out': {
             'from': { transform: 'translateY(0)', opacity: '1' },
            'to': { transform: 'translateY(-100%)', opacity: '0' },
        }
      },
      animation: {
        'like-pop': 'like-pop 0.4s ease-in-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-in-fast': 'fade-in-fast 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'toast-in': 'toast-in 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        'toast-out': 'toast-out 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards 2s',
      },
    },
  },
  plugins: [],
}
