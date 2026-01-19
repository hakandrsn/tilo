import { ImageSourcePropType } from "react-native";

export type ImageSource = ImageSourcePropType | { uri: string };
export type GridSize = { cols: number; rows: number };

export interface Level {
  id: number;
  chapterId: number;
  name?: string; // Optional level name
  gridSize: GridSize;
  imageSource: ImageSource;
}

export interface Chapter {
  id: number;
  name: string;
  description: string;
  thumbnail: ImageSource;
  levels: Level[];
  color?: string;
}

export interface LevelProgress {
  completed: boolean;
  bestMoves: number;
  stars: number;
}

export interface UserProgress {
  unlockedChapters: number[];
  completedLevels: Record<string, LevelProgress>;
  totalStars: number;
  totalCoins?: number; // Added for coin system
  lastPlayed?: {
    chapterId: number;
    levelId: number;
  };
}

export interface TilePosition {
  row: number;
  col: number;
}

export interface HintState {
  count: number;
  lastUpdated: number;
}
