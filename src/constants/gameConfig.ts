import { GridSize } from "../types";

// LEVELS_PER_CHAPTER and TOTAL_CHAPTERS removed for dynamic calculation
// levels are governed by the server/data source now.

// SHUFFLE_MOVES logic moved to puzzleLogic dynamic calculation

export const getGridSizeForLevel = (levelIndex: number): GridSize => {
  if (levelIndex <= 8) return { cols: 3, rows: 4 };
  if (levelIndex <= 16) return { cols: 4, rows: 5 };
  return { cols: 5, rows: 6 };
};

export const normalizeGridSize = (
  size: GridSize | number | undefined,
): GridSize => {
  if (!size) return { cols: 3, rows: 4 }; // Default to 3x4
  if (typeof size === "number") {
    // Legacy mapping: N -> N cols x (N+1) rows (Vertical)
    return { cols: size, rows: size + 1 };
  }
  return size;
};

// ==========================================
// RESPONSIVE BREAKPOINTS
// ==========================================

export const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
};

export const getDeviceType = (
  width: number,
): "phone" | "tablet" | "desktop" => {
  if (width >= BREAKPOINTS.desktop) return "desktop";
  if (width >= BREAKPOINTS.tablet) return "tablet";
  return "phone";
};

export const getResponsiveValue = <T>(
  width: number,
  values: { phone: T; tablet: T; desktop?: T },
): T => {
  const type = getDeviceType(width);
  if (type === "desktop") return values.desktop ?? values.tablet;
  if (type === "tablet") return values.tablet;
  return values.phone;
};

// ==========================================
// COLORS - Re-exported from centralized file
// ==========================================

export { COLORS } from "./colors";

// ==========================================
// LAYOUT - Re-exported from centralized file
// ==========================================

export { LAYOUT } from "./layout";

// ==========================================
// UI CONSTANTS
// ==========================================

export const BOARD_PADDING = 12; // Kept for backward compatibility, use LAYOUT.boardPadding
export const TILE_GAP = 2;
export const TILE_BORDER_RADIUS = 6;

export const getBoardSize = (screenWidth: number): number => {
  const maxBoardSize = screenWidth - BOARD_PADDING * 2;
  return maxBoardSize;
};

export const getGridColumns = (screenWidth: number): number => {
  return getResponsiveValue(screenWidth, { phone: 2, tablet: 3, desktop: 4 });
};

// ==========================================
// HINT SYSTEM
// ==========================================

export const HINT_CONFIG = {
  defaultHints: 10,
  chapterBonus: 5,
  rewardedAdHints: 10, // AdMob'da ayarlanan ödül miktarı
};

// ==========================================
// AD CONFIG
// ==========================================

// Test Ad IDs (for development)
const TEST_AD_CONFIG = {
  interstitial: {
    android: "ca-app-pub-3940256099942544/1033173712",
    ios: "ca-app-pub-3940256099942544/4411468910",
  },
  rewarded: {
    android: "ca-app-pub-3940256099942544/5224354917",
    ios: "ca-app-pub-3940256099942544/1712485313",
  },
  banner: {
    android: "ca-app-pub-3940256099942544/6300978111",
    ios: "ca-app-pub-3940256099942544/2934735716",
  },
  native: {
    android: "ca-app-pub-3940256099942544/2247696110",
    ios: "ca-app-pub-3940256099942544/3986624511",
  },
};

// Production Ad IDs (for release builds)
const PROD_AD_CONFIG = {
  interstitial: {
    android: "ca-app-pub-5502183878891798/5198222798",
    ios: "ca-app-pub-5502183878891798/3827454899",
  },
  rewarded: {
    android: "ca-app-pub-5502183878891798/3109269595",
    ios: "ca-app-pub-5502183878891798/2514373229",
  },
  banner: {
    android: "ca-app-pub-5502183878891798/4422351261",
    ios: "ca-app-pub-5502183878891798/2934735716",
  },
  native: {
    android: "ca-app-pub-5502183878891798/2705944917",
    ios: "ca-app-pub-5502183878891798/8494276450",
  },
};

// Automatically switch between test and production IDs
export const AD_CONFIG = __DEV__ ? TEST_AD_CONFIG : PROD_AD_CONFIG;

// ==========================================
// STORAGE KEYS
// ==========================================

export const STORAGE_KEYS = {
  USER_PROGRESS: "@puzzle_game_progress",
  LAST_PLAYED: "@puzzle_game_last_played",
  DEVICE_ID: "@puzzle_game_device_id",
  LEVEL_STATE: "@puzzle_game_level_state",
};

// CHAPTER DATA handles moved to DataStore/Service
// generateChapters ve CHAPTERS kaldırıldı.

// ==========================================
// STAR RATING SYSTEM (Difficulty Based)
// ==========================================

// ==========================================
// STAR RATING SYSTEM (Dynamic Difficulty)
// ==========================================

export const calculateStars = (moves: number, gridSize: GridSize): number => {
  // Ideal moves = Number of pieces (assuming 1 drag per piece)
  const idealMoves = gridSize.cols * gridSize.rows;

  // Penalty Step = Minimum dimension of the grid (e.g. 3 for 3x4)
  const step = Math.min(gridSize.cols, gridSize.rows);

  // Logic:
  // Moves <= Ideal -> 3 Stars
  // Moves <= Ideal + Step -> 2 Stars
  // Moves > Ideal + Step -> 1 Star

  if (moves <= idealMoves) return 3;
  if (moves <= idealMoves + step) return 2;
  return 1;
};
