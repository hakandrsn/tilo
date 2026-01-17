import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  BOARD_PADDING,
  COLORS,
  getResponsiveValue,
} from "../../src/constants/gameConfig";
import { useDataActions, useIsDataLoading } from "../../src/store/dataStore";
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

const LevelCard: React.FC<LevelCardProps> = ({
  level,
  index,
  isUnlocked,
  progress,
  cardSize,
  chapterColor,
  onPress,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(index * 20).springify()}>
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
        />

        {/* Dark Overlay for Readability */}
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.cardOverlay,
            !isUnlocked && styles.cardOverlayLocked,
          ]}
        />

        {isUnlocked ? (
          <View style={styles.cardContent}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNumber}>{level.id}</Text>
            </View>

            {progress?.completed && (
              <View style={styles.starsRow}>
                {[1, 2, 3].map((star) => (
                  <Text
                    key={star}
                    style={[
                      styles.star,
                      star <= (progress?.stars || 0) && styles.starFilled,
                    ]}
                  >
                    ★
                  </Text>
                ))}
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.lockIcon}>🔒</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function LevelsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const progressActions = useProgressActions();

  // Subscribe to progress changes for real-time updates
  const progress = useProgressStore((state) => state.progress);

  const { getLevels, getChapterById } = useDataActions();
  const isLoading = useIsDataLoading();
  const [levels, setLevels] = React.useState<Level[]>([]);
  const chapter = getChapterById(Number(chapterId));

  useEffect(() => {
    const loadLevels = async () => {
      const fetchedLevels = await getLevels(Number(chapterId));
      setLevels(fetchedLevels);
    };
    loadLevels();
  }, [chapterId]);

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

  const numColumns = getResponsiveValue(width, { phone: 4, tablet: 6 });
  const padding = BOARD_PADDING;
  const gap = 10;
  const cardSize = (width - padding * 2 - gap * (numColumns - 1)) / numColumns;
  const chapterProgress = progressActions.getChapterProgress(chapter.id);

  const renderLevel = ({ item, index }: { item: Level; index: number }) => {
    const isUnlocked = progressActions.isLevelUnlocked(chapter.id, item.id);
    const progress = progressActions.getLevelProgress(chapter.id, item.id);
    return (
      <LevelCard
        level={item}
        index={index}
        isUnlocked={isUnlocked}
        progress={progress}
        cardSize={cardSize}
        chapterColor={chapter.color}
        onPress={() => router.push(`/game/${chapterId}/${item.id}`)}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: chapter.name,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.textPrimary,
          headerShadowVisible: false,
        }}
      />

      {/* Header Info (Aesthetics Update) */}
      <View style={styles.headerInfoArea}>
        <View style={styles.headerTop}>
          <View
            style={[styles.chapterBadge, { backgroundColor: COLORS.surface }]}
          >
            <Text style={styles.chapterBadgeText}>{chapter.id}</Text>
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
        ItemSeparatorComponent={() => <View style={{ height: gap }} />}
        showsVerticalScrollIndicator={false}
      />
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
  chapterBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  chapterBadgeText: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.textPrimary,
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
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  starPillIcon: { color: COLORS.starFilled, fontSize: 18 },
  starPillText: { color: COLORS.textPrimary, fontWeight: "800", fontSize: 16 },
  listContent: {
    paddingBottom: 40,
  },
  levelCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden", // Important for image masking
  },
  cardBgImage: {
    opacity: 0.8,
  },
  cardOverlay: {
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  cardOverlayLocked: {
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  cardContent: {
    alignItems: "center",
  },
  levelCardLocked: {
    opacity: 0.3,
    backgroundColor: "#00000033",
  },
  levelBadge: {
    backgroundColor: "rgba(0,0,0,0.3)",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  levelNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },
  lockIcon: {
    fontSize: 24,
  },
  starsRow: {
    flexDirection: "row",
    marginTop: 4,
    gap: 2,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  star: { fontSize: 14, color: COLORS.starEmpty },
  starFilled: { color: COLORS.starFilled },
});
