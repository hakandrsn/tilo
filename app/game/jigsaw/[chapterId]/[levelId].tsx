import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
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
  interpolate,
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
import BackgroundMusic from "@/src/components/BackgroundMusic";
import GameBannerAd from "@/src/components/GameBannerAd";
import GameHeader from "@/src/components/game/GameHeader";
import GameStats from "@/src/components/game/GameStats";
import LevelCompleteOverlay from "@/src/components/game/LevelCompleteOverlay";

import { useClickSound } from "@/src/hooks/useClickSound";
import JigsawBoard from "@/src/modules/jigsaw/JigsawBoard";
import { showInterstitial } from "@/src/services/adManager";
import { useProgressActions } from "@/src/store/progressStore";
import { Level } from "@/src/types";

const GAME_LAYOUT = {
  HEADER: 60, // Fixed height in pixels to prevent overlap on small screens
  // STATS, STARS removed - using natural size
  // BOARD removed - using flex: 1
  NEXT_AREA_HEIGHT: 85, // reduced by ~30% from 120
  STARS_HEIGHT: 60, // Fixed height for Stars area
  BANNER: 0.15,
};

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

  const { getLevelById, getChapters, getChapterById } = useDataActions();
  const { completeLevel, setLastPlayed, unlockChapter } = useProgressActions();
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

  // Win Animation SharedValues
  const headerTranslateY = useSharedValue(0);
  const movesTranslateY = useSharedValue(0);
  const star1Scale = useSharedValue(0);
  const star2Scale = useSharedValue(0);
  const star3Scale = useSharedValue(0);
  const boardScale = useSharedValue(1);
  const continueButtonScale = useSharedValue(0);

  // Layout Animation SharedValues
  const starsHeightAnim = useSharedValue(0);
  const nextAreaHeightAnim = useSharedValue(0);

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

          // Check if next level exists in current chapter (Simple check via getLevelById)
          // Note: getLevelById is async and checks the store
          const nextLvlExists = await getLevelById(nextChapter, nextLevel);

          if (!nextLvlExists) {
            nextChapter++;
            nextLevel = 1;
          }

          // Check if next chapter exists using store action
          // We can't use getChapterById synchronous inside async efficiently if it's not loaded,
          // but we called getChapters() at init.
          // Better: just try to get the level. If level exists, chapter likely exists.
          // OR check explicit chapter existence if nextLevel was reset to 1.

          if (nextLevel === 1) {
            // We moved to a new chapter, check if it exists
            // We can fetch the chapter list or just try getLevelById again.
            // But getLevelById might not check if chapter is valid in strict definitions?
            // Let's rely on getLevelById returning null if chapter/level doesn't exist.
          }

          // If we want to be strict about "Last Chapter":
          // const chapters = useDataStore.getState().chapters;
          // if (nextChapter > chapters.length) return;
          // But hooking into store state here is messy.
          // Let's just try to fetch the level.

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
        // Scale handled in separate useEffect
        // boardScale.value = withTiming(0.85, { duration: 500 });

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

    // Check if next level exists in THIS chapter
    const nextLevelInCurrentChapter = await getLevelById(
      currentChapter,
      nextLevelId,
    );

    // Check if we exhausted current chapter
    if (!nextLevelInCurrentChapter) {
      // If no next level in this chapter, move to next chapter
      nextChapter++;
      nextLevelId = 1;

      // OPTIONAL: Check if next chapter exists before proceeding?
      // For now, we will let logic proceed. If next chapter doesn't exist,
      // subsequent getLevelById or logic inside completeLevel might handle it
      // or the user will just be taken back if next load fails.

      // Better: Check if Chapter Exists
      const nextChapterData = getChapterById(nextChapter);
      if (!nextChapterData) {
        // No more chapters!
        router.back();
        return;
      }

      // Unlock the new chapter since we are proceeding to it
      unlockChapter(nextChapter);
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
      transform: [{ scale: boardScale.value }],
    };
  });
  const continueButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: continueButtonScale.value }],
  }));

  // Layout Calculations - STACK LAYOUT

  const HEADER_HEIGHT_CONTENT = GAME_LAYOUT.HEADER;
  const HEADER_HEIGHT_TOTAL = HEADER_HEIGHT_CONTENT + insets.top;
  const BANNER_HEIGHT = height * GAME_LAYOUT.BANNER;

  // Animation values for Layout Transition

  // Update animations when status changes to won
  useEffect(() => {
    if (status === "won") {
      starsHeightAnim.value = withTiming(GAME_LAYOUT.STARS_HEIGHT, {
        duration: 500,
      });
      nextAreaHeightAnim.value = withTiming(GAME_LAYOUT.NEXT_AREA_HEIGHT, {
        duration: 500,
      });
      boardScale.value = withTiming(0.85, {
        // Shrink to fit
        duration: 500,
      });
    } else {
      // Reset
      starsHeightAnim.value = withTiming(0, { duration: 300 });
      nextAreaHeightAnim.value = withTiming(0, { duration: 300 });
      boardScale.value = withTiming(1, { duration: 300 });
    }
  }, [status]);

  const starsAnimatedStyle = useAnimatedStyle(() => ({
    height: starsHeightAnim.value,
    width: interpolate(
      starsHeightAnim.value,
      [0, GAME_LAYOUT.STARS_HEIGHT],
      [0, 160], // Approximate width of 3 stars
    ),
    opacity: interpolate(
      starsHeightAnim.value,
      [0, GAME_LAYOUT.STARS_HEIGHT],
      [0, 1],
    ),
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  }));

  const nextAreaAnimatedStyle = useAnimatedStyle(() => ({
    height: nextAreaHeightAnim.value,
    opacity: interpolate(
      nextAreaHeightAnim.value,
      [0, GAME_LAYOUT.NEXT_AREA_HEIGHT],
      [0, 1],
    ),
    overflow: "hidden",
  }));

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

      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* 1. HEADER (5% + Safe Area Top) */}
        {/* We use a container with explicit height to reserve space in the stack */}
        <View style={{ height: HEADER_HEIGHT_TOTAL, zIndex: 100 }}>
          <GameHeader
            title={level?.name || `Level ${currentLevelId}`}
            imageSource={level?.imageSource}
            onBack={handleBack}
            // onReplay removed
            onPreview={() => setShowPreview(true)}
            topInset={insets.top}
            // GameHeader logic: height prop is the content height. It adds topInset itself.
            // We want it to be visually fitting.
            height={HEADER_HEIGHT_CONTENT}
            animatedStyle={headerAnimatedStyle}
          />
        </View>

        {/* 2. & 3. INFO ROW (Stats + Stars) */}
        <View
          style={{
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            zIndex: 90,
            width: "100%",
            marginTop: 8,
            marginBottom: 8,
          }}
        >
          <GameStats
            moves={moves}
            // height removed, use natural
            movesAnimatedStyle={movesAnimatedStyle}
          />

          {/* Stars Area */}
          <Animated.View style={starsAnimatedStyle}>
            <View style={{ flexDirection: "row", gap: 4 }}>
              {[1, 2, 3].map((star) => (
                <Animated.View
                  key={star}
                  style={
                    star === 1
                      ? star1Style
                      : star === 2
                        ? star2Style
                        : star3Style
                  }
                >
                  <Ionicons
                    name="star"
                    size={40}
                    color={
                      earnedStars >= star ? COLORS.starFilled : COLORS.starEmpty
                    }
                  />
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* 4. BOARD AREA (Flex: 1 - Takes remaining space) */}
        <View
          style={{
            flex: 1,
            width: width,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20, // Move spacing here
          }}
        >
          {/* CONFETTI - BEHIND BOARD */}
          {status === "won" && (
            <View style={styles.confettiContainer} pointerEvents="none">
              <LottieView
                source={require("@/src/assets/animations/confettie.json")}
                style={{ flex: 1 }}
                autoPlay
                loop={true}
              />
            </View>
          )}

          {/* BOARD CONTENT */}
          <Animated.View
            style={[
              {
                flex: 1,
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
              },
              boardAnimatedStyle,
            ]}
          >
            {level ? (
              <JigsawBoard
                key={`${currentChapter}-${currentLevelId}`}
                gridSize={level.gridSize}
                imageSource={level.imageSource}
                boardWidth={width}
                // Use approximate max height to calculate piece sizes
                // The flex container will clip/shrink the view, but piece calculations
                // stay based on this "ideal" height.
                boardHeight={height - HEADER_HEIGHT_TOTAL - BANNER_HEIGHT - 60}
              />
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
              </View>
            )}
          </Animated.View>
        </View>

        {/* 5. NEXT / LEVEL COMPLETE AREA (Variable Height) */}
        <Animated.View style={nextAreaAnimatedStyle}>
          <LevelCompleteOverlay
            visible={true}
            animatedStyle={continueButtonStyle}
            onNext={handleNextLevel}
            onReplay={handleReplay}
          />
        </Animated.View>

        {/* 6. BANNER (Fixed Layout, Margin Auto) */}
        <View
          style={{
            height: BANNER_HEIGHT + insets.bottom, // Add safe area to total height
            paddingBottom: insets.bottom, // Push content up
            justifyContent: "flex-end",
            alignItems: "center",
            backgroundColor: "transparent",
            zIndex: 50,
            marginTop: "auto",
          }}
        >
          <GameBannerAd />
        </View>
      </View>

      {/* GLOBAL MODALS */}
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
  // header: removed
  // headerCenter: removed
  // headerTitle: removed
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
  // bottomBanner: removed
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
});
