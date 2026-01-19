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
import { useProgressActions } from "../../src/store/progressStore";
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
    <Animated.View
      entering={FadeInDown.delay(index * 20).springify()}
      style={{ width: cardSize, alignItems: "center" }}
    >
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

        {/* Dark Overlay for Readability (Only when locked) */}
        {!isUnlocked && (
          <View style={[StyleSheet.absoluteFill, styles.cardOverlayLocked]} />
        )}

        {isUnlocked ? (
          <View style={styles.cardContent}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNumber}>{level.id}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.centeredContent}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Stars Row - Consistent Height for ALL cards */}
      <View style={styles.starsRowBelow}>
        {isUnlocked ? (
          [1, 2, 3].map((star) => {
            const isFilled =
              progress?.completed && star <= (progress?.stars || 0);
            return (
              <Ionicons
                key={star}
                name="star"
                size={14}
                color={isFilled ? "#fbbf24" : "#e2e8f0"} // Gold or Light Gray
                style={isFilled && styles.starShadow} // Optional shadow for filled
              />
            );
          })
        ) : (
          // Placeholder for locked levels to maintain height
          <View style={{ height: 14 }} />
        )}
      </View>
    </Animated.View>
  );
};

export default function LevelsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const progressActions = useProgressActions();
  const { top } = useSafeAreaInsets();

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
        onPress={() => router.push(`/game/jigsaw/${chapterId}/${item.id}`)}
      />
    );
  };

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
    opacity: 1, // Full vibrancy!
  },
  cardOverlay: {
    // Removed default dark overlay
    backgroundColor: "transparent",
  },
  cardOverlayLocked: {
    backgroundColor: "rgba(0,0,0,0.6)", // Lighter lock overlay
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  levelCardLocked: {
    opacity: 0.5,
  },
  levelBadge: {
    backgroundColor: "rgba(255,255,255,0.9)", // Bright badge
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  levelNumber: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.textSecondary, // Dark text on light badge
  },
  lockIcon: {
    fontSize: 24,
    marginTop: 20, // Center optically
  },
  starsRow: {
    // Old starsRow style kept just in case, but unused now
    flexDirection: "row",
    gap: 1,
    marginBottom: 4,
  },
  starsRowBelow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 4,
    height: 16, // Fixed height to prevent layout shifts
    alignItems: "center",
    justifyContent: "center",
  },
  starSmall: {
    fontSize: 12,
    color: "#cbd5e1", // Light gray for empty stars (slate-300)
  },
  starFilledSmall: {
    color: "#fbbf24", // Vibrant Gold
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  starPlaceholder: {
    fontSize: 10,
    color: "transparent",
  },
  star: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)", // Unearned star
    textShadowColor: "black",
    textShadowRadius: 1,
  },
  starFilled: {
    color: "#fbbf24", // Vibrant Gold
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 1,
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
});
