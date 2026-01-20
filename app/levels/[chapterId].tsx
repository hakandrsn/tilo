import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  BOARD_PADDING,
  COLORS,
  getResponsiveValue,
} from "../../src/constants/gameConfig";
import {
  useDataActions,
  useIsDataLoading,
  useLevelsByChapter,
} from "../../src/store/dataStore";
import {
  useProgressActions,
  useProgressStore,
} from "../../src/store/progressStore";
import { Level, LevelProgress } from "../../src/types";

interface LevelCardProps {
  level: Level;
  index: number;
  isUnlocked: boolean;
  progress: LevelProgress | null;
  cardSize: number;
  chapterColor?: string;
  onPress: () => void;
}

import { Image } from "expo-image"; // Ensure this is imported at top of file

import { Ionicons } from "@expo/vector-icons"; // Add this import at the top if missing, I will check effectively by deducing or adding it.
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ... existing imports

const LevelCard = React.memo<LevelCardProps>(
  ({ level, index, isUnlocked, progress, cardSize, chapterColor, onPress }) => {
    return (
      <View style={{ width: cardSize, height: cardSize, alignItems: "center" }}>
        <TouchableOpacity
          style={[
            styles.levelCard,
            { width: cardSize, height: cardSize },
            progress?.completed && {
              borderColor: chapterColor || COLORS.accent,
              borderWidth: 2,
            },
          ]}
          onPress={onPress}
          disabled={!isUnlocked}
          activeOpacity={0.7}
        >
          {/* Background Image */}
          <Image
            source={level.imageSource}
            style={[StyleSheet.absoluteFill, styles.cardBgImage]}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />

          {/* Dark Overlay for Readability (Only when locked) */}
          {!isUnlocked && (
            <View style={[StyleSheet.absoluteFill, styles.cardOverlayLocked]} />
          )}

          {isUnlocked ? (
            /* Redesigned Bottom Bar: Number + Stars */
            <View style={styles.cardBottomBar}>
              <Text style={styles.levelNumber}>{level.id}</Text>

              {/* Stars next to number */}
              <View style={styles.starsRowInline}>
                {[1, 2, 3].map((star) => {
                  const isFilled =
                    progress?.completed && star <= (progress?.stars || 0);
                  return (
                    <Ionicons
                      key={star}
                      name="star"
                      size={12}
                      color={isFilled ? "#fbbf24" : "rgba(255,255,255,0.4)"}
                      style={isFilled && styles.starShadow}
                    />
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.centeredContent}>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  },
  (prev, next) => {
    return (
      prev.isUnlocked === next.isUnlocked &&
      prev.progress?.completed === next.progress?.completed &&
      prev.progress?.stars === next.progress?.stars &&
      prev.cardSize === next.cardSize &&
      prev.chapterColor === next.chapterColor
    );
  },
);

export default function LevelsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const progressActions = useProgressActions();
  // Subscribe to progress changes using selector for performance
  const userProgress = useProgressStore((state) => state.progress);

  const { top } = useSafeAreaInsets();

  const { getLevels, getChapterById } = useDataActions();
  const isLoading = useIsDataLoading();

  // Loading state for level navigation
  const [isNavigating, setIsNavigating] = useState(false);

  // Use store selector instead of local state - prevents re-fetch on remount
  const levels = useLevelsByChapter(Number(chapterId));
  const chapter = getChapterById(Number(chapterId));

  // Fetch levels only if not in cache
  useEffect(() => {
    if (levels.length === 0) {
      getLevels(Number(chapterId));
    }
  }, [chapterId, getLevels, levels.length]);

  // Layout calculations - needed by hooks, must be before any conditional returns
  const numColumns = getResponsiveValue(width, { phone: 4, tablet: 6 });
  const padding = BOARD_PADDING;
  const gap = 10;
  const cardSize = (width - padding * 2 - gap * (numColumns - 1)) / numColumns;

  /* Calculate Chapter Progress Reactive */
  const chapterProgress = React.useMemo(() => {
    let completed = 0;
    let stars = 0;
    for (let i = 1; i <= 24; i++) {
      const key = `${chapterId}-${i}`;
      const p = userProgress.completedLevels[key];
      if (p?.completed) {
        completed++;
        stars += p.stars;
      }
    }
    return { completed, total: 24, stars };
  }, [userProgress.completedLevels, chapterId]);

  // Handle level navigation with loading state
  const handleLevelPress = useCallback(
    (levelId: number) => {
      setIsNavigating(true);
      // Small delay to show loading, then navigate
      setTimeout(() => {
        router.push(`/game/jigsaw/${chapterId}/${levelId}`);
        // Reset after navigation starts
        setTimeout(() => setIsNavigating(false), 500);
      }, 100);
    },
    [router, chapterId],
  );

  // Memoized renderLevel - ALL HOOKS MUST BE BEFORE EARLY RETURNS
  const renderLevel = useCallback(
    ({ item, index }: { item: Level; index: number }) => {
      if (!chapter) return null;

      const levelKey = `${chapter.id}-${item.id}`;
      const levelProgress = userProgress.completedLevels[levelKey] || null;

      let isUnlocked = false;
      if (userProgress.unlockedChapters.includes(chapter.id)) {
        if (item.id === 1) isUnlocked = true;
        else {
          const prevKey = `${chapter.id}-${item.id - 1}`;
          isUnlocked =
            userProgress.completedLevels[prevKey]?.completed ?? false;
        }
      }

      return (
        <LevelCard
          level={item}
          index={index}
          isUnlocked={isUnlocked}
          progress={levelProgress}
          cardSize={cardSize}
          chapterColor={chapter.color}
          onPress={() => handleLevelPress(item.id)}
        />
      );
    },
    [chapter, userProgress, cardSize, handleLevelPress],
  );

  // Memoized separator - avoids inline function recreation
  const ItemSeparator = useCallback(
    () => <View style={{ height: gap }} />,
    [gap],
  );

  // getItemLayout - eliminates layout measurement overhead for fixed-size grid items
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: cardSize + gap,
      offset: (cardSize + gap) * Math.floor(index / numColumns),
      index,
    }),
    [cardSize, gap, numColumns],
  );

  // Show loading only if data is not ready
  if (isLoading && levels.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!chapter) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Kategori bulunamadı</Text>
      </View>
    );
  }

  // Note: numColumns, padding, gap, cardSize already calculated above (before hooks)

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <Stack.Screen
        options={{
          headerShown: false,
          title: chapter.name,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.textPrimary,
          headerShadowVisible: false,
        }}
      />

      {/* Header Info (Aesthetics Update) */}
      <View style={styles.headerInfoArea}>
        <View style={styles.headerTop}>
          <View>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="chevron-back-sharp"
                size={24}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>{chapter.name}</Text>
            <View style={styles.progressPill}>
              <Text style={styles.progressPillText}>
                {chapterProgress.completed} / {chapterProgress.total} SEVİYE
              </Text>
            </View>
          </View>
          <View style={styles.starPill}>
            <Text style={styles.starPillIcon}>★</Text>
            <Text style={styles.starPillText}>{chapterProgress.stars}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={levels}
        renderItem={renderLevel}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={[styles.listContent, { padding }]}
        columnWrapperStyle={{ gap }}
        ItemSeparatorComponent={ItemSeparator}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        // Performance optimizations
        removeClippedSubviews={true}
        initialNumToRender={numColumns * 3}
        maxToRenderPerBatch={numColumns}
        windowSize={3}
        updateCellsBatchingPeriod={50} // Batch UI updates for smoother rendering
      />

      {/* Loading Overlay */}
      {isNavigating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Yükleniyor...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    textAlign: "center",
    marginTop: 24,
  },
  headerInfoArea: {
    padding: BOARD_PADDING,
    paddingBottom: 20,
    backgroundColor: COLORS.background,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: COLORS.textPrimary },
  progressPill: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  progressPillText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: "700",
  },
  starPill: {
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  starPillIcon: { color: COLORS.starFilled, fontSize: 18 },
  starPillText: { color: COLORS.textPrimary, fontWeight: "800", fontSize: 16 },
  listContent: {
    paddingBottom: 40,
  },
  levelCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden", // Important for image masking
  },
  cardBgImage: {
    opacity: 1, // Full vibrancy!
  },
  cardOverlayLocked: {
    backgroundColor: "rgba(0,0,0,0.6)", // Lighter lock overlay
  },
  cardBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: "rgba(0,0,0,0.6)", // Semi-transparent dark overlay
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 4,
  },
  levelNumber: {
    fontSize: 14,
    fontWeight: "900",
    color: "#ffffff",
  },
  starsRowInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  lockIcon: {
    fontSize: 24,
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  starShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
  backButton: {
    height: 50,
    width: 50,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
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
});
