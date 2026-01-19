import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
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
import {
  BOARD_PADDING,
  COLORS,
  getResponsiveValue,
} from "../src/constants/gameConfig";
import { useAdActions } from "../src/store/adStore";
import { useChapters, useDataActions } from "../src/store/dataStore";
import {
  useLastPlayed,
  useProgressActions,
  useTotalCoins,
  useTotalStars,
} from "../src/store/progressStore";

export default function StartScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Stores
  const totalStars = useTotalStars();
  const totalCoins = useTotalCoins();
  const lastPlayed = useLastPlayed();
  const chapters = useChapters();

  // Actions
  const { getChapters, getLevelById } = useDataActions();
  const { loadProgress } = useProgressActions();
  const { loadAdState } = useAdActions();

  const { getNextPlayableLevel } = useProgressActions();

  const [isReady, setIsReady] = useState(false);

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
    console.time("👉 Continue Button Press");
    // Always calculate fresh target to ensure accuracy
    const target = getNextPlayableLevel();
    console.log("📍 Navigating to:", target);

    // Navigate
    router.push(`/game/jigsaw/${target.chapterId}/${target.levelId}`);

    // Optimization: Yield to main thread to allow navigation animation to start
    await new Promise((resolve) => setTimeout(resolve, 0));
    console.timeEnd("👉 Continue Button Press");
  };

  const handleChapters = () => {
    router.push("/chapters");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
          title: "",
          headerStyle: { backgroundColor: COLORS.background },
          headerShadowVisible: false,
        }}
      />

      <View style={styles.content}>
        {/* LOGO & TITLE ANIMATION */}
        <View style={styles.logoGroup}>
          {/* ICON (T) */}
          <Animated.View entering={ZoomIn.delay(100).springify()}>
            <Image
              source={require("../src/assets/images/splash-icon.png")}
              style={styles.logoIcon}
              contentFit="contain"
            />
          </Animated.View>

          {/* TEXT (ilo) */}
          <View style={styles.titleTextContainer}>
            <Animated.Text
              entering={FadeInRight.delay(400).springify()}
              style={styles.titleText}
            >
              i
            </Animated.Text>
            <Animated.Text
              entering={FadeInRight.delay(600).springify()}
              style={styles.titleText}
            >
              l
            </Animated.Text>
            <Animated.Text
              entering={FadeInRight.delay(800).springify()}
              style={styles.titleText}
            >
              o
            </Animated.Text>
          </View>
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
                  <Text style={styles.continueTitle}>Devam Et</Text>
                  {lastPlayed ? (
                    <Text style={styles.continueSubtitle}>
                      Kaldığınız yerden devam edin
                    </Text>
                  ) : (
                    <Text style={styles.continueSubtitle}>
                      Yeni Oyun Başlat
                    </Text>
                  )}
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
    marginBottom: 20,
  },
  logoIcon: {
    width: 60,
    height: 60,
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
});
