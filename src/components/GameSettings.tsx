import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { COLORS } from "../constants/gameConfig";
import { useClickSound } from "../hooks/useClickSound";
import GameSettingsMenu from "./GameSettingsMenu";

interface GameSettingsProps {
  iconColor?: string;
  iconSize?: number;
}

const GameSettings: React.FC<GameSettingsProps> = ({
  iconColor = COLORS.textPrimary,
  iconSize = 24,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const { playClick } = useClickSound();

  const handleOpen = () => {
    playClick(); // This will respect soundEnabled inside useClickSound
    setShowSettings(true);
  };

  return (
    <>
      <TouchableOpacity onPress={handleOpen} style={styles.headerBtn}>
        <Ionicons name="settings-sharp" size={iconSize} color={iconColor} />
      </TouchableOpacity>

      <GameSettingsMenu
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  headerBtn: {
    padding: 8,
  },
});

export default GameSettings;
