import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BOARD_PADDING,
  COLORS,
  HINT_CONFIG,
  LEVELS_PER_CHAPTER,
  getResponsiveValue,
} from "../src/constants/gameConfig";
import { showRewarded } from "../src/services/adManager";
import {
  useChapters,
  useDataActions,
  useIsDataLoading,
} from "../src/store/dataStore";
import { useHintActions, useHintCount } from "../src/store/hintStore";
import { useLastPlayed, useTotalStars } from "../src/store/progressStore";

export default function StartScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const totalStars = useTotalStars();
  const lastPlayed = useLastPlayed();
  const hintCount = useHintCount();
  const hintActions = useHintActions();
  const chapters = useChapters();
  const { getChapters, getChapterById } = useDataActions();
  const isLoading = useIsDataLoading();

  React.useEffect(() => {
    getChapters();
  }, []);

  const totalChapterCount = chapters.length || 20; // Fallback
  const maxStars = totalChapterCount * LEVELS_PER_CHAPTER * 3;

  const buttonWidth = getResponsiveValue(width, {
    phone: "85%",
    tablet: 320 as any,
  });

  const handleContinue = () => {
    if (lastPlayed) {
      router.push(`/game/${lastPlayed.chapterId}/${lastPlayed.levelId}`);
    } else {
      router.push("/game/1/1");
    }
  };

  const handleChapters = () => {
    router.push("/chapters");
  };

  const handleGetHints = async () => {
    const success = await showRewarded();
    if (success) {
      hintActions.addHints(HINT_CONFIG.rewardedAdHints);
    }
  };

  const lastChapter = lastPlayed ? getChapterById(lastPlayed.chapterId) : null;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "",
          headerStyle: { backgroundColor: COLORS.background },
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity
              style={styles.hintButton}
              onPress={handleGetHints}
              activeOpacity={0.7}
            >
              <Text style={styles.hintIcon}>💡</Text>
              <View style={styles.hintBadge}>
                <Text style={styles.hintBadgeText}>{hintCount}</Text>
              </View>
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.logoContainer}
        >
          <View style={styles.logoIcon}>
            <View style={styles.logoGrid}>
              {[...Array(9)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.logoTile,
                    i === 8 ? styles.logoTileEmpty : null,
                  ]}
                />
              ))}
            </View>
          </View>
          <Text style={styles.title}>PUZZLE</Text>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.statsRow}
        >
          <View style={styles.statBadge}>
            <Text style={styles.statIcon}>★</Text>
            <Text style={styles.statValue}>{totalStars}</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={styles.statIcon}>💡</Text>
            <Text style={styles.statValue}>{hintCount}</Text>
          </View>
        </Animated.View>

        {/* Buttons */}
        <Animated.View
          entering={FadeInUp.delay(300).springify()}
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
              {lastPlayed && lastChapter && (
                <Text style={styles.continueSubtitle}>
                  {lastChapter.name} • Seviye {lastPlayed.levelId}
                </Text>
              )}
              {!lastPlayed && (
                <Text style={styles.continueSubtitle}>Yeni Oyun Başlat</Text>
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
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.textSecondary} />
            ) : (
              <Text style={styles.chaptersCount}>{totalChapterCount}</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Progress */}
        <Animated.View
          entering={FadeInUp.delay(400)}
          style={styles.progressContainer}
        >
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(totalStars / maxStars) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {totalStars} / {maxStars} yıldız
          </Text>
        </Animated.View>
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
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoIcon: {
    width: 88,
    height: 88,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  logoGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  logoTile: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  logoTileEmpty: {
    backgroundColor: "transparent",
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 48,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
  },
  statIcon: {
    fontSize: 18,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  buttonsContainer: {
    gap: 12,
    marginBottom: 48,
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
    color: COLORS.textSecondary,
    fontSize: 14,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressContainer: {
    alignItems: "center",
    width: "60%",
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.starFilled,
    borderRadius: 2,
  },
  progressText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  hintButton: {
    marginRight: 12,
    position: "relative",
  },
  hintIcon: {
    fontSize: 28,
  },
  hintBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: COLORS.accent,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  hintBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: "900",
  },
});
