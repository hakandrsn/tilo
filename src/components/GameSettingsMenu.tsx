import { Ionicons } from "@expo/vector-icons"; // Need to check if Feather/MaterialIcons fit better or stick to Ionicons
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
    soundEnabled,
    actions: { toggleHaptics, toggleMusic, toggleSound },
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

              {/* Haptics Toggle */}
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
                  trackColor={{ false: "#e0e0e0", true: COLORS.primary }} // Use primary (sunflower) for on
                  thumbColor={"#fff"}
                />
              </View>

              {/* Music Toggle */}
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

              {/* Sound Toggle */}
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
    // User said "overlaysiz bir modal açılacak". If I interpret strictly, maybe just a dropdown?
    // But then click-outside-to-close is harder without full view.
    // I'll make the background transparent-ish or very subtle.
    // "overlaysiz" usually implies "don't dim the whole screen".
    // I will use transparent overlay to catch clicks but show game behind clearly.
    // Just alignment: center or top-right? User didn't specify position, just "modal".
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
});

export default GameSettingsMenu;
