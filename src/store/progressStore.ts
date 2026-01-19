import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { create } from "zustand";
import { auth, db } from "../../firebaseConfig";
import {
  calculateStars,
  LEVELS_PER_CHAPTER,
  STORAGE_KEYS,
} from "../constants/gameConfig";
import { GridSize, LevelProgress, UserProgress } from "../types";

interface ProgressState {
  progress: UserProgress;
  isLoaded: boolean;
  isLoading: boolean;
}

interface ProgressActions {
  loadProgress: () => Promise<void>;
  saveProgress: () => Promise<void>;
  completeLevel: (
    chapterId: number,
    levelId: number,
    moves: number,
    gridSize: GridSize,
  ) => void;
  setLastPlayed: (chapterId: number, levelId: number) => void;
  isLevelUnlocked: (chapterId: number, levelId: number) => boolean;
  isChapterUnlocked: (chapterId: number) => boolean;
  getLevelProgress: (
    chapterId: number,
    levelId: number,
  ) => LevelProgress | null;
  getChapterProgress: (chapterId: number) => {
    completed: number;
    total: number;
    stars: number;
  };
  getLastPlayed: () => { chapterId: number; levelId: number } | null;
  getNextPlayableLevel: () => { chapterId: number; levelId: number };
}

interface ProgressStore extends ProgressState {
  actions: ProgressActions;
}

const createInitialProgress = (): UserProgress => ({
  unlockedChapters: [1],
  completedLevels: {},
  totalStars: 0,
  totalCoins: 0,
  lastPlayed: undefined,
});

const getLevelKey = (chapterId: number, levelId: number): string =>
  `${chapterId}-${levelId}`;

let loadingPromise: Promise<void> | null = null;

export const useProgressStore = create<ProgressStore>((set, get) => ({
  progress: createInitialProgress(),
  isLoaded: false,
  isLoading: false,

  actions: {
    loadProgress: async () => {
      const { isLoaded, isLoading } = get();

      // Prevent duplicate loads
      if (isLoaded) return;

      // If already loading, we could return a stored promise, but for now just returning if in progress is safer to avoid loops,
      // though typically we want to wait.
      // Better pattern: Store the active promise.
      if (isLoading) {
        // If we had a mechanism to return the active promise, we would.
        // For now, if loading, just wait a bit or assume it will finish?
        // Actually, if we return early, the component awaiting this might proceed before data is ready.
        // Let's add 'loadingPromise' to state/module scope or just keep it simple:
        // If loading/loaded, do nothing?
        // But the caller expects to await completion.
        // A simple class-level variable outside store can hold the promise.
        return loadingPromise || Promise.resolve();
      }

      set({ isLoading: true });

      loadingPromise = (async () => {
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROGRESS);
          if (stored) {
            set({ progress: JSON.parse(stored) }); // Don't set isLoaded yet, wait for cloud? No, show local asap.
          }

          const currentUser = auth?.currentUser;
          if (currentUser) {
            console.log("🔍 Loading progress for user:", currentUser.uid);
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (userDoc.exists()) {
              const cloudData = userDoc.data();
              // ... cloud parsing logic ...
              // Helper defined inline or outside.
              // To minimize diff, we'll keep inline but abbreviated in replacement if not changing.
              // Actually we need to copy the helper or move it out.
              // Moving helper out of function scope is cleaner.

              const convertFlatToNested = (flatData: any): any => {
                const result: any = {};
                for (const key in flatData) {
                  if (key.startsWith("progress.")) {
                    const parts = key.split(".");
                    let current = result;
                    for (let i = 0; i < parts.length - 1; i++) {
                      const part = parts[i];
                      if (!current[part]) current[part] = {};
                      current = current[part];
                    }
                    current[parts[parts.length - 1]] = flatData[key];
                  } else if (key !== "lastUpdated") {
                    result[key] = flatData[key];
                  }
                }
                return result;
              };

              const nestedData = convertFlatToNested(cloudData);

              const cloudProgress: UserProgress = {
                completedLevels: nestedData?.progress?.completedLevels || {},
                totalStars: nestedData?.progress?.totalStars || 0,
                totalCoins: nestedData?.progress?.totalCoins || 0,
                unlockedChapters: nestedData?.progress?.unlockedChapters || [1],
                lastPlayed: nestedData?.progress?.lastPlayed,
              };

              if (
                cloudProgress.completedLevels &&
                Object.keys(cloudProgress.completedLevels).length > 0
              ) {
                console.log("✅ Setting cloud progress to state");
                set({ progress: cloudProgress });
                await AsyncStorage.setItem(
                  STORAGE_KEYS.USER_PROGRESS,
                  JSON.stringify(cloudProgress),
                );
              }
            }
          }
          set({ isLoaded: true, isLoading: false });
        } catch (error) {
          console.error("Progress yükleme hatası:", error);
          set({ isLoaded: true, isLoading: false });
        } finally {
          loadingPromise = null;
        }
      })();

      return loadingPromise;
    },

    // PERFORMANCE: Sync function - UI updates immediately
    // Storage and network writes happen in background (fire-and-forget)
    completeLevel: (
      chapterId: number,
      levelId: number,
      moves: number,
      gridSize: GridSize,
    ) => {
      const { progress } = get();
      const levelKey = getLevelKey(chapterId, levelId);
      const stars = calculateStars(moves, gridSize);
      const existingProgress = progress.completedLevels[levelKey];

      const newLevelProgress: LevelProgress = {
        completed: true,
        bestMoves: existingProgress
          ? Math.min(existingProgress.bestMoves, moves)
          : moves,
        stars: existingProgress
          ? Math.max(existingProgress.stars, stars)
          : stars,
      };

      const starDiff = newLevelProgress.stars - (existingProgress?.stars || 0);

      let nextChapterId = chapterId + 1;

      // Coin Logic: Every 4 UNIQUE levels completed = 1 Coin
      const wasBrandNewLevel = !existingProgress || !existingProgress.completed;
      const currentCompletedCount = Object.values(
        progress.completedLevels,
      ).filter((l) => l.completed).length;

      let coinBonus = 0;
      if (wasBrandNewLevel) {
        const newTotalCompleted = currentCompletedCount + 1;
        if (newTotalCompleted % 4 === 0) {
          coinBonus = 1;
        }
      }

      let newProgress = {
        ...progress,
        completedLevels: {
          ...progress.completedLevels,
          [levelKey]: newLevelProgress,
        },
        totalStars: progress.totalStars + starDiff,
        totalCoins: (progress.totalCoins || 0) + coinBonus,
      };

      if (
        levelId === LEVELS_PER_CHAPTER &&
        !progress.unlockedChapters.includes(nextChapterId)
      ) {
        newProgress.unlockedChapters = [
          ...newProgress.unlockedChapters,
          nextChapterId,
        ].sort((a, b) => a - b);
      }

      // 1. Update Local State IMMEDIATELY (UI updates now, WinModal shows)
      set({ progress: newProgress });

      // 2. FIRE-AND-FORGET: AsyncStorage save (no await)
      AsyncStorage.setItem(
        STORAGE_KEYS.USER_PROGRESS,
        JSON.stringify(newProgress),
      ).catch((e) => console.error("AsyncStorage save error:", e));

      // 3. FIRE-AND-FORGET: Cloud sync (no await)
      const user = auth.currentUser;
      if (user) {
        const cloudUpdate = {
          progress: {
            completedLevels: {
              [levelKey]: newLevelProgress,
            },
            totalStars: newProgress.totalStars,
            totalCoins: newProgress.totalCoins,
            unlockedChapters: newProgress.unlockedChapters,
          },
          lastUpdated: new Date().toISOString(),
        };

        console.log("💾 Saving to cloud (background):", levelKey);

        setDoc(doc(db, "users", user.uid), cloudUpdate, { merge: true }).catch(
          async (e) => {
            console.error("Cloud level save error:", e);
            // Queue for offline sync
            const { queueProgressUpdate } =
              await import("../services/syncQueue");
            queueProgressUpdate(
              chapterId,
              levelId,
              newLevelProgress.bestMoves,
              newLevelProgress.stars,
            ).catch((queueErr) => console.error("Queue error:", queueErr));
          },
        );
      }
    },

    setLastPlayed: async (chapterId: number, levelId: number) => {
      const { progress } = get();
      const lastPlayed = { chapterId, levelId };
      const newProgress = { ...progress, lastPlayed };

      set({ progress: newProgress });
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PROGRESS,
        JSON.stringify(newProgress),
      );

      const user = auth.currentUser;
      if (user) {
        try {
          await setDoc(
            doc(db, "users", user.uid),
            {
              progress: {
                lastPlayed: lastPlayed,
              },
              lastUpdated: new Date().toISOString(),
            },
            { merge: true },
          );
        } catch (e) {
          console.error("Last played save error:", e);
        }
      }
    },

    isLevelUnlocked: (chapterId: number, levelId: number) => {
      const { progress } = get();
      if (!progress.unlockedChapters.includes(chapterId)) return false;
      if (levelId === 1) return true;
      const prevLevelKey = getLevelKey(chapterId, levelId - 1);
      return progress.completedLevels[prevLevelKey]?.completed ?? false;
    },

    isChapterUnlocked: (chapterId: number) => {
      return get().progress.unlockedChapters.includes(chapterId);
    },

    getLevelProgress: (chapterId: number, levelId: number) => {
      return (
        get().progress.completedLevels[getLevelKey(chapterId, levelId)] ?? null
      );
    },

    getChapterProgress: (chapterId: number) => {
      const { progress } = get();
      let completed = 0;
      let stars = 0;

      for (let i = 1; i <= LEVELS_PER_CHAPTER; i++) {
        const levelProgress =
          progress.completedLevels[getLevelKey(chapterId, i)];
        if (levelProgress?.completed) {
          completed++;
          stars += levelProgress.stars;
        }
      }

      return { completed, total: LEVELS_PER_CHAPTER, stars };
    },

    getLastPlayed: () => {
      const { progress } = get();
      return progress.lastPlayed ?? null;
    },

    // Kept for interface compatibility but warns
    saveProgress: async () => {
      console.warn(
        "Generic saveProgress is deprecated to prevent data loss. Use granular actions.",
      );
    },

    getNextPlayableLevel: () => {
      const { progress } = get();
      const lastPlayed = progress.lastPlayed;

      // 1. No history -> Start 1-1
      if (!lastPlayed) {
        return { chapterId: 1, levelId: 1 };
      }

      // 2. Check if the last played level is completed
      const levelKey = getLevelKey(lastPlayed.chapterId, lastPlayed.levelId);
      const isCompleted = progress.completedLevels[levelKey]?.completed;

      if (!isCompleted) {
        // Stay on this level
        return lastPlayed;
      }

      // 3. Logic for Next Level
      // Current level completed, so move to next.
      let nextChapter = lastPlayed.chapterId;
      let nextLevel = lastPlayed.levelId + 1;

      // Check Chapter Boundary
      if (nextLevel > LEVELS_PER_CHAPTER) {
        nextChapter++;
        nextLevel = 1;
      }

      // We don't check TOTAL_CHAPTERS here; let the UI handle "Coming Soon" or valid check if needed.
      // But typically we just return valid coordinates.

      return { chapterId: nextChapter, levelId: nextLevel };
    },
  },
}));

export const useProgressActions = () =>
  useProgressStore((state) => state.actions);
export const useTotalStars = () =>
  useProgressStore((state) => state.progress.totalStars);
export const useTotalCoins = () =>
  useProgressStore((state) => state.progress.totalCoins || 0);
export const useLastPlayed = () =>
  useProgressStore((state) => state.progress.lastPlayed);
