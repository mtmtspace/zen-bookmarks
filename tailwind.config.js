/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        zen: {
          bg: '#FDFDFB',
          sidebar: '#F4F4F5',
          surface: '#FFFFFF',
        },
        primary: {
          50: '#f2f8f4',
          100: '#e1efe6',
          200: '#c5decf',
          300: '#9dbfae',
          400: '#739d88',
          500: '#4f6f52',
          600: '#3d5942',
          700: '#334837',
          800: '#2c3b2f',
          900: '#253128',
        },
        stone: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        }
      },
      boxShadow: {
        'soft-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'soft-md': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'soft-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.01)',
      }
    },
  },
  plugins: [],
}
