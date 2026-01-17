import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { AD_CONFIG } from "../constants/gameConfig";
import { useAdActions, useIsBannerReady } from "../store/adStore";

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
  console.log("📺 AdMob not available for banner");
  isAdMobAvailable = false;
}

// ==========================================
// BANNER AD COMPONENT
// ==========================================

interface GameBannerAdProps {
  onAdLoaded?: () => void;
  onAdFailedToLoad?: () => void;
}

const GameBannerAd: React.FC<GameBannerAdProps> = ({
  onAdLoaded,
  onAdFailedToLoad,
}) => {
  const adActions = useAdActions();
  const isBannerReady = useIsBannerReady();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isAdMobAvailable) {
      setIsVisible(true);
    }
  }, []);

  if (!isAdMobAvailable || !BannerAd || !BannerAdSize) {
    return null;
  }

  const getBannerId = () => {
    if (__DEV__ && TestIds) return TestIds.BANNER;
    return Platform.OS === "ios"
      ? AD_CONFIG.banner.ios
      : AD_CONFIG.banner.android;
  };

  const handleAdLoaded = () => {
    console.log("📺 Banner ad loaded");
    adActions.setBannerReady(true);
    onAdLoaded?.();
  };

  const handleAdFailedToLoad = (error: any) => {
    console.log("📺 Banner ad failed to load:", error);
    adActions.setBannerReady(false);
    onAdFailedToLoad?.();
  };

  if (!isVisible) return null;

  return (
    <View style={styles.bannerContainer}>
      <BannerAd
        unitId={getBannerId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailedToLoad}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "#000",
  },
});

export default GameBannerAd;
