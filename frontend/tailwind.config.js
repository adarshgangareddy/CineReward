/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#f84464',
          DEFAULT: '#f84464',
          dark: '#cf2d4b',
        }
      }
    },
  },
  plugins: [],
}
