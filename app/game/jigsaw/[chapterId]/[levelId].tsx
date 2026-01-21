import {Ionicons} from "@expo/vector-icons";
import {DotLottie} from "@lottiefiles/dotlottie-react-native";
import {Image} from "expo-image";
import {Stack, useLocalSearchParams, useRouter} from "expo-router";
import React, {useEffect, useState} from "react";
import {ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View,} from "react-native";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import Animated, {useAnimatedStyle, useSharedValue, withTiming,} from "react-native-reanimated";
import {useSafeAreaInsets} from "react-native-safe-area-context";

// Stores & Hooks
import {calculateStars, COLORS, LEVELS_PER_CHAPTER, TOTAL_CHAPTERS,} from "@/src/constants/gameConfig";
import {useJigsawStore} from "@/src/modules/jigsaw/jigsawStore";
import {useAdStore} from "@/src/store/adStore";
import {useDataActions} from "@/src/store/dataStore";

// Components
import BackgroundMusic from "@/src/components/BackgroundMusic";
import GameBannerAd from "@/src/components/GameBannerAd";
import GameSettings from "@/src/components/GameSettings";

import {useClickSound} from "@/src/hooks/useClickSound";
import JigsawBoard from "@/src/modules/jigsaw/JigsawBoard";
import {showInterstitial} from "@/src/services/adManager";
import {useProgressActions} from "@/src/store/progressStore";
import {Level} from "@/src/types";

export default function JigsawGameScreen() {
  const router = useRouter();

  // Sounds
  const { playClick } = useClickSound();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    chapterId: string;
    levelId: string;
  }>();

  // Local state for infinite scrolling
  const [currentChapter, setCurrentChapter] = useState(
    Number(params.chapterId),
  );
  const [currentLevelId, setCurrentLevelId] = useState(Number(params.levelId));

  const { getLevelById, getChapters } = useDataActions();
  const { completeLevel, setLastPlayed } = useProgressActions();
  const resetGame = useJigsawStore((state) => state.actions.resetGame);
  const status = useJigsawStore((state) => state.status);
  const moves = useJigsawStore((state) => state.moves);
  const initializeLevel = useJigsawStore(
    (state) => state.actions.initializeLevel,
  );
  const canShowBanner = useAdStore((state) => state.actions.canShowBanner);

  const [level, setLevel] = useState<Level | undefined>();
  const [prevLevel, setPrevLevel] = useState<Level | undefined>(); // For visual transition
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showContinue, setShowContinue] = useState(false);

  // Vertical Scroll Transition
  const scrollTranslateY = useSharedValue(0);

  // Win Animation SharedValues
  const headerTranslateY = useSharedValue(0);
  const movesTranslateY = useSharedValue(0);
  const star1Scale = useSharedValue(0);
  const star2Scale = useSharedValue(0);
  const star3Scale = useSharedValue(0);
  const boardScale = useSharedValue(1);
  const boardTranslateY = useSharedValue(0);
  const continueButtonScale = useSharedValue(0);

  const [earnedStars, setEarnedStars] = useState(0);

  // Initialize Data (Initial Load)
  useEffect(() => {
    const initData = async () => {
      await getChapters();
      loadLevel(currentChapter, currentLevelId);
    };
    initData();
  }, []);

  const loadLevel = async (chapId: number, lvlId: number) => {
    setIsLoading(true);

    // Board animasyon değerlerini sıfırla - önceki level'dan kalma değerleri temizle
    boardScale.value = 1;
    boardTranslateY.value = 0;

    const l = await getLevelById(chapId, lvlId);
    if (l) {
      // Initialize game logic BEFORE hiding loader
      initializeLevel(l.gridSize);
      // Save as last played immediately when entering logic
      setLastPlayed(chapId, lvlId);
    }
    setLevel(l);
    setIsLoading(false);
  };

  useEffect(() => {
    if (status === "won" && level) {
      // NOTE: Progress is NOT saved here anymore!
      // It will be saved in handleNextLevel AFTER the ad is watched

      // 1. Trigger background prefetch for next level image
      const prefetchNextLevel = async () => {
        try {
          const cLvl = currentLevelId;
          let nextChapter = currentChapter;
          let nextLevel = cLvl + 1;

          if (nextLevel > LEVELS_PER_CHAPTER) {
            nextChapter++;
            nextLevel = 1;
          }
          if (nextChapter > TOTAL_CHAPTERS) return;

          const nextLvl = await getLevelById(nextChapter, nextLevel);

          if (nextLvl?.imageSource) {
            const source = nextLvl.imageSource;
            if (typeof source === "object" && "uri" in source && source.uri) {
              await Image.prefetch(source.uri);
            }
          }
        } catch (e) {}
      };
      prefetchNextLevel();

      // Delay before starting win sequence
      const timer = setTimeout(() => {
        // Calculate stars
        const stars = calculateStars(moves, level.gridSize);
        setEarnedStars(stars);

        // Animations - board moves DOWN on win
        headerTranslateY.value = withTiming(-100, { duration: 400 });
        movesTranslateY.value = withTiming(-30, { duration: 500 });
        boardScale.value = withTiming(0.85, { duration: 500 });
        boardTranslateY.value = withTiming(-20, { duration: 500 }); // Move DOWN

        setTimeout(() => {
          star1Scale.value = withTiming(1, { duration: 300 });
        }, 400);
        setTimeout(() => {
          star2Scale.value = withTiming(1, { duration: 300 });
        }, 600);
        setTimeout(() => {
          star3Scale.value = withTiming(1, { duration: 300 });
        }, 800);

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

  // Helper: Win UI resetleme kodunu ayır (Clean Code)
  const resetWinUI = () => {
    setShowContinue(false);
    setEarnedStars(0);
    headerTranslateY.value = 0;
    movesTranslateY.value = 0;
    boardScale.value = 1;
    boardTranslateY.value = 0;
    continueButtonScale.value = 0;
    star1Scale.value = 0;
    star2Scale.value = 0;
    star3Scale.value = 0;
  };

  const handleNextLevel = async () => {
    playClick();
    if (!level) return;

    // 1. Sonraki Level ID'lerini hesapla
    let nextChapter = currentChapter;
    let nextLevelId = currentLevelId + 1;

    if (nextLevelId > LEVELS_PER_CHAPTER) {
      nextChapter++;
      nextLevelId = 1;
    }

    // Chapter bittiyse çık (Mevcut mantığın)
    if (nextChapter > TOTAL_CHAPTERS) {
      router.back();
      return;
    }

    // -----------------------------------------------------------
    // SENIOR DOKUNUŞU 1: "Fire and Forget"
    // Mevcut level'ı kaydet ama bunu await etme, UI bloklanmasın.
    // -----------------------------------------------------------
    completeLevel(currentChapter, currentLevelId, moves, level.gridSize);

    // -----------------------------------------------------------
    // SENIOR DOKUNUŞU 2: "Parallel Prefetching"
    // Reklam başlamadan hemen önce veriyi ve resmi çağırmaya başla.
    // -----------------------------------------------------------
    const nextLevelPromise = getLevelById(nextChapter, nextLevelId);

    // Reklamı başlat (Bu sırada nextLevelPromise arkada resolve oluyor)
    // İki aşamalı reklam mantığı:
    // 1. Chapter 1, Level 1-4: Reklam yok (yeni kullanıcı deneyimi)
    // 2. Chapter 1, Level 5+: İlk reklam gösterilir, 5 dakika timer başlar
    // 3. Sonraki reklamlar: 5 dakika geçtiyse göster
    const isEligibleForAds = currentChapter !== 1 || currentLevelId >= 4;

    if (isEligibleForAds) {
      // 5 dakika kontrolü yap - ilk kez çağrıldığında lastInterstitialShown=0 olduğu için hep true döner
      const canShow = useAdStore
        .getState()
        .actions.canShowInterstitial(currentChapter, currentLevelId);
      if (canShow) {
        await showInterstitial();
      }
    }

    // Reklam bitti. Verimiz %99 ihtimalle hazır.
    const nextLvlData = await nextLevelPromise;

    if (!nextLvlData) {
      setIsLoading(false);
      return;
    }

    // Resim cache'de mi? Değilse hemen prefetch at (Hızlı yükleme için)
    if (
      typeof nextLvlData.imageSource === "object" &&
      "uri" in nextLvlData.imageSource &&
      nextLvlData.imageSource.uri
    ) {
      await Image.prefetch(nextLvlData.imageSource.uri);
    }

    // -----------------------------------------------------------
    // SENIOR DOKUNUŞU 3: "Clean Slate" (Eski Tahtayı Yok Et)
    // Yeni level hesaplanırken eski tahtanın görünmemesi için
    // level state'ini geçici olarak boşaltıyoruz.
    // -----------------------------------------------------------
    setLevel(undefined); // <--- BU SATIR "HAYALET TAHTA"YI ÖNLER
    setIsLoading(true); // Araya minik bir loading girsin, donmasından iyidir.

    // UI Thread nefes alsın diye state update'i bir sonraki tick'e atıyoruz
    setTimeout(() => {
      // UI Temizliği
      resetWinUI();

      // Yeni Oyun Başlatma
      resetGame();
      initializeLevel(nextLvlData.gridSize);

      // State Güncellemeleri
      setCurrentChapter(nextChapter);
      setCurrentLevelId(nextLevelId);
      setLevel(nextLvlData); // <--- Yeni level şimdi render olacak
      setLastPlayed(nextChapter, nextLevelId);

      setIsLoading(false);
    }, 50); // 50ms gecikme insan gözüne batmaz ama JS thread'i kurtarır.
  };

  const handleReplay = () => {
    headerTranslateY.value = 0;
    boardScale.value = 1;
    boardTranslateY.value = 0;
    continueButtonScale.value = 0;
    setShowContinue(false);
    star1Scale.value = 0;
    star2Scale.value = 0;
    star3Scale.value = 0;

    resetGame();
    if (level) {
      initializeLevel(level.gridSize);
    }
  };

  // Animated Styles
  const scrollStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollTranslateY.value }],
  }));

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
  // Board animation sadece won durumunda tetiklenmeli, playing'de sabit kalmalı
  const boardAnimatedStyle = useAnimatedStyle(() => {
    // Scale ve translateY değerlerini uygula
    // Bu değerler sadece win animasyonunda değişiyor
    return {
      transform: [
        { scale: boardScale.value },
        { translateY: boardTranslateY.value },
      ],
    };
  });
  const continueButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: continueButtonScale.value }],
  }));

  // Layout Calculations - FIXED PERCENTAGES
  const HEADER_HEIGHT = 60;
  const MOVES_HEIGHT = 80;
  const BANNER_HEIGHT = canShowBanner() ? 60 : 0;
  const topInset = insets.top;

  // Board positioned below header + stats area
  const contentTopStart = topInset + HEADER_HEIGHT + MOVES_HEIGHT;
  const bottomSpace = canShowBanner() ? BANNER_HEIGHT + 10 : insets.bottom + 10;

  // Board takes 75% of available height for larger gameplay area
  const availableHeight = height - contentTopStart - bottomSpace;
  const boardHeight = Math.floor(availableHeight * 0.95);

  // Render Inner Content (The Game)
  // We extract this to render it twice (once for prev, once for next)
  // BUT 'prev' is static image, 'next' is interactive board.
  // So we handle them explicitly.

  if (isLoading && !level) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Level Hazırlanıyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: COLORS.background }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundMusic />

      {/* Main Vertical Scroll Container */}
      <Animated.View style={[{ flex: 1 }, scrollStyle]}>
        {/* VIEW 1: PREVIOUS LEVEL (Only visible during transition) */}
        {prevLevel && (
          <View
            style={{ width, height, position: "absolute", top: 0, left: 0 }}
          >
            {/* Just the Image as "Won State" */}
            <View style={styles.header}>
              {/* Dummy Header for visuals */}
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>{prevLevel.name}</Text>
              </View>
            </View>
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={prevLevel.imageSource}
                style={{ width: width - 40, height: boardHeight }}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </View>
          </View>
        )}

        {/* VIEW 2: CURRENT / NEXT LEVEL (Bottom if transition, or Top if normal) */}
        <View
          style={{
            width,
            height,
            marginTop: prevLevel ? height : 0, // Push down if prev exists
          }}
        >
          {/* Confetti (Only for current active game) */}
          {status === "won" && (
            <View style={styles.confettiContainer} pointerEvents="none">
              <DotLottie
                source={require("@/src/assets/animations/confettie.lottie")}
                style={{ flex: 1 }}
                autoplay
                loop={true}
              />
            </View>
          )}

          {/* HEADER */}
          <Animated.View
            style={[
              styles.header,
              { top: insets.top, height: HEADER_HEIGHT },
              headerAnimatedStyle,
            ]}
          >
            <View style={styles.headerLeftGroups}>
              <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
                <Ionicons
                  name="chevron-back"
                  size={28}
                  color={COLORS.textPrimary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleReplay} style={styles.headerBtn}>
                <Ionicons name="refresh" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {level?.name || `Level ${currentLevelId}`}
              </Text>
            </View>
            <View style={styles.headerRightGroups}>
              <TouchableOpacity
                onPress={() => setShowPreview(true)}
                style={styles.headerBtn}
              >
                {level && (
                  <Image
                    source={level.imageSource}
                    style={styles.thumbnail}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                )}
              </TouchableOpacity>
              <GameSettings />
            </View>
          </Animated.View>

          {/* STATS */}
          <View
            style={[
              styles.statsContainer,
              { top: topInset + HEADER_HEIGHT, height: MOVES_HEIGHT },
            ]}
          >
            <Animated.View style={[styles.movesBlock, movesAnimatedStyle]}>
              <Text style={styles.movesValueBig}>{moves}</Text>
              <Text style={styles.movesLabelSmall}>HAMLE</Text>
            </Animated.View>
            {/* Stars only visible when game is won */}
            {status === "won" && (
              <View style={styles.starsRow}>
                <Animated.View style={star1Style}>
                  <Ionicons
                    name="star"
                    size={48}
                    color={
                      earnedStars >= 1 ? COLORS.starFilled : COLORS.starEmpty
                    }
                  />
                </Animated.View>
                <Animated.View style={[star2Style, { marginTop: -20 }]}>
                  <Ionicons
                    name="star"
                    size={64}
                    color={
                      earnedStars >= 2 ? COLORS.starFilled : COLORS.starEmpty
                    }
                  />
                </Animated.View>
                <Animated.View style={star3Style}>
                  <Ionicons
                    name="star"
                    size={48}
                    color={
                      earnedStars >= 3 ? COLORS.starFilled : COLORS.starEmpty
                    }
                  />
                </Animated.View>
              </View>
            )}
          </View>

          {/* BOARD */}
          <Animated.View
            style={[
              styles.gameArea,
              { marginTop: contentTopStart, height: boardHeight },
              boardAnimatedStyle,
            ]}
          >
            {level ? (
              <JigsawBoard
                key={`${currentChapter}-${currentLevelId}`} // Force remount on level change
                gridSize={level.gridSize}
                imageSource={level.imageSource}
                boardWidth={width}
                boardHeight={boardHeight}
              />
            ) : (
              // Eski tahta yerine bu görünecek. Ghosting bitti.
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text
                  style={{
                    color: COLORS.textSecondary,
                    marginTop: 10,
                    fontSize: 16,
                  }}
                >
                  Sahne Hazırlanıyor...
                </Text>
              </View>
            )}
          </Animated.View>

          {/* CONTINUE BUTTON */}
          {showContinue && (
            <Animated.View
              style={[styles.continueContainer, continueButtonStyle]}
            >
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleNextLevel}
              >
                <Text style={styles.continueText}>SONRAKİ</Text>
                <Ionicons name="arrow-down" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.replayButton}
                onPress={handleReplay}
              >
                <Ionicons
                  name="refresh"
                  size={18}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.replayText}>Replay</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </Animated.View>

      {/* GLOBAL MODALS (Outside Scroll) */}
      <Modal
        visible={showPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPreview(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPreview(false)}
        >
          <View style={styles.previewContainer}>
            {level && (
              <Image
                source={level.imageSource}
                style={{ width: width * 0.9, height: height * 0.6 }}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            )}
            <Text style={styles.previewText}>Tap to Close</Text>
          </View>
        </TouchableOpacity>
      </Modal>

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
  loadingBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 12,
    minWidth: 150,
  },
  loadingText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
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
    zIndex: 95,
    pointerEvents: "none",
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
    color: COLORS.textSecondary,
    marginTop: -2,
    letterSpacing: 1,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    marginTop: 8,
  },
  headerCenter: {
    alignItems: "center",
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});
