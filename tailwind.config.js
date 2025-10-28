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
    },
  },
  plugins: [],
}