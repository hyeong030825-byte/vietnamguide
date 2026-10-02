// Tailwind v3 config mirroring the original Readdy project's token names
// (background / foreground / primary / secondary / accent, 50–950).
const scale = (p) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k) => [
      k,
      `rgb(var(--${p}-${k}) / <alpha-value>)`,
    ])
  );

module.exports = {
  content: ['./src/page.html'],
  theme: {
    extend: {
      colors: {
        background: scale('bg'),
        foreground: scale('fg'),
        primary: scale('pr'),
        secondary: scale('se'),
        accent: scale('ac'),
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', '"Noto Sans KR"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        heading: ['"Be Vietnam Pro"', '"Noto Sans KR"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        vi: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 14s linear infinite',
        float: 'float 5s ease-in-out infinite',
        'toast-in': 'toastIn .25s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        toastIn: {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
