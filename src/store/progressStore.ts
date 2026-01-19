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

export const useProgressStore = create<ProgressStore>((set, get) => ({
  progress: createInitialProgress(),
  isLoaded: false,

  actions: {
    loadProgress: async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROGRESS);
        if (stored) {
          set({ progress: JSON.parse(stored), isLoaded: true });
        }

        const currentUser = auth?.currentUser;
        if (currentUser) {
          console.log("🔍 Loading progress for user:", currentUser.uid);
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const cloudData = userDoc.data();
            console.log(
              "☁️ Raw cloud data:",
              JSON.stringify(cloudData, null, 2),
            );

            // Convert flat Firestore structure to nested object
            // Firestore stores: "progress.completedLevels.1-2": {...}
            // We need: { progress: { completedLevels: { "1-2": {...} } } }
            const convertFlatToNested = (flatData: any): any => {
              const result: any = {};

              for (const key in flatData) {
                if (key.startsWith("progress.")) {
                  const parts = key.split(".");
                  let current = result;

                  for (let i = 0; i < parts.length - 1; i++) {
                    const part = parts[i];
                    if (!current[part]) {
                      current[part] = {};
                    }
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
            console.log(
              "🔄 Converted to nested:",
              JSON.stringify(nestedData, null, 2),
            );

            // Ensure we have all required fields with defaults
            const cloudProgress: UserProgress = {
              completedLevels: nestedData?.progress?.completedLevels || {},
              totalStars: nestedData?.progress?.totalStars || 0,
              totalCoins: nestedData?.progress?.totalCoins || 0,
              unlockedChapters: nestedData?.progress?.unlockedChapters || [1],
              lastPlayed: nestedData?.progress?.lastPlayed,
            };

            console.log("📊 Parsed cloudProgress:", {
              completedLevelsCount: Object.keys(
                cloudProgress.completedLevels || {},
              ).length,
              totalStars: cloudProgress.totalStars,
              unlockedChapters: cloudProgress.unlockedChapters,
            });

            // Basic validation to ensure we don't wipe local state with empty cloud state if cloud is empty
            // But here we trust cloud if it has data.
            // Check if cloud has meaningful data (e.g. at least one level unlocked/completed)
            if (
              cloudProgress.completedLevels &&
              Object.keys(cloudProgress.completedLevels).length > 0
            ) {
              console.log("✅ Setting cloud progress to state");
              set({ progress: cloudProgress, isLoaded: true });
              await AsyncStorage.setItem(
                STORAGE_KEYS.USER_PROGRESS,
                JSON.stringify(cloudProgress),
              );
            } else {
              console.log("⚠️ Cloud progress empty, keeping local data");
            }
          } else {
            console.log("❌ User document does not exist");
          }
        } else {
          console.log("❌ No current user");
        }
        set({ isLoaded: true });
      } catch (error) {
        console.error("Progress yükleme hatası:", error);
        set({ isLoaded: true });
      }
    },

    // saveProgress removed - dangerous as it overwrites entire object

    completeLevel: async (
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

      let newChapterUnlocked = false;
      let nextChapterId = chapterId + 1;

      // Coin Logic: Every 4 UNIQUE levels completed = 1 Coin
      const wasBrandNewLevel = !existingProgress || !existingProgress.completed;
      const currentCompletedCount = Object.values(
        progress.completedLevels,
      ).filter((l) => l.completed).length;

      let coinBonus = 0;
      if (wasBrandNewLevel) {
        // We just completed a new level.
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
        newChapterUnlocked = true;
      }

      // Update Local State
      set({ progress: newProgress });
      // Update Local Storage
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PROGRESS,
        JSON.stringify(newProgress),
      );

      // Update Cloud with proper nested structure
      const user = auth.currentUser;
      if (user) {
        try {
          // Build proper nested structure instead of dot notation
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

          console.log("💾 Saving to cloud:", levelKey, newLevelProgress);

          // Use setDoc with merge to update nested fields properly
          await setDoc(doc(db, "users", user.uid), cloudUpdate, {
            merge: true,
          });
        } catch (e) {
          console.error("Cloud level save error:", e);
          // Queue for offline sync
          const { queueProgressUpdate } = await import("../services/syncQueue");
          await queueProgressUpdate(
            chapterId,
            levelId,
            newLevelProgress.bestMoves,
            newLevelProgress.stars,
          );
        }
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
