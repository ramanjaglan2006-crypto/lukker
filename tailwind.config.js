/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ludo: {
          red: '#E53935',
          green: '#43A047',
          blue: '#1E88E5',
          yellow: '#FDD835',
          border: '#E0E0E0',
          bg: '#0D1321',
          card: '#131C31',
          gold: '#FFD700',
        }
      },
      boxShadow: {
        'board': '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 0 6px #FFFFFF',
        'glow-red': '0 0 20px rgba(229, 57, 53, 0.8), inset 0 0 10px rgba(229, 57, 53, 0.5)',
        'glow-green': '0 0 20px rgba(67, 160, 71, 0.8), inset 0 0 10px rgba(67, 160, 71, 0.5)',
        'glow-blue': '0 0 20px rgba(30, 136, 229, 0.8), inset 0 0 10px rgba(30, 136, 229, 0.5)',
        'glow-yellow': '0 0 25px rgba(253, 216, 53, 0.9), 0 0 5px #FFFFFF',
        'token': '0 4px 6px rgba(0, 0, 0, 0.4), inset 0 2px 2px rgba(255, 255, 255, 0.6)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 1.5s infinite ease-in-out',
        'bounce-subtle': 'bounceSubtle 0.8s infinite ease-in-out',
        'token-jump': 'tokenJump 0.3s ease-in-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { transform: 'scale(1)', filter: 'drop-shadow(0 0 8px rgba(253, 216, 53, 0.8))' },
          '50%': { transform: 'scale(1.05)', filter: 'drop-shadow(0 0 16px rgba(253, 216, 53, 1))' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        tokenJump: {
          '0%': { transform: 'scale(1) translateY(0)' },
          '50%': { transform: 'scale(1.2) translateY(-10px)' },
          '100%': { transform: 'scale(1) translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
