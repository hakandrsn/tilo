import { Image } from "expo-image";
import React, { useEffect } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { COLORS } from "../constants/colors";

interface CustomSplashScreenProps {
  onAnimationFinish?: () => void;
}

export default function CustomSplashScreen({
  onAnimationFinish,
}: CustomSplashScreenProps) {
  // Shared Values for animations
  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  // Dimensions
  const { width } = useWindowDimensions();
  const BAR_WIDTH = width * 0.6;

  useEffect(() => {
    // 1. Logo Entrance
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoScale.value = withSpring(1, { damping: 2, stiffness: 1 });

    // 2. Text Entrance (Delayed)
    textOpacity.value = withTiming(1, { duration: 800 });

    // 3. Progress Bar Animation
    // Simulate loading for 2 seconds (or until props change, but here we run a set anim)
    progressWidth.value = withTiming(
      BAR_WIDTH,
      { duration: 2500 },
      (finished) => {
        // Since we are controlled by parent's unmount/fadeout,
        // this internal animation just gives visual feedback.
      },
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: progressWidth.value,
  }));

  return (
    <Animated.View
      style={styles.container}
      exiting={FadeOut.duration(500).withCallback(() => {
        if (onAnimationFinish) {
          // Callback handled by Reanimated on UI thread usually,
          // but for JS side logic we rely on component unmount mostly.
        }
      })}
    >
      <View style={styles.centerContent}>
        {/* LOGO */}
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <Image
            source={require("../assets/images/splash-icon.png")}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>

        {/* TILO TEXT */}
        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text style={styles.appName}>Tilo</Text>
        </Animated.View>
      </View>

      {/* PROGRESS BAR */}
      <View style={[styles.progressContainer, { width: BAR_WIDTH }]}>
        <Animated.View style={[styles.progressBar, progressStyle]} />
      </View>

      <Text style={styles.loadingText}>Yükleniyor...</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background, // Turquoise
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999, // Ensure it's on top
  },
  centerContent: {
    alignItems: "center",
    marginBottom: 60,
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  logo: {
    width: 120,
    height: 120,
  },
  textContainer: {
    marginTop: 10,
  },
  appName: {
    fontSize: 42,
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: 2,
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  progressContainer: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 40,
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.primary, // Sunflower yellow
    borderRadius: 3,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
  },
});
