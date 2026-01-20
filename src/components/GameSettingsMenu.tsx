import { Ionicons } from "@expo/vector-icons"; // Need to check if Feather/MaterialIcons fit better or stick to Ionicons
import Slider from "@react-native-community/slider";
import React from "react";
import {
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { COLORS } from "../constants/gameConfig";
import { useSettingsStore } from "../store/settingsStore";

interface GameSettingsMenuProps {
  visible: boolean;
  onClose: () => void;
}

const GameSettingsMenu: React.FC<GameSettingsMenuProps> = ({
  visible,
  onClose,
}) => {
  const {
    hapticsEnabled,
    musicEnabled,
    musicVolume,
    soundEnabled,
    soundVolume,
    actions: {
      toggleHaptics,
      toggleMusic,
      setMusicVolume,
      toggleSound,
      setSoundVolume,
    },
  } = useSettingsStore();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menuContainer}>
              <View style={styles.header}>
                <Text style={styles.title}>Ayarlar</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Haptics */}
              <View style={styles.settingBlock}>
                <View style={styles.row}>
                  <View style={styles.labelContainer}>
                    <Ionicons
                      name="phone-portrait-outline"
                      size={22}
                      color={COLORS.textPrimary}
                    />
                    <Text style={styles.label}>Titreşim</Text>
                  </View>
                  <Switch
                    value={hapticsEnabled}
                    onValueChange={toggleHaptics}
                    trackColor={{ false: "#e0e0e0", true: COLORS.primary }}
                    thumbColor={"#fff"}
                  />
                </View>
              </View>

              {/* Music */}
              <View style={styles.settingBlock}>
                <View style={styles.row}>
                  <View style={styles.labelContainer}>
                    <Ionicons
                      name="musical-notes-outline"
                      size={22}
                      color={COLORS.textPrimary}
                    />
                    <Text style={styles.label}>Müzik</Text>
                  </View>
                  <Switch
                    value={musicEnabled}
                    onValueChange={toggleMusic}
                    trackColor={{ false: "#e0e0e0", true: COLORS.primary }}
                    thumbColor={"#fff"}
                  />
                </View>

                {musicEnabled && (
                  <View style={styles.sliderRow}>
                    <Ionicons
                      name="volume-low-outline"
                      size={20}
                      color={COLORS.textSecondary}
                    />
                    <Slider
                      style={{ flex: 1, height: 40 }}
                      minimumValue={0}
                      maximumValue={1}
                      value={musicVolume}
                      onValueChange={setMusicVolume}
                      minimumTrackTintColor={COLORS.primary}
                      maximumTrackTintColor={COLORS.border}
                      thumbTintColor={COLORS.primary}
                    />
                    <Ionicons
                      name="volume-high-outline"
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </View>
                )}
              </View>

              {/* Sound Effects */}
              <View style={styles.settingBlock}>
                <View style={styles.row}>
                  <View style={styles.labelContainer}>
                    <Ionicons
                      name="volume-high-outline"
                      size={22}
                      color={COLORS.textPrimary}
                    />
                    <Text style={styles.label}>Ses Efektleri</Text>
                  </View>
                  <Switch
                    value={soundEnabled}
                    onValueChange={toggleSound}
                    trackColor={{ false: "#e0e0e0", true: COLORS.primary }}
                    thumbColor={"#fff"}
                  />
                </View>

                {soundEnabled && (
                  <View style={styles.sliderRow}>
                    <Ionicons
                      name="volume-low-outline"
                      size={20}
                      color={COLORS.textSecondary}
                    />
                    <Slider
                      style={{ flex: 1, height: 40 }}
                      minimumValue={0}
                      maximumValue={1}
                      value={soundVolume}
                      onValueChange={setSoundVolume}
                      minimumTrackTintColor={COLORS.primary}
                      maximumTrackTintColor={COLORS.border}
                      thumbTintColor={COLORS.primary}
                    />
                    <Ionicons
                      name="volume-high-outline"
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </View>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "transparent", // Overlayless as requested
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    width: 280,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  settingBlock: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  label: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    paddingLeft: 34,
  },
});

export default GameSettingsMenu;
