/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Diambil dari foto acuan UI: ungu tua, putih, lavender, aksen oranye
        plum: { 950: '#231a2f', 900: '#2c2139', 800: '#3b2d4f', 700: '#4a3a60', 600: '#5d4b75' },
        accent: { DEFAULT: '#f26b3a', dark: '#d9572a', soft: '#fde6dc' },
        lavender: { 50: '#f6f5fb', 100: '#eeedf6', 200: '#e3e1f0', 300: '#cfcce3' },
        ink: { DEFAULT: '#2b2238', muted: '#8a8499' },
        // Makna matematika (CLAUDE.md §5.4): jangan dipakai untuk arti lain
        positive: '#1d4ed8',
        negative: '#dc2626',
        zero: '#6b7280',
        correct: '#15803d',
        hint: '#7c3aed',
        ringc: { cyan: '#22c7d6', pink: '#f0597a', green: '#2bc48a' },
      },
      fontFamily: { sans: ['Nunito', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
      borderRadius: { '4xl': '2rem' },
      boxShadow: {
        card: '0 12px 32px -14px rgba(43, 34, 56, 0.35)',
        // 3D "pop" edges (UI-UX.md §Sistem 3D): a solid lip under buttons and cards
        'pop-accent': '0 4px 0 #c2410c',
        'pop-plum': '0 5px 0 #231a2f',
        'pop-soft': '0 4px 0 #cfcce3',
        'pop-amber': '0 5px 0 #d97706',
        'pop-fuchsia': '0 5px 0 #a21caf',
      },
    },
  },
  plugins: [],
};
