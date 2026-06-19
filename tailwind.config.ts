import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Neutral warm dark — cohesive layers
        bg: {
          DEFAULT: '#0a0b0d',
          1: '#0f1115',
          2: '#14171a',
          3: '#1a1f23',
        },
        surface: '#0f1115',
        elevated: '#1a1f23',

        // Text — improved readability hierarchy
        ink: {
          DEFAULT: '#ebedf0',
          secondary: '#9ca3af',
          muted: '#6b7280',
        },

        // Borders — soft, barely visible
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.05)',
          strong: 'rgba(255, 255, 255, 0.1)',
        },

        // Teal accent — signature color
        accent: {
          DEFAULT: '#5eead4',
          dim: '#1a3a38',
        },

        // Type colors — softened for harmony
        idea: '#6bc5e8',
        issue: '#b0a8e0',
        exploration: '#e8a0aa',

        // Semantic
        danger: '#f87171',
        success: '#5eead4',
        warning: '#fbbf24',
      },
      fontFamily: {
        display: ['"Noto Serif SC"', '"Source Han Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Serif SC"', '"Source Han Serif SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(0, 0, 0, 0.25)',
        'soft-md': '0 2px 8px rgba(0, 0, 0, 0.35)',
        'soft-lg': '0 8px 24px rgba(0, 0, 0, 0.45)',
      },
      transitionTimingFunction: {
        snappy: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out backwards',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1) backwards',
        'matrix-pulse': 'matrix-pulse 2s ease-in-out infinite',
        'logo-spin': 'logo-spin 6s linear infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'matrix-pulse': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 6px rgba(0, 255, 65, 0.6)' },
          '50%': { opacity: '0.35', boxShadow: '0 0 12px rgba(0, 255, 65, 0.25)' },
        },
        'logo-spin': {
          '0%': { transform: 'rotate(45deg)' },
          '100%': { transform: 'rotate(405deg)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
