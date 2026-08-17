// Shared Recharts theming for the HUD look.
// Mirrors CSS tokens from index.css (--hud-grid-opacity, --hud-glow-soft, --primary-*).
// Recharts renders SVG attributes, so CSS variables cannot be used directly —
// values are kept in sync with the tokens below.

const gridOpacity = 0.08 // matches --hud-grid-opacity

export const chartTheme = {
  grid: `rgba(45, 212, 191, ${gridOpacity})`,
  axisTick: '#64748b',
  axisLine: 'rgba(22, 64, 79, 0.6)',
  tooltip: {
    background: '#0b2732',
    border: '1px solid rgba(45, 212, 191, 0.35)',
    borderRadius: 12,
    boxShadow: '0 0 25px -5px rgba(20, 184, 166, 0.25)',
    fontSize: 12,
  },
  cursorStroke: 'rgba(45, 212, 191, 0.5)',
} as const
