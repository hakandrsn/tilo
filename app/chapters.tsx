import {
  BOARD_PADDING,
  COLORS,
  getGridColumns,
} from "@/src/constants/gameConfig";
import { useAdActions } from "@/src/store/adStore";
import {
  useChapters,
  useDataActions,
  useIsDataLoading,
} from "@/src/store/dataStore";
import { useProgressActions, useTotalStars } from "@/src/store/progressStore";
import { Chapter } from "@/src/types";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  InteractionManager,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import ChapterNativeAd from "../src/components/ChapterNativeAd";

interface ChapterCardProps {
  chapter: Chapter;
  index: number;
  isUnlocked: boolean;
  progress: { completed: number; total: number; stars: number };
  cardWidth: number;
  onPress: () => void;
}

const ChapterCard = React.memo<ChapterCardProps>(
  ({ chapter, index, isUnlocked, progress, cardWidth, onPress }) => {
    const progressPercent = (progress.completed / progress.total) * 100;

    return (
      <View style={{ width: cardWidth }}>
        <TouchableOpacity
          style={[styles.card, !isUnlocked && styles.cardLocked]}
          onPress={onPress}
          disabled={!isUnlocked}
          activeOpacity={0.7}
        >
          {/* Thumbnail Section */}
          <View style={styles.thumbnailArea}>
            <Image
              source={chapter.thumbnail}
              style={styles.thumbnail}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
            <View style={styles.overlay} />
            <View style={styles.idBadge}>
              <Text style={styles.idBadgeTxt}>{chapter.id}</Text>
            </View>
            {!isUnlocked && (
              <View style={styles.lockedArea}>
                <Text style={styles.lockIc}>🔒</Text>
              </View>
            )}
          </View>

          {/* Content Section */}
          <View style={styles.infoArea}>
            <Text style={styles.name} numberOfLines={1}>
              {chapter.name}
            </Text>
            <View style={styles.progressRow}>
              <View style={styles.barBg}>
                <View
                  style={[styles.barFill, { width: `${progressPercent}%` }]}
                />
              </View>
              <Text style={styles.progressStats}>
                {progress.completed}/{progress.total}
              </Text>
            </View>
            <View style={styles.starInfo}>
              <Text style={styles.starIc}>★</Text>
              <Text style={styles.starVal}>{progress.stars}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  },
  (prev, next) => {
    return (
      prev.isUnlocked === next.isUnlocked &&
      prev.progress.completed === next.progress.completed &&
      prev.progress.stars === next.progress.stars &&
      prev.cardWidth === next.cardWidth &&
      prev.index === next.index
    );
  },
);

export default function ChaptersScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const totalStars = useTotalStars();
  const progressActions = useProgressActions();
  const chapters = useChapters();
  const { getChapters } = useDataActions();
  const isLoading = useIsDataLoading();
  const adActions = useAdActions();
  // Performance: Defer heavy render until navigation animation completes
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setCanRender(true);
    });
    return () => task.cancel();
  }, []);

  React.useEffect(() => {
    getChapters();
  }, []);

  const numColumns = getGridColumns(width);
  const padding = BOARD_PADDING;
  const gap = 15;
  const cardWidth = (width - padding * 2 - gap * (numColumns - 1)) / numColumns;

  // Create rows of chapters with ads inserted at appropriate positions
  const listData = React.useMemo(() => {
    const rows: Array<{ type: "row" | "ad"; items?: Chapter[]; id: string }> =
      [];
    let currentRow: Chapter[] = [];

    chapters.forEach((chapter, index) => {
      currentRow.push(chapter);

      // When row is full or it's the last chapter
      if (currentRow.length === numColumns || index === chapters.length - 1) {
        rows.push({
          type: "row",
          items: [...currentRow],
          id: `row-${rows.length}`,
        });
        currentRow = [];
      }

      // Add ad after every 4th chapter
      if (adActions.shouldShowNativeAdAtIndex(index)) {
        rows.push({
          type: "ad",
          id: `ad-${index}`,
        });
      }
    });

    return rows;
  }, [chapters, numColumns, adActions]);

  // Memoized renderItem - prevents re-creating function on each render
  const renderItem = useCallback(
    ({ item }: { item: (typeof listData)[0] }) => {
      if (item.type === "ad") {
        return <ChapterNativeAd index={parseInt(item.id.split("-")[1])} />;
      }

      // Render row of chapters
      return (
        <View style={[styles.chapterRow, { gap }]}>
          {item.items?.map((chapter) => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              index={chapters.indexOf(chapter)}
             isUnlocked={progressActions.isChapterUnlocked(chapter.id)}
              progress={progressActions.getChapterProgress(chapter.id)}
              cardWidth={cardWidth}
              onPress={() => router.push(`/levels/${chapter.id}`)}
            />
          ))}
        </View>
      );
    },
    [cardWidth, gap, chapters, progressActions, router],
  );

  // Memoized separator - avoids inline function recreation
  const ItemSeparator = useCallback(
    () => <View style={{ height: gap }} />,
    [gap],
  );

  // getItemLayout - eliminates layout measurement overhead for fixed-size rows
  const ROW_HEIGHT = cardWidth * 1.5 + 100; // card aspect ratio + info area padding
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    [ROW_HEIGHT],
  );

  // Show loading until navigation animation completes AND data is ready
  if (!canRender || (isLoading && chapters.length === 0)) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Bölümler",
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.textPrimary,
          headerShadowVisible: false,
          headerRight: () => (
            <View style={styles.headerStars}>
              <Text style={styles.headerStarIcon}>★</Text>
              <Text style={styles.headerStarText}>{totalStars}</Text>
            </View>
          ),
        }}
      />

      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { padding }]}
        ItemSeparatorComponent={ItemSeparator}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        // Performance optimizations
        removeClippedSubviews={true}
        initialNumToRender={8}
        maxToRenderPerBatch={4}
        windowSize={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { justifyContent: "center", alignItems: "center" },
  chapterRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  headerStars: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  headerStarIcon: { fontSize: 16, color: COLORS.starFilled },
  headerStarText: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  listContent: { paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLocked: { opacity: 0.6 },
  thumbnailArea: { aspectRatio: 1.5, position: "relative" },
  thumbnail: { width: "100%", height: "100%" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  idBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  idBadgeTxt: { color: COLORS.textPrimary, fontWeight: "900", fontSize: 13 },
  lockedArea: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  lockIc: { fontSize: 32 },
  infoArea: { padding: 15, gap: 10 },
  name: { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  barBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: COLORS.accent },
  progressStats: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "700",
  },
  starInfo: { flexDirection: "row", alignItems: "center", gap: 5 },
  starIc: { fontSize: 14, color: COLORS.starFilled },
  starVal: { fontSize: 14, color: COLORS.textPrimary, fontWeight: "700" },
});
