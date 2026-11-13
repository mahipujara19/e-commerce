const themed = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  // Resolved from this file, not the working directory, so builds work from the repo root.
  content: { relative: true, files: ['./index.html', './src/**/*.{js,jsx}'] },
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
        // Headline words rising out of a clipped line.
        'word-up': {
          '0%': { opacity: '0', transform: 'translateY(110%) rotate(4deg)' },
          '100%': { opacity: '1', transform: 'translateY(0) rotate(0)' },
        },
        // Soft background light drifting around.
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(40px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-30px, 30px) scale(0.92)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.15', transform: 'scale(0.7) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1.15) rotate(45deg)' },
        },
        'heart-pop': {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(1.45)' },
          '65%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        bump: {
          '0%, 100%': { transform: 'scale(1) rotate(0)' },
          '30%': { transform: 'scale(1.25) rotate(-10deg)' },
          '60%': { transform: 'scale(0.95) rotate(6deg)' },
        },
        'page-in': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'fade-in': 'fade-in 0.5s ease both',
        float: 'float 7s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
        'word-up': 'word-up 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        blob: 'blob 18s ease-in-out infinite',
        twinkle: 'twinkle 3.2s ease-in-out infinite',
        'spin-slow': 'spin 40s linear infinite',
        'spin-slower': 'spin 60s linear infinite reverse',
        'ping-slow': 'ping 2.6s cubic-bezier(0, 0, 0.2, 1) infinite',
        'heart-pop': 'heart-pop 0.45s ease-out',
        bump: 'bump 0.6s ease-out',
        // backwards, not both: no transform is left behind, so fixed bars inside pages still pin to the window.
        'page-in': 'page-in 0.55s cubic-bezier(0.2, 0.7, 0.2, 1) backwards',
      },
    },
  },
  plugins: [],
}
