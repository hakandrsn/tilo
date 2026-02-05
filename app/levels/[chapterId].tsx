import { LegendList } from "@legendapp/list";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LevelCard from "../../src/components/LevelCard";

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
    // If levels are not loaded yet, we can try to guess total or just return 0/0
    // But ideally we rely on levels.length.
    // If levels is empty, this returns 0/0 which is fine for loading state.

    let completed = 0;
    let stars = 0;

    // Fallback if levels is empty but we want to show something?
    // Actually, iterating over the levels is the most correct way.
    // If levels are not loaded, we can't key off IDs reliably unless we assume 1..N
    // But user specifically wants to support N != 24.

    for (const level of levels) {
      const key = `${chapterId}-${level.id}`;
      const p = userProgress.completedLevels[key];
      if (p?.completed) {
        completed++;
        stars += p.stars;
      }
    }

    return { completed, total: levels.length, stars };
  }, [userProgress.completedLevels, chapterId, levels]);

  // Calculate Last Open Level for Highlighting
  const lastOpenLevelId = React.useMemo(() => {
    if (levels.length === 0 || !chapter) return 1;

    let lastId = 1;
    const isChapterUnlocked = userProgress.unlockedChapters.includes(
      Number(chapterId),
    );

    if (isChapterUnlocked) {
      for (const lvl of levels) {
        let isUnlocked = false;
        if (lvl.id === 1) isUnlocked = true;
        else {
          const prevKey = `${chapterId}-${lvl.id - 1}`;
          isUnlocked =
            userProgress.completedLevels[prevKey]?.completed ?? false;
        }

        if (isUnlocked) {
          lastId = lvl.id;
        } else {
          break;
        }
      }
    }
    return lastId;
  }, [levels, userProgress, chapterId, chapter]);

  // Log Last Open Level (User Request) - reusing calculated value
  useEffect(() => {
    console.log(`[LevelsScreen] Last Open Level ID: ${lastOpenLevelId}`);
  }, [lastOpenLevelId]);

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
      const isLastActive = item.id === lastOpenLevelId;

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
          isLastActive={isLastActive}
          progress={levelProgress}
          cardSize={cardSize}
          chapterColor={chapter.color}
          onPress={() => handleLevelPress(item.id)}
        />
      );
    },
    [chapter, userProgress, cardSize, handleLevelPress, lastOpenLevelId],
  );

  // Memoized separator - avoids inline function recreation
  const ItemSeparator = useCallback(
    () => <View style={{ height: gap }} />,
    [gap],
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

      <LegendList
        data={levels}
        renderItem={renderLevel}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={[styles.listContent, { padding }]}
        columnWrapperStyle={{ gap }}
        ItemSeparatorComponent={ItemSeparator}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={cardSize + gap}
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
