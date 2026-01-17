import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { STORAGE_KEYS } from "../constants/gameConfig";
import { GridSize } from "../types";
import { isSolved, performMove, shuffleGrid } from "../utils/puzzleLogic";

interface GameState {
  currentGrid: number[];
  emptySlotIndex: number;
  moveCount: number;
  hintsUsed: number;
  isSolved: boolean;
  gridSize: GridSize;
  isInitialized: boolean;
  hintedTiles: number[];
}

interface GameActions {
  initializeGame: (gridSize: GridSize) => void;
  loadLevelState: (
    chapterId: number,
    levelId: number,
    gridSize: GridSize,
  ) => Promise<boolean>;
  saveLevelState: (chapterId: number, levelId: number) => Promise<void>;
  clearLevelState: (chapterId: number, levelId: number) => Promise<void>;
  prepareGame: () => void;
  moveTile: (index: number) => boolean;
  resetGame: () => void;
  useHint: () => void;
}

interface GameStore extends GameState {
  actions: GameActions;
}

const initialState: GameState = {
  currentGrid: [],
  emptySlotIndex: -1,
  moveCount: 0,
  hintsUsed: 0,
  isSolved: false,
  gridSize: { cols: 3, rows: 3 },
  isInitialized: false,
  hintedTiles: [],
};

const getLevelStateKey = (chapterId: number, levelId: number) =>
  `${STORAGE_KEYS.LEVEL_STATE}_${chapterId}_${levelId}`;

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  actions: {
    initializeGame: (gridSize: GridSize) => {
      const { grid, emptyIndex } = shuffleGrid(gridSize);
      set({
        currentGrid: grid,
        emptySlotIndex: emptyIndex,
        moveCount: 0,
        isSolved: false,
        gridSize,
        isInitialized: true,
        hintedTiles: [],
      });
    },

    loadLevelState: async (
      chapterId: number,
      levelId: number,
      gridSize: GridSize,
    ) => {
      try {
        const key = getLevelStateKey(chapterId, levelId);
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const data = JSON.parse(stored);
          const totalTiles = gridSize.cols * gridSize.rows;
          // Validate stored grid matches current level dimensions
          if (data.grid.length === totalTiles) {
            set({
              currentGrid: data.grid,
              emptySlotIndex: data.emptyIndex,
              moveCount: data.moves,
              isSolved: isSolved(data.grid),
              gridSize,
              isInitialized: true,
              hintedTiles: data.hintedTiles || [],
            });
            return true;
          }
        }
      } catch (e) {
        console.error("Level state yüklenirken hata:", e);
      }
      return false;
    },

    saveLevelState: async (chapterId: number, levelId: number) => {
      const state = get();
      if (!state.isInitialized || state.isSolved) return;

      try {
        const key = getLevelStateKey(chapterId, levelId);
        const data = {
          grid: state.currentGrid,
          emptyIndex: state.emptySlotIndex,
          moves: state.moveCount,
          hintedTiles: state.hintedTiles,
        };
        await AsyncStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.error("Level state kaydedilirken hata:", e);
      }
    },

    clearLevelState: async (chapterId: number, levelId: number) => {
      try {
        const key = getLevelStateKey(chapterId, levelId);
        await AsyncStorage.removeItem(key);
      } catch (e) {
        console.error("Level state silinirken hata:", e);
      }
    },

    prepareGame: () => {
      set({
        isSolved: false,
        isInitialized: false,
        moveCount: 0,
        hintedTiles: [],
        emptySlotIndex: -1,
        currentGrid: [],
      });
    },

    moveTile: (index: number) => {
      const state = get();
      if (!state.isInitialized || state.isSolved) return false;

      const result = performMove(
        state.currentGrid,
        index,
        state.emptySlotIndex,
        state.gridSize,
      );

      if (result.moved) {
        const solved = isSolved(result.grid);
        set({
          currentGrid: result.grid,
          emptySlotIndex: result.emptyIndex,
          moveCount: state.moveCount + 1,
          isSolved: solved,
        });
      }

      return result.moved;
    },

    resetGame: () => {
      const state = get();
      if (!state.isInitialized) return;

      const { grid, emptyIndex } = shuffleGrid(state.gridSize);
      set({
        currentGrid: grid,
        emptySlotIndex: emptyIndex,
        moveCount: 0,
        isSolved: false,
        hintedTiles: [],
      });
    },

    useHint: () => {
      const state = get();
      if (!state.isInitialized || state.isSolved) return;

      const grid = [...state.currentGrid];
      const emptyTileValue = state.gridSize.cols * state.gridSize.rows - 1;

      // Find all wrong tiles - separate hinted and non-hinted
      const wrongTilesNotHinted: number[] = [];
      const wrongTilesHinted: number[] = [];

      for (let i = 0; i < grid.length; i++) {
        if (grid[i] !== i && i !== emptyTileValue) {
          const tileValue = i;
          if (state.hintedTiles.includes(tileValue)) {
            wrongTilesHinted.push(i);
          } else {
            wrongTilesNotHinted.push(i);
          }
        }
      }

      // Prefer non-hinted tiles, fallback to hinted tiles
      const wrongTiles =
        wrongTilesNotHinted.length > 0 ? wrongTilesNotHinted : wrongTilesHinted;

      if (wrongTiles.length === 0) return;

      // Randomly pick one wrong tile
      const targetIndex =
        wrongTiles[Math.floor(Math.random() * wrongTiles.length)];
      const tileValue = targetIndex;
      const currentIndex = grid.indexOf(tileValue);

      [grid[targetIndex], grid[currentIndex]] = [
        grid[currentIndex],
        grid[targetIndex],
      ];

      let newEmptyIndex = state.emptySlotIndex;
      if (targetIndex === state.emptySlotIndex) {
        newEmptyIndex = currentIndex;
      } else if (currentIndex === state.emptySlotIndex) {
        newEmptyIndex = targetIndex;
      }

      // Only add to hintedTiles if it's not already there
      const newHintedTiles = state.hintedTiles.includes(tileValue)
        ? state.hintedTiles
        : [...state.hintedTiles, tileValue];

      set({
        currentGrid: grid,
        emptySlotIndex: newEmptyIndex,
        hintedTiles: newHintedTiles,
        hintsUsed: state.hintsUsed + 1,
        isSolved: isSolved(grid),
      });
    },
  },
}));

export const useGameActions = () => useGameStore((state) => state.actions);
