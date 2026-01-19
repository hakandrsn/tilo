import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SettingsState {
  hapticsEnabled: boolean;
  musicEnabled: boolean;
  soundEnabled: boolean;

  actions: {
    toggleHaptics: () => void;
    toggleMusic: () => void;
    toggleSound: () => void;
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hapticsEnabled: true,
      musicEnabled: false, // Default off as per request "şuan yok ama bir müzik koyacağız" music close
      soundEnabled: true,

      actions: {
        toggleHaptics: () =>
          set((state) => ({ hapticsEnabled: !state.hapticsEnabled })),
        toggleMusic: () =>
          set((state) => ({ musicEnabled: !state.musicEnabled })),
        toggleSound: () =>
          set((state) => ({ soundEnabled: !state.soundEnabled })),
      },
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hapticsEnabled: state.hapticsEnabled,
        musicEnabled: state.musicEnabled,
        soundEnabled: state.soundEnabled,
      }),
    },
  ),
);

// Selector hooks for convenience
export const useSettingsActions = () =>
  useSettingsStore((state) => state.actions);
export const useHapticsEnabled = () =>
  useSettingsStore((state) => state.hapticsEnabled);
export const useMusicEnabled = () =>
  useSettingsStore((state) => state.musicEnabled);
export const useSoundEnabled = () =>
  useSettingsStore((state) => state.soundEnabled);
