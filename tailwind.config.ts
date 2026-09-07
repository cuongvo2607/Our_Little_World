import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FFFEFA',
          100: '#FDFBF7',
          200: '#F7F3EA',
          300: '#EDE4D3',
        },
        rose: {
          50: '#FFF0F5',
          100: '#FCE4EC',
          200: '#F8BBD0',
          300: '#F48FB1',
          400: '#E8A0BF',
          500: '#D47A9D',
          600: '#C25380',
          700: '#9E3B63',
        },
        lavender: {
          50: '#F7F5FA',
          100: '#EFEBF5',
          200: '#E0D5E6',
          300: '#C4B2D6',
        },
        beige: {
          50: '#FAF8F5',
          100: '#F7EBE1',
          200: '#EED9C7',
        },
        charcoal: {
          800: '#2D2727',
          900: '#1A1718',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft-sm': '0 2px 10px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'soft-md': '0 10px 25px -5px rgba(232, 160, 191, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 20px 30px -10px rgba(212, 122, 157, 0.18), 0 10px 15px -5px rgba(0, 0, 0, 0.04)',
        'glass': '0 8px 32px 0 rgba(232, 160, 191, 0.15)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'sway': 'sway 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.03)' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;
