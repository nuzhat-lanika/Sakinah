/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './context/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        green: {
          primary: '#1F6F5B',
          light: '#E8F4F0',
          mid: '#2D7A62',
          dark: '#154D3F',
          700: '#1F6F5B',
          800: '#154D3F',
          600: '#2D7A62',
          50: '#E8F4F0',
        },
        gold: {
          primary: '#C9933A',
          light: '#FDF3E3',
        },
        cream: '#FAF8F5',
        duolingo: {
          green: '#58CC02',
          blue: '#1CB0F6',
          orange: '#FF9600',
          red: '#FF4B4B',
          purple: '#CE82FF',
          yellow: '#FFC800',
        },
      },
      fontFamily: {
        arabic: ['Amiri', 'serif'],
        serif: ['Crimson Pro', 'Georgia', 'serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      keyframes: {
        'bounce-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        'pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'bounce-in': 'bounce-in 0.4s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'shake': 'shake 0.4s ease-in-out',
        'pop': 'pop 0.25s ease-in-out',
      },
    },
  },
  plugins: [],
}
