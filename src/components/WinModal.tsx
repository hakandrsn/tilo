import LottieView from "lottie-react-native";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  ZoomIn, // Changed from SlideInDown
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { COLORS } from "../constants/gameConfig";

interface WinModalProps {
  visible: boolean;
  moves: number;
  stars: number;
  isLastLevel: boolean;
  chapterColor?: string;
  hasNextChapter?: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onBackToLevels: () => void;
}

const Star: React.FC<{ delay: number }> = ({ delay }) => (
  <Animated.View entering={ZoomIn.delay(delay).springify()}>
    <LottieView
      source={require("../assets/animations/star.json")}
      autoPlay
      loop
      style={{ width: 90, height: 90 }}
    />
  </Animated.View>
);

const WinModal: React.FC<WinModalProps> = ({
  visible,
  moves,
  stars,
  isLastLevel,
  hasNextChapter,
  chapterColor,
  onNextLevel,
  onReplay,
  onBackToLevels,
}) => {
  const accentColor = chapterColor || COLORS.primary;
  const scale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500, easing: Easing.ease }),
          withTiming(1, { duration: 500, easing: Easing.ease }),
        ),
        -1,
        true,
      );
    } else {
      scale.value = 1;
    }
  }, [visible]);

  const animatedTitleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null; // Don't render if not visible

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlayWrapper]}>
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.modalContainer}
        >
          <Animated.Text style={[styles.title, animatedTitleStyle]}>
            Tebrikler!
          </Animated.Text>
          <Text style={styles.subtitle}>Bulmacayı Tamamladın</Text>

          {/* Stars Container - Only render earned stars */}
          <View style={styles.starsContainer}>
            {Array.from({ length: stars }).map((_, index) => (
              <Star key={index} delay={index * 300} />
            ))}
          </View>

          <View style={styles.statsContainer}>
            <Text style={[styles.statValue, { color: accentColor }]}>
              {moves}
            </Text>
            <Text style={styles.statLabel}>Hamle</Text>
          </View>

          <View style={styles.buttonsContainer}>
            {(!isLastLevel || hasNextChapter) && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  { backgroundColor: accentColor },
                ]}
                onPress={onNextLevel}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>
                  {isLastLevel ? "Sonraki Bölüm" : "Sonraki Seviye"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onReplay}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Tekrar Oyna</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={onBackToLevels}
              activeOpacity={0.8}
            >
              <Text style={styles.tertiaryButtonText}>Seviyelere Dön</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayWrapper: {
    zIndex: 9999, // Ensure it sits on top of everything
    elevation: 9999, // For Android
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  lottieContainer: {
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 8,
    justifyContent: "center", // Centered content
  },
  star: {
    fontSize: 44,
    color: COLORS.starEmpty,
  },
  starFilled: {
    color: COLORS.starFilled,
  },
  statsContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  statValue: {
    fontSize: 40,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  buttonsContainer: {
    width: "100%",
    gap: 10,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryButton: {},
  primaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#e0e0e0", // Light gray for secondary button
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  tertiaryButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});

export default WinModal;
