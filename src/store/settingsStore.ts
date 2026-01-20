import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SettingsState {
  hapticsEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  soundEnabled: boolean;
  soundVolume: number;

  actions: {
    toggleHaptics: () => void;
    toggleMusic: () => void;
    setMusicVolume: (volume: number) => void;
    toggleSound: () => void;
    setSoundVolume: (volume: number) => void;
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hapticsEnabled: true,
      musicEnabled: false, // Default off as per request "şuan yok ama bir müzik koyacağız" music close
      musicVolume: 0.3,
      soundEnabled: true,
      soundVolume: 0.3,

      actions: {
        toggleHaptics: () =>
          set((state) => ({ hapticsEnabled: !state.hapticsEnabled })),
        toggleMusic: () =>
          set((state) => ({ musicEnabled: !state.musicEnabled })),
        setMusicVolume: (volume: number) => set({ musicVolume: volume }),
        toggleSound: () =>
          set((state) => ({ soundEnabled: !state.soundEnabled })),
        setSoundVolume: (volume: number) => set({ soundVolume: volume }),
      },
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hapticsEnabled: state.hapticsEnabled,
        musicEnabled: state.musicEnabled,
        musicVolume: state.musicVolume,
        soundEnabled: state.soundEnabled,
        soundVolume: state.soundVolume,
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
export const useMusicVolume = () =>
  useSettingsStore((state) => state.musicVolume);
export const useSoundEnabled = () =>
  useSettingsStore((state) => state.soundEnabled);
export const useSoundVolume = () =>
  useSettingsStore((state) => state.soundVolume);
