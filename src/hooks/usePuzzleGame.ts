import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { normalizeGridSize } from "../constants/gameConfig";
import { useGameActions, useGameStore } from "../store/gameStore";
import { useProgressActions } from "../store/progressStore";
import { Level } from "../types";
import { getProgressPercentage } from "../utils/puzzleLogic";

interface UsePuzzleGameOptions {
  level?: Level;
  onWin?: (moves: number) => void;
}

export const usePuzzleGame = ({ level, onWin }: UsePuzzleGameOptions) => {
  const gameState = useGameStore();
  const gameActions = useGameActions();
  const progressActions = useProgressActions();
  const appState = useRef(AppState.currentState);

  const {
    currentGrid,
    emptySlotIndex,
    moveCount,
    isSolved,
    gridSize,
    isInitialized,
    hintedTiles,
  } = gameState;

  // Initialize or Resume
  useEffect(() => {
    if (level) {
      // Prevent ghost wins from previous level interactions
      gameActions.prepareGame();

      const initOrResume = async () => {
        const normalizedSize = normalizeGridSize(level.gridSize);
        const resumed = await gameActions.loadLevelState(
          level.chapterId,
          level.id,
          normalizedSize,
        );
        if (!resumed) {
          gameActions.initializeGame(normalizedSize);
        }
      };
      initOrResume();
    }
  }, [level?.id, level?.chapterId, level?.gridSize]);

  // Auto-save on AppState change
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current === "active" &&
        nextAppState.match(/inactive|background/)
      ) {
        // App is going to background, save state
        if (level && isInitialized && !isSolved) {
          gameActions.saveLevelState(level.chapterId, level.id);
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, [level, isInitialized, isSolved, gameActions]);

  const progress = isInitialized ? getProgressPercentage(currentGrid) : 0;

  const handleTilePress = useCallback(
    (index: number) => {
      if (isSolved) return;
      const moved = gameActions.moveTile(index);

      // Check win condition after move
      if (moved) {
        // Get updated state after move
        const updatedState = useGameStore.getState();
        if (updatedState.isSolved && updatedState.isInitialized) {
          if (level) {
            gameActions.clearLevelState(level.chapterId, level.id);
          }
          onWin?.(updatedState.moveCount);
        }
      }
    },
    [isSolved, gameActions, level, onWin],
  );

  const resetGame = useCallback(() => {
    if (level) {
      gameActions.clearLevelState(level.chapterId, level.id);
    }
    gameActions.resetGame();
  }, [gameActions, level]);

  const completeAndSave = useCallback(() => {
    if (isSolved && level) {
      progressActions.completeLevel(
        level.chapterId,
        level.id,
        moveCount,
        normalizeGridSize(level.gridSize),
      );
    }
  }, [isSolved, level, moveCount, progressActions]);

  return {
    grid: currentGrid,
    emptySlotIndex,
    moveCount,
    isSolved,
    gridSize: gridSize || normalizeGridSize(level?.gridSize),
    isInitialized,
    progress,
    hintedTiles,
    handleTilePress,
    resetGame,
    useHint: gameActions.useHint,
    saveState: () =>
      level && gameActions.saveLevelState(level.chapterId, level.id),
    completeAndSave,
  };
};
