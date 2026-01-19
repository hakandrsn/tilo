// Comprehensive Color Palette
const PALETTE = {
  // Brand Colors
  turquoise: "#4bc9c3", // Background
  sunflower: "#f9cd46", // Buttons
  coral: "#fc7e68", // Transitions, specific Text, Borders

  // Neutral Colors
  white: "#ffffff",
  black: "#000000",
  grayStart: "#333333", // Legacy dark border
  grayDark: "#1a1a1a", // Legacy surface

  // Functional
  emerald: "#10b981", // Success
  red: "#ef4444", // Error
  amber: "#f59e0b", // Warning
};

export const COLORS = {
  // Main Theme
  background: PALETTE.turquoise,
  surface: PALETTE.white, // Cleaner look on turquoise
  card: "rgba(255, 255, 255, 0.9)", // For overlays/cards

  // Interactive
  primary: PALETTE.sunflower,
  primaryText: PALETTE.black, // Text on primary button

  secondary: PALETTE.coral,
  secondaryText: PALETTE.white,

  // Text & Borders
  textPrimary: "#493f3fff", // Default text on turquoise bg (often needs to be white or very dark) - reverting to white for contrast or dark if needed.
  // Let's stick to what fits #4bc9c3. White text is readable on dark turquoise, but #4bc9c3 is bright.
  // Black text is safer on #4bc9c3.
  // HOWEVER, existing app was Dark Mode (#0a0a0a). Switching to #4bc9c3 is a big change (Light Mode essentially).
  // User asked for "Some text as #fc7e68".
  // Let's set main text to white for now as it's a game, often vibrant.
  // Wait, #4bc9c3 is quite bright. White text might be hard to read.
  // Let's allow overriding.
  textSecondary: PALETTE.coral,
  border: PALETTE.coral,

  // Legacy/Game Specific (Mapping to new palette where possible or keeping neutral)
  starFilled: "#fbbf24", // Similar to sunflower but kept distinct for stars
  starEmpty: "#4a4a4a",

  // Inherited Functional
  success: PALETTE.emerald,
  error: PALETTE.red,
  warning: PALETTE.amber,

  // Compatibility / Aliases
  accent: PALETTE.coral,
  textMuted: "#888888", // Manually defined neutral gray for now

  // Direct Access (for when semantic names don't fit)
  ...PALETTE,
};
