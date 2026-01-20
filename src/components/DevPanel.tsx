import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { doc, writeBatch } from "firebase/firestore";
import { getDownloadURL, getStorage, ref } from "firebase/storage";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../firebaseConfig";
import { COLORS, getGridSizeForLevel } from "../constants/gameConfig";
import {
  updateAllChaptersGridSize,
  updateChapterLevelsGridSize,
} from "../services/dataService";
import { useGameStore } from "../store/gameStore";
import { useHintActions } from "../store/hintStore";
import { useProgressActions } from "../store/progressStore";
import { createSolvedGrid } from "../utils/puzzleLogic";

const uploadLevelsToFirebase = async (targetChapterId: string) => {
  const storage = getStorage();
  const batch = writeBatch(db);

  const FILE_EXTENSION = ".jpg";
  const FOLDER_NAME = `chapter-${targetChapterId}-levels`; // Dynamic folder name

  try {
    console.log(
      `⏳ Level yüklemesi başlıyor... Chapter: ${targetChapterId}, Folder: ${FOLDER_NAME}`,
    );

    const promises = Array.from({ length: 24 }, (_, i) => i + 1).map(
      async (levelId) => {
        // 1. Storage path: "chapter-1-levels/level-1.jpg"
        const fileName = `level-${levelId}${FILE_EXTENSION}`;
        const storageRef = ref(storage, `${FOLDER_NAME}/${fileName}`);

        let downloadUrl = "";
        try {
          downloadUrl = await getDownloadURL(storageRef);
          console.log(`✅ Level ${levelId} resmi bulundu`);
        } catch (err) {
          console.error(`❌ Level ${levelId} resmi YOK: ${fileName}`);
          downloadUrl = "https://via.placeholder.com/500";
        }

        // 2. Prepare Data
        const gridSize = getGridSizeForLevel(levelId);
        const levelData = {
          id: levelId,
          chapterId: Number(targetChapterId),
          gridSize: gridSize,
          imageSource: { uri: downloadUrl },
          moves: 0, // Reset logic or default
          stars: 0,
        };

        // 3. Firestore Ref: chapters/{id}/levels/{levelId}
        const levelDocRef = doc(
          db,
          "chapters",
          targetChapterId,
          "levels",
          levelId.toString(),
        );
        batch.set(levelDocRef, levelData, { merge: true });
      },
    );

    // Wait for all
    await Promise.all(promises);

    // Commit batch
    await batch.commit();

    alert(`Chapter ${targetChapterId} için 24 level yüklendi! 🚀`);
  } catch (error) {
    console.error("Level Upload Hatası:", error);
    alert("Hata oluştu, konsola bak.");
  }
};

const DevPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [chapterId, setChapterId] = useState("1");
  const [levelId, setLevelId] = useState("1");
  const router = useRouter();
  const gameStore = useGameStore();
  const hintActions = useHintActions();
  const progressActions = useProgressActions();

  const goToLevel = () => {
    const cId = parseInt(chapterId) || 1;
    const lId = parseInt(levelId) || 1;
    router.push(`/game/jigsaw/${cId}/${lId}`);
    setIsOpen(false);
  };

  const solveGame = () => {
    const { gridSize } = gameStore;
    if (gridSize && gridSize.cols > 0 && gridSize.rows > 0) {
      const solvedGrid = createSolvedGrid(gridSize);
      const emptyIndex = gridSize.cols * gridSize.rows - 1;
      useGameStore.setState({
        currentGrid: solvedGrid,
        emptySlotIndex: emptyIndex,
        isSolved: true,
      });

      // Reset isSolved after win modal triggers to prevent ghost wins
      setTimeout(() => {
        useGameStore.setState({ isSolved: false });
      }, 100);
    }
    setIsOpen(false);
  };

  const addHints = () => {
    hintActions.addHints(1000);
    setIsOpen(false);
  };

  const clearStorage = async () => {
    Alert.alert(
      "Tüm Veriyi Sil",
      "AsyncStorage'daki TÜM veriler silinecek (progress, hints, level states). Emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert(
                "Başarılı",
                "Tüm veriler silindi. Uygulama yeniden başlatılıyor...",
              );
              setIsOpen(false);
              // Reload app
              setTimeout(() => {
                router.replace("/");
              }, 500);
            } catch (error) {
              Alert.alert("Hata", "Veri silinirken hata oluştu: " + error);
            }
          },
        },
      ],
    );
  };

  return (
    <>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.floatingButtonText}>🛠</Text>
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.panel}>
            <Text style={styles.title}>Dev Panel</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Level'e Git</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bölüm</Text>
                  <TextInput
                    style={styles.input}
                    value={chapterId}
                    onChangeText={setChapterId}
                    keyboardType="number-pad"
                    placeholder="1-20"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Level</Text>
                  <TextInput
                    style={styles.input}
                    value={levelId}
                    onChangeText={setLevelId}
                    keyboardType="number-pad"
                    placeholder="1-24"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={styles.button}
                onPress={goToLevel}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Git</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hızlı Aksiyonlar</Text>
              <TouchableOpacity
                style={[styles.button, styles.solveButton]}
                onPress={solveGame}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>🎯 Puzzle'ı Çöz</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.hintButton]}
                onPress={addHints}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>💡 +10 Hamle Hakkı</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.clearButton]}
                onPress={clearStorage}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>🗑️ Storage Temizle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.clearButton]}
                onPress={() => uploadLevelsToFirebase(chapterId)}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Firebase'a Yükle (Levels)</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Grid Boyutlarını Güncelle</Text>
              <TouchableOpacity
                style={[styles.button, styles.updateButton]}
                onPress={async () => {
                  try {
                    await updateChapterLevelsGridSize(parseInt(chapterId));
                    Alert.alert(
                      "Başarılı",
                      `Chapter ${chapterId} gridleri güncellendi!`,
                    );
                  } catch (e) {
                    Alert.alert("Hata", "Güncelleme başarısız.");
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  Chapter {chapterId} Gridlerini Güncelle
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.updateButton, { marginTop: 8 }]}
                onPress={async () => {
                  try {
                    await updateAllChaptersGridSize();
                    Alert.alert(
                      "Başarılı",
                      "TÜM Chapter gridleri güncellendi!",
                    );
                  } catch (e) {
                    Alert.alert("Hata", "Toplu güncelleme başarısız.");
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>TÜM Chapterları Güncelle</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsOpen(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    bottom: 100,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    elevation: 10,
  },
  floatingButtonText: { fontSize: 20 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 320,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primaryText,
    textAlign: "center",
    marginBottom: 20,
  },
  section: { marginBottom: 20, gap: 10 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  inputRow: { flexDirection: "row", gap: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  solveButton: { backgroundColor: "#22c55e" },
  hintButton: { backgroundColor: COLORS.accent },
  clearButton: { backgroundColor: "#ef4444" },
  migrateButton: { backgroundColor: "#6366f1" },
  updateButton: { backgroundColor: "#eab308" }, // Yellow/Amber for update
  buttonText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "600" },
  closeButton: { paddingVertical: 12, alignItems: "center" },
  closeButtonText: { color: COLORS.textMuted, fontSize: 14 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
});

export default DevPanel;
