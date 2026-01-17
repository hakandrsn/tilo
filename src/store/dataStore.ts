import { create } from "zustand";
import { fetchChapters, fetchLevels } from "../services/dataService";
import { Chapter, Level } from "../types";

interface DataState {
  chapters: Chapter[];
  levelsCache: Record<number, Level[]>; // chapterId -> Level[]
  isLoading: boolean;
}

interface DataActions {
  getChapters: () => Promise<Chapter[]>;
  getLevels: (chapterId: number) => Promise<Level[]>;
  getChapterById: (id: number) => Chapter | undefined;
  getLevelById: (
    chapterId: number,
    levelId: number,
  ) => Promise<Level | undefined>;
}

interface DataStore extends DataState {
  actions: DataActions;
}

export const useDataStore = create<DataStore>((set, get) => ({
  chapters: [],
  levelsCache: {},
  isLoading: false,

  actions: {
    getChapters: async () => {
      const { chapters } = get();
      if (chapters.length > 0) return chapters;

      set({ isLoading: true });
      const fetchedChapters = await fetchChapters();

      set({ chapters: fetchedChapters, isLoading: false });
      return fetchedChapters;
    },

    getLevels: async (chapterId: number) => {
      const { levelsCache } = get();
      if (levelsCache[chapterId]) return levelsCache[chapterId];
      console.log(levelsCache[chapterId]);

      set({ isLoading: true });
      const fetchedLevels = await fetchLevels(chapterId);
      set((state) => ({
        levelsCache: { ...state.levelsCache, [chapterId]: fetchedLevels },
        isLoading: false,
      }));
      return fetchedLevels;
    },

    getChapterById: (id: number) => {
      return get().chapters.find((c) => c.id === id);
    },

    getLevelById: async (chapterId: number, levelId: number) => {
      const levels = await get().actions.getLevels(chapterId);
      return levels.find((l) => l.id === levelId);
    },
  },
}));

export const useChapters = () => useDataStore((state) => state.chapters);
export const useDataActions = () => useDataStore((state) => state.actions);
export const useIsDataLoading = () => useDataStore((state) => state.isLoading);
