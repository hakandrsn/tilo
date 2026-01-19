import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Stores & Hooks
import { COLORS } from "@/src/constants/gameConfig";
import { useJigsawStore } from "@/src/modules/jigsaw/jigsawStore";
import { useAdStore } from "@/src/store/adStore";
import { useDataActions } from "@/src/store/dataStore";
import { Level } from "@/src/types";

// Components
import GameBannerAd from "@/src/components/GameBannerAd";
import GameSettingsMenu from "@/src/components/GameSettingsMenu";
import JigsawBoard from "@/src/modules/jigsaw/JigsawBoard";

export default function JigsawGameScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const { chapterId, levelId } = useLocalSearchParams<{
    chapterId: string;
    levelId: string;
  }>();

  const { getLevelById, getChapters } = useDataActions();
  const resetGame = useJigsawStore((state) => state.actions.resetGame);
  const status = useJigsawStore((state) => state.status);
  const canShowBanner = useAdStore((state) => state.actions.canShowBanner);

  const [level, setLevel] = useState<Level | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showContinue, setShowContinue] = useState(false);

  // Win Animation SharedValues
  const headerTranslateY = useSharedValue(0);
  const boardScale = useSharedValue(1);
  const continueButtonTranslateY = useSharedValue(100); // Start off-screen

  // Initialize Data
  useEffect(() => {
    const initData = async () => {
      await getChapters();
      const l = await getLevelById(Number(chapterId), Number(levelId));
      setLevel(l);
      setIsLoading(false);
    };
    initData();
  }, [chapterId, levelId]);

  // Clean on unmount
  useEffect(() => {
    return () => {
      resetGame();
    };
  }, []);

  // Win Animation Sequence
  // Win Animation Sequence & Prefetch
  useEffect(() => {
    if (status === "won") {
      // 1. Trigger background prefetch for next level image
      const prefetchNextLevel = async () => {
        try {
          // Calculate next level ID
          // (Assuming simple progression: level X -> level X+1 in same chapter)
          // TODO: Handle Chapter transition logic if needed (e.g. if levelId == LEVELS_PER_CHAPTER)
          const nextLvlId = Number(levelId) + 1;
          const nextLvl = await getLevelById(Number(chapterId), nextLvlId);

          if (nextLvl?.imageSource) {
            // Check if it's a remote URI or local require
            const source = nextLvl.imageSource;
            if (typeof source === "object" && "uri" in source && source.uri) {
              console.log("🚀 Prefetching next level image:", source.uri);
              await Image.prefetch(source.uri);
            } else {
              // Local assets don't strictly need prefetch but standard Image.prefetch usually handles uris.
              // For require() assets, they are bundled.
            }
          }
        } catch (e) {
          console.warn("Prefetch failed:", e);
        }
      };
      prefetchNextLevel();

      // Delay before starting win sequence
      const timer = setTimeout(() => {
        // 2. Header slides up
        headerTranslateY.value = withTiming(-100, { duration: 400 });

        // 3. Board scales down (perspective effect)
        boardScale.value = withTiming(0.85, { duration: 500 });

        // 4. Show continue button (slides up after delay)
        setShowContinue(true);
        continueButtonTranslateY.value = withDelay(
          300,
          withTiming(0, { duration: 400 }),
        );
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleBack = () => {
    router.back();
  };

  const handleNextLevel = () => {
    const nextLevelId = Number(levelId) + 1;
    router.replace(`/game/jigsaw/${chapterId}/${nextLevelId}`);
  };

  const handleReplay = () => {
    // Reset animations
    headerTranslateY.value = 0;
    boardScale.value = 1;
    continueButtonTranslateY.value = 100;
    setShowContinue(false);

    resetGame();
    if (level) {
      useJigsawStore.getState().actions.initializeLevel(level.gridSize);
    }
  };

  // Animated Styles
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const boardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }],
  }));

  const continueButtonStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: continueButtonTranslateY.value }],
  }));

  if (isLoading || !level) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  // Layout Calculations
  const HEADER_HEIGHT = 60;
  const BANNER_HEIGHT = canShowBanner() ? 60 : 0; // Approximate banner height

  // Total top inset including status bar, header
  const topInset = insets.top;
  const contentTopStart = topInset + HEADER_HEIGHT;

  // Available height for the board
  // Board sits between Header and Bottom functionality.
  // We need to account for insets.bottom OR Banner height, whichever implies the visual bottom logic.
  // If banner is at bottom 0, it covers insets.bottom.
  // So we reserve strictly the max of (insets.bottom, BANNER_HEIGHT) or just BANNER_HEIGHT involved?
  // User said "inset dışına tam sıfır", implying banner is at strictly 0.
  // For usability, the board shouldn't be covered.
  // I will subtract BANNER_HEIGHT + a small padding maybe?
  // Let's assume banner is ON TOP of the bottom area.
  const bottomSpace = canShowBanner() ? BANNER_HEIGHT : insets.bottom;
  const boardHeight = height - contentTopStart - bottomSpace;

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: COLORS.background }}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER - Animated for win sequence */}
      <Animated.View
        style={[
          styles.header,
          { top: insets.top, height: HEADER_HEIGHT },
          headerAnimatedStyle,
        ]}
      >
        {/* Left: Back & Reload */}
        <View style={styles.headerLeftGroups}>
          <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
            <Ionicons
              name="chevron-back"
              size={28}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => resetGame()}
            style={styles.headerBtn}
          >
            <Ionicons name="refresh" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Center: Title */}
        <Text style={styles.headerTitle} numberOfLines={1}>
          {level.name || `Level ${levelId}`}
        </Text>

        {/* Right: Settings (and Preview) */}
        <View style={styles.headerRightGroups}>
          {/* Keeping Preview but making it smaller/secondary or just icon? 
              User didn't strictly say remove it, but focused on Settings. 
              I'll keep it as an icon button to save space if needed, 
              or keep thumbnail if it fits. Thumbnail is nice. 
              Let's keep thumbnail but add settings to its right. 
          */}
          <TouchableOpacity
            onPress={() => setShowPreview(true)}
            style={styles.headerBtn}
          >
            {/* Making thumbnail slightly smaller or just icon? 
               Thumbnail is 32x32. It's fine. */}
            <Image
              source={level.imageSource}
              style={styles.thumbnail}
              contentFit="cover"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            style={styles.headerBtn}
          >
            <Ionicons
              name="settings-sharp"
              size={24}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* GAME BOARD - Animated for win sequence */}
      <Animated.View
        style={[
          styles.gameArea,
          {
            marginTop: contentTopStart,
            height: boardHeight,
            marginBottom: insets.bottom,
          },
          boardAnimatedStyle,
        ]}
      >
        <JigsawBoard
          gridSize={level.gridSize}
          imageSource={level.imageSource}
          boardWidth={width}
          boardHeight={boardHeight}
        />
      </Animated.View>

      {/* IMAGE PREVIEW MODAL */}
      <Modal
        visible={showPreview}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPreview(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPreview(false)}
        >
          <View style={styles.previewContainer}>
            <Image
              source={level.imageSource}
              style={{ width: width * 0.9, height: height * 0.6 }}
              contentFit="contain"
            />
            <Text style={styles.previewText}>Tap to Close</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* CONTINUE BUTTON (Win Sequence) */}
      {showContinue && (
        <Animated.View style={[styles.continueContainer, continueButtonStyle]}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleNextLevel}
          >
            <Text style={styles.continueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.replayButton} onPress={handleReplay}>
            <Ionicons name="refresh" size={18} color={COLORS.textSecondary} />
            <Text style={styles.replayText}>Replay</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* SETTINGS MENU */}
      <GameSettingsMenu
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* BOTTOM BANNER AD */}
      {canShowBanner() && (
        <View style={styles.bottomBanner}>
          <GameBannerAd />
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8, // Reduced padding to fit more items
    zIndex: 100,
  },
  headerLeftGroups: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerRightGroups: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  thumbnail: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bannerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    zIndex: 90,
  },
  gameArea: {
    width: "100%",
    backgroundColor: COLORS.background,
    overflow: "hidden",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  previewText: {
    color: COLORS.textPrimary,
    marginTop: 20,
    fontSize: 16,
    opacity: 0.8,
  },
  continueContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 12,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  continueText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "bold",
  },
  replayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replayText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  bottomBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999, // On top of board
    backgroundColor: "transparent", // Ad component handles bg
  },
});
