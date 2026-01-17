import ConfirmModal from "@/src/components/ConfirmModal";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { SafeAreaView as SafeAreaContextView } from "react-native-safe-area-context";

// Lazy load PuzzleBoard for better performance
const PuzzleBoard = lazy(() => import("../../../src/components/PuzzleBoard"));

import GameBannerAd from "../../../src/components/GameBannerAd";
import WinModal from "../../../src/components/WinModal";
import {
  BOARD_PADDING,
  calculateStars,
  COLORS,
  getBoardSize,
  HINT_CONFIG,
  LEVELS_PER_CHAPTER,
  TOTAL_CHAPTERS,
} from "../../../src/constants/gameConfig";
import { usePuzzleGame } from "../../../src/hooks/usePuzzleGame";
import {
  showInterstitial,
  showRewarded,
} from "../../../src/services/adManager";
import { useAdActions } from "../../../src/store/adStore";
import { useDataActions, useIsDataLoading } from "../../../src/store/dataStore";
import { useGameActions, useGameStore } from "../../../src/store/gameStore";
import { useHintActions, useHintCount } from "../../../src/store/hintStore";
import { useProgressActions } from "../../../src/store/progressStore";
import { Chapter, GridSize, Level } from "../../../src/types";

export default function GameBoardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { chapterId, levelId } = useLocalSearchParams<{
    chapterId: string;
    levelId: string;
  }>();
  const [showWinModal, setShowWinModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [earnedStars, setEarnedStars] = useState(0);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [showSolvedInfoModal, setShowSolvedInfoModal] = useState(false);
  const [showAdSuccessModal, setShowAdSuccessModal] = useState(false);

  const { getChapterById, getLevelById, getChapters } = useDataActions();
  const isLoading = useIsDataLoading();

  const [chapter, setChapter] = useState<Chapter | undefined>();
  const [level, setLevel] = useState<Level | undefined>();

  const progressActions = useProgressActions();
  const hintCount = useHintCount();
  const hintActions = useHintActions();
  const gameActions = useGameActions();
  const adActions = useAdActions();

  // Show interstitial ad on level entry (not first 4 levels of chapter 1)
  useEffect(() => {
    if (
      level &&
      chapter &&
      adActions.canShowInterstitial(chapter.id, level.id)
    ) {
      showInterstitial();
    }
  }, [level, chapter]);

  useEffect(() => {
    const initData = async () => {
      await getChapters();
      const c = getChapterById(Number(chapterId));
      const l = await getLevelById(Number(chapterId), Number(levelId));
      setChapter(c);
      setLevel(l);
    };
    initData();
  }, [chapterId, levelId]);

  const boardSize = getBoardSize(width);

  useEffect(() => {
    if (level) {
      progressActions.setLastPlayed(level.chapterId, level.id);
    }
  }, [level]);

  // Declare handleWin first (will use gridSize from usePuzzleGame later)
  const [puzzleGridSize, setPuzzleGridSize] = useState<GridSize>({
    cols: 3,
    rows: 3,
  });

  const handleWin = useCallback(
    async (moves: number) => {
      if (level) {
        const stars = calculateStars(moves, puzzleGridSize);
        setEarnedStars(stars);

        // Complete and save BEFORE showing modal to prevent race conditions
        progressActions.completeLevel(
          level.chapterId,
          level.id,
          moves,
          puzzleGridSize,
        );

        if (level.id === LEVELS_PER_CHAPTER) {
          hintActions.addChapterBonus();
        }

        setShowWinModal(true);
      }
    },
    [level, hintActions, puzzleGridSize, progressActions],
  );

  const {
    grid,
    moveCount,
    isSolved,
    gridSize,
    isInitialized,
    handleTilePress,
    resetGame,
    useHint,
    saveState,
    completeAndSave,
  } = usePuzzleGame({
    level: level,
    onWin: handleWin,
  });

  // Update puzzleGridSize when gridSize changes
  useEffect(() => {
    if (gridSize) {
      setPuzzleGridSize(gridSize);
    }
  }, [gridSize]);

  const isUnlocked =
    chapterId && levelId
      ? progressActions.isLevelUnlocked(Number(chapterId), Number(levelId))
      : false;

  const handleResetPress = () => {
    if (moveCount > 0 && !isSolved) {
      setShowResetModal(true);
    } else {
      resetGame();
    }
  };

  // Removed: completion now happens synchronously in handleWin

  const handleGetHints = async () => {
    if (hintCount > 0) {
      const isEverythingCorrect = grid.every(
        (val: number, idx: number) =>
          val === idx || val === gridSize.cols * gridSize.rows - 1,
      );
      if (isEverythingCorrect) {
        setShowSolvedInfoModal(true);
        return;
      }

      // Use hint
      useHint();
      hintActions.useHint();

      // Check if hint solved the puzzle
      setTimeout(() => {
        const updatedState = useGameStore.getState();
        if (updatedState.isSolved && updatedState.isInitialized) {
          if (level) {
            gameActions.clearLevelState(level.chapterId, level.id);
          }
          handleWin(updatedState.moveCount);
        }
      }, 100);
    } else {
      setShowAdModal(true);
    }
  };

  const handleBack = () => {
    saveState?.();
    router.back();
  };

  const isLastLevel = level?.id === LEVELS_PER_CHAPTER;
  const hasNextChapter = chapterId ? Number(chapterId) < TOTAL_CHAPTERS : false;
  const currentStars = calculateStars(moveCount, gridSize);

  // Fallback values for header while loading
  const displayChapterId = chapter?.id || chapterId;
  const displayLevelId = level?.id || levelId;

  // Header Title Logic
  const getHeaderTitle = () => {
    if (level?.name) return level.name;
    if (chapter?.name) return `${chapter.name} - ${displayLevelId}`;
    return `${displayChapterId}-${displayLevelId}`;
  };

  return (
    <SafeAreaContextView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Banner Ad at Top */}
      {adActions.canShowBanner() && <GameBannerAd />}

      {/* Fixed Header Section */}
      <View style={styles.headerSection}>
        {/* Top Row: Back - Level - Preview */}
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={32} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.levelInfo}>
            <Text
              style={styles.levelLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {getHeaderTitle()}
            </Text>
          </View>

          {level ? (
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={() => setShowPreviewModal(true)}
            >
              <Image source={level.imageSource} style={styles.previewThumb} />
              <Text style={styles.zoomTag}>🔍</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.previewBtn, { opacity: 0.5 }]} />
          )}
        </View>

        {/* Stats Row: Stars - Moves - Reset */}
        <View style={styles.statsRow}>
          {/* Left: Stars */}
          <View style={styles.starsArea}>
            {[1, 2, 3].map((s) => (
              <Text
                key={s}
                style={[
                  styles.bigStar,
                  s <= currentStars && styles.bigStarFilled,
                ]}
              >
                ★
              </Text>
            ))}
          </View>

          {/* Center: Moves Count */}
          <View style={styles.movesArea}>
            <Text style={styles.movesVal}>{moveCount}</Text>
          </View>

          {/* Right: Reset Button */}
          <TouchableOpacity
            style={styles.resetBtnHeader}
            onPress={handleResetPress}
            disabled={!level}
          >
            <Ionicons name="refresh" size={28} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Flexible Board Section */}
      <View style={styles.boardSection}>
        <Animated.View
          entering={FadeIn}
          key={levelId} // Trigger animation on level change
          style={styles.boardContainer}
        >
          {level && isInitialized ? (
            <Suspense
              fallback={
                <ActivityIndicator size="large" color={COLORS.accent} />
              }
            >
              <PuzzleBoard
                grid={grid}
                gridSize={gridSize}
                imageSource={level.imageSource}
                onTilePress={handleTilePress}
                boardSize={boardSize}
              />
            </Suspense>
          ) : (
            <ActivityIndicator size="large" color={COLORS.accent} />
          )}
        </Animated.View>
      </View>

      {/* Fixed Controls Section */}
      <View style={styles.controlsSection}>
        {!isSolved && (
          <TouchableOpacity
            style={[styles.controlBtn, styles.btnPrimary]}
            onPress={handleGetHints}
          >
            {hintCount > 0 && (
              <View style={[styles.badge, styles.badgeActive]}>
                <Text style={styles.badgeTxt}>{hintCount}</Text>
              </View>
            )}
            <Text style={styles.controlBtnIcon}>💡</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Zoom Preview Modal */}
      <Modal visible={showPreviewModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPreviewModal(false)}
        >
          <Animated.View entering={FadeInUp} style={styles.modalBox}>
            {level && (
              <Image
                source={level.imageSource}
                style={styles.fullImg}
                contentFit="contain"
              />
            )}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowPreviewModal(false)}
            >
              <Text style={styles.modalCloseTxt}>GİZLE</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* --- MODALS --- */}

      {/* 1. Reset Confirmation */}
      <ConfirmModal
        visible={showResetModal}
        title="Yeniden Başlat"
        message="Bölüm ilerlemeniz sıfırlanacak. Emin misiniz?"
        confirmText="Sıfırla"
        cancelText="Vazgeç"
        isDestructive
        onConfirm={() => {
          setShowResetModal(false);
          resetGame();
        }}
        onCancel={() => setShowResetModal(false)}
      />

      {/* 2. Watch Ad Confirmation */}
      <ConfirmModal
        visible={showAdModal}
        title="Hamle Al"
        message={`Reklam izleyerek ${HINT_CONFIG.rewardedAdHints} hamle hakkı kazan!`}
        confirmText="Reklam İzle"
        cancelText="İptal"
        onConfirm={async () => {
          setShowAdModal(false);
          const rewarded = await showRewarded();
          if (rewarded) {
            hintActions.addHints(HINT_CONFIG.rewardedAdHints);
            setTimeout(() => setShowAdSuccessModal(true), 500);
          }
        }}
        onCancel={() => setShowAdModal(false)}
      />

      {/* 3. Already Solved Info */}
      <ConfirmModal
        visible={showSolvedInfoModal}
        title="Zaten Çözüldü"
        message="Tüm parçalar doğru yerinde!"
        confirmText="Tamam"
        onConfirm={() => setShowSolvedInfoModal(false)}
      />

      {/* 4. Ad Success Info */}
      <ConfirmModal
        visible={showAdSuccessModal}
        title="Tebrikler!"
        message={`${HINT_CONFIG.rewardedAdHints} hamle hakkı kazandın!`}
        confirmText="Harika"
        onConfirm={() => setShowAdSuccessModal(false)}
      />

      <WinModal
        visible={showWinModal}
        moves={moveCount}
        stars={earnedStars}
        isLastLevel={isLastLevel}
        hasNextChapter={hasNextChapter}
        chapterColor={chapter?.color || COLORS.primary}
        onNextLevel={() => {
          setShowWinModal(false);
          if (!isLastLevel) {
            router.replace(`/game/${chapterId}/${Number(levelId) + 1}`);
          } else if (hasNextChapter) {
            router.replace(`/game/${Number(chapterId) + 1}/1`);
          }
        }}
        onReplay={() => {
          setShowWinModal(false);
          resetGame();
        }}
        onBackToLevels={() => {
          setShowWinModal(false);
          router.back();
        }}
      />
    </SafeAreaContextView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Fixed Header Section
  headerSection: {
    paddingHorizontal: BOARD_PADDING,
    paddingTop: 10,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 60,
    paddingHorizontal: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  levelInfo: { flex: 1, alignItems: "center" },
  levelLabel: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  previewBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  previewThumb: { width: "100%", height: "100%" },
  zoomTag: {
    position: "absolute",
    bottom: 0,
    right: 0,
    fontSize: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  starsArea: {
    flexDirection: "row",
    gap: 4,
    width: 60,
  },
  bigStar: { fontSize: 24, color: COLORS.starEmpty },
  bigStarFilled: { color: COLORS.starFilled },

  movesArea: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  movesVal: {
    fontSize: 48,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },

  resetBtnHeader: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-end",
  },

  // Flexible Board Section
  boardSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: BOARD_PADDING,
  },
  boardContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  // Fixed Controls Section
  controlsSection: {
    height: 120,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 20,
  },
  controlBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  btnPrimary: {
    backgroundColor: "transparent",
    borderWidth: 0.5, // Thicker border for visibility
    borderColor: COLORS.accent,
  },
  btnSecondary: {
    backgroundColor: "transparent",
  },
  controlBtnIcon: { fontSize: 32 },
  replayIcon: { fontSize: 48, color: "#fafafa" }, // Much larger
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: COLORS.surfaceLight,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.background,
    zIndex: 1,
  },
  badgeActive: { backgroundColor: COLORS.accent },
  badgeTxt: { color: COLORS.textPrimary, fontSize: 10, fontWeight: "900" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "90%",
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 12,
    alignItems: "center",
  },
  fullImg: { width: "100%", height: "100%", borderRadius: 16 },
  modalClose: { marginTop: 20, padding: 10 },
  modalCloseTxt: {
    color: COLORS.textPrimary,
    fontWeight: "800",
    letterSpacing: 2,
  },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
