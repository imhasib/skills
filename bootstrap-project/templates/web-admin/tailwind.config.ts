import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1F2937',
        'primary-container': '#374151',
        secondary: '#6B7280',
        surface: '#FAFAFA',
        'surface-warm': '#F3F4F6',
        'border-muted': '#E5E7EB',
        'text-rich': '#111827',
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
