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

  const [isReady, setIsReady] = useState(false);
  const [nextLevelImage, setNextLevelImage] = useState<any>(null);

  useEffect(() => {
    const initGame = async () => {
      // 1. Load User Progress & Ads
      await Promise.all([loadProgress(), loadAdState()]);

      // 2. Fetch Chapters (Game Data)
      const fetchedChapters = await getChapters();

      // 3. Asset Prefetching
      // Prefetch Chapter Thumbnails
      fetchedChapters.forEach((chapter) => {
        if (chapter.thumbnail) {
          // Check if thumbnail is a remote URI (string) or local require (number)
          // Image.prefetch only works for remote URIs.
          // Expo Image handles caching for local assets automatically.
          if (typeof chapter.thumbnail === "string") {
            Image.prefetch(chapter.thumbnail);
          }
        }
      });

      // 4. Prepare Next Level (for "Devam Et")
      // Determine where the user left off
      // If lastPlayed exists, check if that level is completed?
      // Actually usually "Continue" implies playing the *next* level if completed,
      // or the *current* level if incomplete.
      // Current logic in store `getLastPlayed` just returns {chapterId, levelId}.
      // We'll rely on what's stored or default to 1-1.

      let targetChapterId = 1;
      let targetLevelId = 1;

      // We can grab the latest state directly from store to be safe, but hooks update.
      // Using the hook values inside useEffect might be stale if deps aren't set,
      // but we are running this ONCE on mount.
      // Better to use the actions/store getters or await the loadProgress promise resolving.

      // Let's assume defaults for prefetch, and real logic in handleContinue.
      // We'll try to guess the most likely next level to prefetch its image.

      // NOTE: We refrain from heavy logic here to keep startup fast.
      // But we fetching level data to get the image is good.

      setIsReady(true);
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
    if (lastPlayed) {
      // Navigate to last played
      // Ideally we check if it's completed?
      // For now, trust the state.
      router.push(`/game/jigsaw/${lastPlayed.chapterId}/${lastPlayed.levelId}`);
    } else {
      // Start fresh
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
