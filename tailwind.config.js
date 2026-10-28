const themed = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: themed('ink'),
        ivory: themed('ivory'),
        sand: themed('sand'),
        surface: themed('surface'),
        stone: themed('stone'),
        line: themed('line'),
        gold: {
          DEFAULT: themed('gold'),
          light: '#c9a96e',
          soft: themed('gold-soft'),
        },
        night: '#171412',
        cream: '#faf7f2',
      },
      borderColor: {
        DEFAULT: 'rgb(var(--line))',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'fade-in': 'fade-in 0.5s ease both',
        float: 'float 7s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
}
