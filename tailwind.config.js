/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          dark: '#6366F1',
        },
        secondary: {
          DEFAULT: '#1E293B',
          dark: '#F8FAFC',
        },
        accent: '#10B981',
      }
    },
  },
  plugins: [],
}
