import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { AD_CONFIG } from "../constants/gameConfig";

// ==========================================
// CHECK IF ADMOB IS AVAILABLE
// ==========================================

let isAdMobAvailable = false;
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

try {
  const admob = require("react-native-google-mobile-ads");
  BannerAd = admob.BannerAd;
  BannerAdSize = admob.BannerAdSize;
  TestIds = admob.TestIds;
  isAdMobAvailable = true;
} catch (error) {
  console.log("📺 AdMob not available for native ads");
  isAdMobAvailable = false;
}

// ==========================================
// NATIVE AD COMPONENT (Using Medium Rectangle Banner)
// ==========================================

interface ChapterNativeAdProps {
  index: number;
}

const ChapterNativeAd: React.FC<ChapterNativeAdProps> = ({ index }) => {
  if (!isAdMobAvailable || !BannerAd || !BannerAdSize) {
    // Fallback: Show nothing if AdMob not available
    return null;
  }

  const getBannerId = () => {
    if (__DEV__ && TestIds) return TestIds.BANNER;
    return Platform.OS === "ios"
      ? AD_CONFIG.banner.ios
      : AD_CONFIG.banner.android;
  };

  return (
    <View style={styles.adWrapper}>
      <BannerAd
        unitId={getBannerId()}
        size={BannerAdSize.MEDIUM_RECTANGLE}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log("📺 Chapter ad loaded");
        }}
        onAdFailedToLoad={(error: any) => {
          console.log("📺 Chapter ad failed:", error);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  adWrapper: {
    width: "100%",
    alignItems: "center",
    marginVertical: 8,
  },
});

export default ChapterNativeAd;
