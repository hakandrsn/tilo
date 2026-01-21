import { useAudioPlayer } from "expo-audio";
import { useSettingsStore } from "../store/settingsStore";

export const useClickSound = () => {
  const player = useAudioPlayer(require("@/src/assets/sounds/click.mp3"));

  const playClick = () => {
    try {
      const state = useSettingsStore.getState();
      const soundEnabled = state.soundEnabled;
      const soundVolume = state.soundVolume;

      if (soundEnabled && player && soundVolume > 0) {
        player.volume = soundVolume;
        player.seekTo(0);
        player.play();
      }
    } catch (error) {
      console.warn("Error playing click sound:", error);
    }
  };

  return { playClick };
};
