import { Image } from "expo-image";
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
  LEVELS_PER_CHAPTER,
  getResponsiveValue,
} from "../src/constants/gameConfig";
import {
  useChapters,
  useDataActions,
  useIsDataLoading,
} from "../src/store/dataStore";
import {
  useLastPlayed,
  useTotalCoins,
  useTotalStars,
} from "../src/store/progressStore";

export default function StartScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const totalStars = useTotalStars();
  const totalCoins = useTotalCoins();
  const lastPlayed = useLastPlayed();
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
      router.push(`/game/jigsaw/${lastPlayed.chapterId}/${lastPlayed.levelId}`);
    } else {
      router.push("/game/jigsaw/1");
    }
  };

  const handleChapters = () => {
    router.push("/chapters");
  };

  const lastChapter = lastPlayed ? getChapterById(lastPlayed.chapterId) : null;

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
        {/* Logo */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.logoContainer}
        >
          <Image
            source={require("../src/assets/images/splash-icon.png")}
            style={styles.logo}
          />
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

        <Animated.View
          entering={FadeInUp.delay(400)}
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
    gap: 24, // Add gap to distribute content better
  },
  logoContainer: {
    alignItems: "center",
  },
  logo: {
    width: 140,
    height: 140,
    objectFit: "contain",
  },
  progressContainer: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    marginTop: 20,
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
