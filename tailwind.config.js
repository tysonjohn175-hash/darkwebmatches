/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#E53935',     // Red
        secondary: '#B71C1C',   // Dark red
        accent: '#00C853',      // Green (hero only)
        dark: '#0A0A0A',        // Main background
        card: '#1A1A1A',        // Card background
        muted: '#AAAAAA',       // Muted text
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}