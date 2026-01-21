import GameSettings from "@/src/components/GameSettings";
import {
  BOARD_PADDING,
  COLORS,
  getResponsiveValue,
} from "@/src/constants/gameConfig";
import { useClickSound } from "@/src/hooks/useClickSound";
import { useAdActions } from "@/src/store/adStore";
import { useChapters, useDataActions } from "@/src/store/dataStore";
import {
  useProgressActions,
  useProgressStore,
  useTotalCoins,
  useTotalStars,
} from "@/src/store/progressStore";
import { Image } from "expo-image";

import { Stack, useRouter } from "expo-router";
import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  FadeInRight,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StartScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Stores
  const totalStars = useTotalStars();
  const totalCoins = useTotalCoins();
  const chapters = useChapters();

  const hasProgress = useProgressStore(
    (state) => Object.keys(state.progress.completedLevels).length > 0,
  );

  // Actions
  const { getChapters, getLevelById } = useDataActions();
  const { loadProgress } = useProgressActions();
  const { loadAdState } = useAdActions();

  // Sounds
  const { playClick } = useClickSound();

  const { getNextPlayableLevel } = useProgressActions();

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await requestTrackingPermissionsAsync();
      if (status === "granted") {
        console.log("Yay! I have user permission to track data");
      }
    })();
  }, []);

  useEffect(() => {
    const initGame = async () => {
      // 1. Load data in parallel
      await Promise.all([loadProgress(), loadAdState(), getChapters()]);

      // 2. Ready for UI - allow interaction immediately
      setIsReady(true);

      // 3. Optimization: Non-blocking calculation & prefetch
      // We don't need to store this in state if we can calc it on click,
      // but prefetching needs it now.
      const target = getNextPlayableLevel();

      console.log("📍 Smart Navigation Target:", target);

      if (target) {
        // Fetch specific level data to get image URI
        const levelData = await getLevelById(target.chapterId, target.levelId);

        // Fire-and-forget prefetch - don't block the UI
        if (
          levelData?.imageSource &&
          typeof levelData.imageSource === "object" &&
          "uri" in levelData.imageSource &&
          levelData.imageSource.uri
        ) {
          console.log(
            "🚀 Prefetching Target Level Image:",
            levelData.imageSource.uri,
          );
          Image.prefetch(levelData.imageSource.uri).catch((e) =>
            console.warn("Prefetch failed", e),
          );
        }
      }
    };

    initGame();
  }, []);

  // Calculate stats
  const totalChapterCount = chapters.length || 0;

  const buttonWidth = getResponsiveValue(width, {
    phone: "85%",
    tablet: 320 as any,
  });

  const handleContinue = async () => {
    playClick();

    try {
      // Always calculate fresh target, fallback to 1-1 if undefined
      const target = getNextPlayableLevel() || { chapterId: 1, levelId: 1 };

      // Guarantee we have valid values
      const chapterId = target.chapterId || 1;
      const levelId = target.levelId || 1;

      console.log("📍 Navigating to:", chapterId, levelId);

      // Navigate - this will always execute
      router.push(`/game/jigsaw/${chapterId}/${levelId}`);
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback: go to first level on any error
      router.push("/game/jigsaw/1/1");
    }
  };

  const handleChapters = () => {
    router.push("/chapters");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.settingsOverlay}>
        <GameSettings />
      </View>

      <View style={styles.content}>
        {/* TEXT (ilo) */}
        <View style={styles.titleTextContainer}>
          {["T", "i", "l", "o"].map((word, index) => (
            <Animated.Text
              key={word}
              entering={FadeInRight.delay((index + 1) * 300).springify()}
              style={styles.titleText}
            >
              {word}
            </Animated.Text>
          ))}
        </View>
        {/* LOGO & TITLE ANIMATION */}
        <View style={styles.logoGroup}>
          {/* ICON (T) */}
          <Animated.View entering={ZoomIn.delay(100).springify()}>
            <Image
              source={require("../src/assets/images/splash-icon.png")}
              style={styles.logoIcon}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          </Animated.View>
        </View>

        {/* Buttons - Only show when ready? Or show loading? */}
        {!isReady ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ marginTop: 50 }}
          />
        ) : (
          <>
            <Animated.View
              entering={FadeInUp.delay(1000).springify()}
              style={[styles.buttonsContainer, { width: buttonWidth as any }]}
            >
              {/* Continue Button */}
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
                activeOpacity={0.8}
              >
                <View style={styles.continueContent}>
                  <Text style={styles.continueTitle}>
                    {hasProgress ? "Devam Et" : "Başla"}
                  </Text>
                  <Text style={styles.continueSubtitle}>
                    {hasProgress
                      ? "Kaldığınız yerden devam edin"
                      : "Yeni Oyun Başlat"}
                  </Text>
                </View>
                <Text style={styles.continueArrow}>→</Text>
              </TouchableOpacity>

              {/* Chapters Button */}
              <TouchableOpacity
                style={styles.chaptersButton}
                onPress={handleChapters}
                activeOpacity={0.8}
              >
                <Text style={styles.chaptersButtonText}>Bölümler</Text>
                <Text style={styles.chaptersCount}>{totalChapterCount}</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(1100)}
              style={styles.progressContainer}
            >
              <View style={styles.statBadge}>
                <Text style={styles.statIcon}>★</Text>
                <Text style={styles.statValue}>{totalStars}</Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statIcon}>🪙</Text>
                <Text style={styles.statValue}>{totalCoins}</Text>
              </View>
            </Animated.View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: BOARD_PADDING,
    gap: 32,
  },
  logoGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoIcon: {
    width: 120,
    height: 120,
    marginRight: 2, // Slight gap between Icon T and ilo
  },
  titleTextContainer: {
    flexDirection: "row",
  },
  titleText: {
    fontSize: 24, // As requested
    fontWeight: "bold",
    color: COLORS.textPrimary, // Assuming 'tilo' text color matches Icon or Primary Text
    // Adjust font family if needed
  },
  progressContainer: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    marginTop: 10,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  buttonsContainer: {
    gap: 12,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  continueContent: {
    flex: 1,
  },
  continueTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  continueSubtitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    opacity: 0.8,
    marginTop: 2,
  },
  continueArrow: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "300",
  },
  chaptersButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chaptersButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  chaptersCount: {
    color: COLORS.textPrimary,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  settingsOverlay: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1000,
  },
});
