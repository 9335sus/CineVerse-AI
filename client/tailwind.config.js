const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { bg: c('bg'), surface: c('surface'), raised: c('raised'), line: c('line'), ink: c('ink'), muted: c('muted'), accent: c('accent'), glow: c('glow') },
      fontFamily: { display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'], sans: ['"DM Sans"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
