// Production palette: premium fintech dark theme.
export const colors = {
  background: "#0B0F1A",
  card: "#121826",
  cardSoft: "#1A2235",
  text: "#FFFFFF",
  textMuted: "#9CA3AF",
  accent: "#7C3AED",
  accentAlt: "#4F46E5",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
};

export const gradients = {
  primary: [colors.accentAlt, colors.accent] as const,
};
