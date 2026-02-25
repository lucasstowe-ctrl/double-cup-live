import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cafe: {
          cream: '#f7f0e7',
          latte: '#e9d7c0',
          mocha: '#8c5e3c',
          roast: '#4b2e20',
          sage: '#7a8e73'
        }
      },
      boxShadow: {
        card: '0 10px 30px rgba(75,46,32,0.08)'
      }
    },
  },
  plugins: [],
} satisfies Config;
