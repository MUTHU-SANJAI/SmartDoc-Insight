// D:\SmartDoc-Insight\frontend\tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // THIS LINE IS CRUCIAL for React files
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}