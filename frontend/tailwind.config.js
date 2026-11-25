/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#09090d',
          900: '#101017',
          850: '#16161f',
          800: '#1c1c27',
        },
        primary: {
          light: '#ff2e3b',
          DEFAULT: '#e50914',
          dark: '#b90710',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
