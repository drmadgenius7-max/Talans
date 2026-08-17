/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0C0C0C',
          soft: '#111111',
          line: '#1C1C1C',
        },
        mist: {
          DEFAULT: '#D7E2EA',
          dim: '#9AA6B0',
          deep: '#646973',
          light: '#BBCCD7',
        },
        accent: {
          DEFAULT: '#B600A8',
          violet: '#7621B0',
          ember: '#BE4C00',
          dark: '#18011F',
        },
      },
      fontFamily: {
        sans: [
          'Kanit',
          'IBM Plex Sans Arabic',
          'Tajawal',
          'system-ui',
          'sans-serif',
        ],
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -18px, 0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
      animation: {
        float: 'float 7s cubic-bezier(0.25, 0.1, 0.25, 1) infinite',
        shimmer: 'shimmer 6s linear infinite',
      },
    },
  },
  plugins: [],
};
