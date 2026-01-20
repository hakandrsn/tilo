import { useAudioPlayer } from "expo-audio";
import React, { useEffect, useState } from "react";
import { useSettingsStore } from "../store/settingsStore";

const TRACKS = [
  require("@/src/assets/sounds/bg/s1.mp3"),
  require("@/src/assets/sounds/bg/s2.mp3"),
  require("@/src/assets/sounds/bg/s3.mp3"),
  require("@/src/assets/sounds/bg/s4.mp3"),
];

const BackgroundMusic: React.FC = () => {
  const { musicEnabled, musicVolume } = useSettingsStore();

  // Pick random track on initial load
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() =>
    Math.floor(Math.random() * TRACKS.length),
  );

  const player = useAudioPlayer(TRACKS[currentTrackIndex]);

  // Handle Play/Pause and Volume
  useEffect(() => {
    player.volume = musicVolume;
    player.loop = true;

    if (musicEnabled) {
      player.play();
    } else {
      player.pause();
    }
  }, [musicEnabled, musicVolume, player]);

  // Optional: Change track logic if needed?
  // Current logic: Random track picked on mount, loops forever.
  // User asked for "oyun başladığında rastgele çalacak".

  return null;
};

export default BackgroundMusic;
