import { useAudioPlayer } from "expo-audio";
import { useSettingsStore } from "../store/settingsStore";

export const useClickSound = () => {
  const player = useAudioPlayer(require("@/src/assets/sounds/click.mp3"));

  const playClick = () => {
    const { soundEnabled, soundVolume } = useSettingsStore.getState();

    if (soundEnabled && player) {
      player.volume = soundVolume;
      player.seekTo(0);
      player.play();
    }
  };

  return { playClick };
};
