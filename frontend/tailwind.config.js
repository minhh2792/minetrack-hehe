/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        'mc-dark': '#212021',
        'mc-darker': '#1c1b1c',
        'mc-card': '#2a292a',
        'mc-border': '#3a3839',
        'mc-gold': '#FFD700',
        'mc-blue': '#0984e3',
        'mc-blue-light': '#74b9ff',
        'mc-purple': '#6c5ce7',
        'mc-purple-light': '#a29bfe',
      },
      fontFamily: {
        sans: ['"Open Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
