/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        netra: {
          bg:      '#faf8f5',
          panel:   'rgba(255,255,255,0.72)',
          border:  'rgba(255,255,255,0.5)',
          accent:  '#6d28d9',
          accent2: '#c2410c',
          cream:   '#f5f0eb',
          lavender:'#ede9fe',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}

