import { Ionicons } from "@expo/vector-icons";
import { DotLottie } from "@lottiefiles/dotlottie-react-native";
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
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Stores & Hooks
import { calculateStars, COLORS } from "@/src/constants/gameConfig";
import { useJigsawStore } from "@/src/modules/jigsaw/jigsawStore";
import { useAdStore } from "@/src/store/adStore";
import { useDataActions } from "@/src/store/dataStore";

// Components
import GameBannerAd from "@/src/components/GameBannerAd";
import GameSettingsMenu from "@/src/components/GameSettingsMenu";
import JigsawBoard from "@/src/modules/jigsaw/JigsawBoard";
import { useProgressActions } from "@/src/store/progressStore";
import { Level } from "@/src/types";

export default function JigsawGameScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const { chapterId, levelId } = useLocalSearchParams<{
    chapterId: string;
    levelId: string;
  }>();

  const { getLevelById, getChapters } = useDataActions();
  const { completeLevel } = useProgressActions();
  const resetGame = useJigsawStore((state) => state.actions.resetGame);
  const status = useJigsawStore((state) => state.status);
  const moves = useJigsawStore((state) => state.moves); // Get moves
  const canShowBanner = useAdStore((state) => state.actions.canShowBanner);

  const [level, setLevel] = useState<Level | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showContinue, setShowContinue] = useState(false);

  // Win Animation SharedValues
  // Win Animation SharedValues
  const headerTranslateY = useSharedValue(0);
  const movesTranslateY = useSharedValue(0); // Moves Text moves UP
  const star1Scale = useSharedValue(0);
  const star2Scale = useSharedValue(0);
  const star3Scale = useSharedValue(0);
  const boardScale = useSharedValue(1);
  const boardTranslateY = useSharedValue(0); // Move board up to make room
  const continueButtonScale = useSharedValue(0); // Scale from 0 to 1

  const [earnedStars, setEarnedStars] = useState(0);

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
  useEffect(() => {
    if (status === "won" && level) {
      // 0. Save Progress
      completeLevel(Number(chapterId), Number(levelId), moves, level.gridSize);

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
      // Delay before starting win sequence
      const timer = setTimeout(() => {
        if (!level) return;
        // Calculate stars
        const stars = calculateStars(moves, level.gridSize);
        setEarnedStars(stars);

        // 2. Header slides up (Hide header)
        headerTranslateY.value = withTiming(-100, { duration: 400 });

        // 3. Moves Text slides UP (less aggressive)
        movesTranslateY.value = withTiming(-30, { duration: 500 });

        // 4. Board scales down & moves up
        boardScale.value = withTiming(0.85, { duration: 500 });
        boardTranslateY.value = withTiming(-60, { duration: 500 });

        // 5. Stars Animation (Sequential, simple scale, no bounce)
        setTimeout(() => {
          star1Scale.value = withTiming(1, { duration: 300 });
        }, 400);
        setTimeout(() => {
          star2Scale.value = withTiming(1, { duration: 300 });
        }, 600);
        setTimeout(() => {
          star3Scale.value = withTiming(1, { duration: 300 });
        }, 800);

        // 6. Show continue button (Scale in, no bounce)
        setTimeout(() => {
          setShowContinue(true);
          continueButtonScale.value = withTiming(1, { duration: 400 });
        }, 1200);
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
    boardTranslateY.value = 0;
    continueButtonScale.value = 0;
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

  const movesAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: movesTranslateY.value }],
  }));

  const star1Style = useAnimatedStyle(() => ({
    transform: [{ scale: star1Scale.value }],
  }));
  const star2Style = useAnimatedStyle(() => ({
    transform: [{ scale: star2Scale.value }],
  }));
  const star3Style = useAnimatedStyle(() => ({
    transform: [{ scale: star3Scale.value }],
  }));

  const boardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: boardScale.value },
      { translateY: boardTranslateY.value },
    ],
  }));

  const continueButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: continueButtonScale.value }],
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
  const MOVES_HEIGHT = 80; // Enough space for "32" font + label + margins
  const BANNER_HEIGHT = canShowBanner() ? 60 : 0; // Approximate banner height

  // Total top inset including status bar, header
  const topInset = insets.top;

  // Where the Board starts (below Header AND Moves)
  const contentTopStart = topInset + HEADER_HEIGHT + MOVES_HEIGHT;

  // Available height for the board
  // Board sits between Header+Moves and Bottom functionality.
  // Banner is at strictly Bottom 0.
  // We need to ensure we don't draw under the banner.
  // If Banner exists, we reserve BANNER_HEIGHT space at bottom.
  // If no banner, we reserve insets.bottom.
  const bottomSpace = canShowBanner() ? BANNER_HEIGHT : insets.bottom;

  const boardHeight = height - contentTopStart - bottomSpace;

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: COLORS.background }}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* CONFETTI - Behind everything */}
      {status === "won" && (
        <View style={styles.confettiContainer} pointerEvents="none">
          <DotLottie
            source={require("@/src/assets/animations/confettie.lottie")}
            style={{ flex: 1 }}
            autoplay
            loop={false}
          />
        </View>
      )}

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

        {/* Center: Title Only */}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {level.name || `Level ${levelId}`}
          </Text>
        </View>

        {/* Right: Settings (and Preview) */}
        <View style={styles.headerRightGroups}>
          {/* ... existing right buttons ... */}
          <TouchableOpacity
            onPress={() => setShowPreview(true)}
            style={styles.headerBtn}
          >
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

      {/* MOVES DISPLAY & STARS CONTAINER */}
      {/* Positioned just below header initially, moves UP when won */}
      <View
        style={[
          styles.statsContainer,
          {
            top: topInset + HEADER_HEIGHT,
            height: MOVES_HEIGHT,
          },
        ]}
      >
        <Animated.View style={[styles.movesBlock, movesAnimatedStyle]}>
          <Text style={styles.movesValueBig}>{moves}</Text>
          <Text style={styles.movesLabelSmall}>HAMLE</Text>
        </Animated.View>

        {/* STARS - Visible only when animating/won (controlled by scale) */}
        <View style={styles.starsRow}>
          <Animated.View style={star1Style}>
            <Ionicons
              name="star"
              size={48}
              color={earnedStars >= 1 ? COLORS.starFilled : COLORS.starEmpty}
            />
          </Animated.View>
          <Animated.View style={[star2Style, { marginTop: -20 }]}>
            <Ionicons
              name="star"
              size={64} // Middle star bigger
              color={earnedStars >= 2 ? COLORS.starFilled : COLORS.starEmpty}
            />
          </Animated.View>
          <Animated.View style={star3Style}>
            <Ionicons
              name="star"
              size={48}
              color={earnedStars >= 3 ? COLORS.starFilled : COLORS.starEmpty}
            />
          </Animated.View>
        </View>
      </View>

      {/* GAME BOARD - Animated for win sequence */}
      <Animated.View
        style={[
          styles.gameArea,
          {
            // Push board down to clear Header + Moves
            marginTop: contentTopStart,
            height: boardHeight, // Precise calculated height
            marginBottom: 0, // We handled bottomSpace in height calc
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
            <Text style={styles.continueText}>DEVAM</Text>
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

      <View style={styles.bottomBanner}>
        <GameBannerAd />
      </View>
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
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    bottom: 80, // Moved up from 40
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
    zIndex: 999,
    backgroundColor: "transparent",
  },
  statsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 95, // Below header (zIndex 100) but above board
    pointerEvents: "none", // Let touches pass through to board if needed?
    // Wait, moves is info. zIndex 95.
  },
  movesBlock: {
    alignItems: "center",
  },
  movesValueBig: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  movesLabelSmall: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary, // "bg felan olmasın" -> transparent bg, ensuring text is visible
    marginTop: -2,
    letterSpacing: 1,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2, // Tighter gap
    marginTop: 8, // Less space between moves and stars
  },
  headerCenter: {
    alignItems: "center",
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});
