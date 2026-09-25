/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vayu: {
          bg: "#020817",
          surface: "#0F172A",
          surfaceLight: "#1E293B",
          card: "rgba(15, 23, 42, 0.82)",
          cardHover: "rgba(30, 41, 59, 0.88)",
          blue: "#2563EB",
          sky: "#38BDF8",
          emerald: "#10B981",
          saffron: "#F59E0B",
          accent: "#F59E0B",
          purple: "#8B5CF6",
          rose: "#F43F5E",
          border: "rgba(148, 163, 184, 0.12)",
          borderGlow: "rgba(56, 189, 248, 0.35)",
        }
      },
      borderRadius: {
        '24': '24px',
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-blue': '0 0 25px -5px rgba(37, 99, 235, 0.4)',
        'glow-sky': '0 0 25px -5px rgba(56, 189, 248, 0.4)',
        'glow-saffron': '0 0 25px -5px rgba(245, 158, 11, 0.4)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'radarSweep 4s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
