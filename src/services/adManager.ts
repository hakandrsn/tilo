import { Platform } from "react-native";
import { AD_CONFIG } from "../constants/gameConfig";
import { useAdStore } from "../store/adStore";

// ==========================================
// CHECK IF ADMOB IS AVAILABLE
// ==========================================

let isAdMobAvailable = false;
let InterstitialAd: any = null;
let RewardedAd: any = null;
let AdEventType: any = null;
let RewardedAdEventType: any = null;
let TestIds: any = null;

try {
  const admob = require("react-native-google-mobile-ads");
  InterstitialAd = admob.InterstitialAd;
  RewardedAd = admob.RewardedAd;
  AdEventType = admob.AdEventType;
  RewardedAdEventType = admob.RewardedAdEventType;
  TestIds = admob.TestIds;
  isAdMobAvailable = true;
  console.log("📺 AdMob module loaded");
} catch (error) {
  console.log("📺 AdMob not available (Expo Go or not configured)");
  isAdMobAvailable = false;
}

// ==========================================
// AD UNIT IDS
// ==========================================

const getInterstitialId = () => {
  if (__DEV__ && TestIds) return TestIds.INTERSTITIAL;
  return Platform.OS === "ios"
    ? AD_CONFIG.interstitial.ios
    : AD_CONFIG.interstitial.android;
};

const getRewardedId = () => {
  if (__DEV__ && TestIds) return TestIds.REWARDED;
  return Platform.OS === "ios"
    ? AD_CONFIG.rewarded.ios
    : AD_CONFIG.rewarded.android;
};

// ==========================================
// AD INSTANCES
// ==========================================

let interstitialAd: any = null;
let rewardedAd: any = null;
let isInterstitialLoaded = false;
let isRewardedLoaded = false;

// ==========================================
// INTERSTITIAL ADS
// ==========================================

export const loadInterstitial = () => {
  if (!isAdMobAvailable || !InterstitialAd) {
    console.log("📺 AdMob not available, skipping interstitial load");
    return;
  }

  try {
    interstitialAd = InterstitialAd.createForAdRequest(getInterstitialId());

    interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      isInterstitialLoaded = true;
      useAdStore.getState().actions.setInterstitialReady(true);
      console.log("📺 Interstitial loaded");
    });

    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      isInterstitialLoaded = false;
      useAdStore.getState().actions.setInterstitialReady(false);
      loadInterstitial(); // Preload next
    });

    interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.log("📺 Interstitial error:", error);
      isInterstitialLoaded = false;
      useAdStore.getState().actions.setInterstitialReady(false);
    });

    interstitialAd.load();
  } catch (error) {
    console.log("📺 Interstitial init error:", error);
  }
};

export const showInterstitial = async (): Promise<boolean> => {
  if (!isAdMobAvailable || !isInterstitialLoaded || !interstitialAd) {
    console.log("📺 Interstitial not ready");
    return false;
  }

  return new Promise((resolve) => {
    try {
      interstitialAd.show();
      useAdStore.getState().actions.markInterstitialShown();
      resolve(true);
    } catch (error) {
      console.log("📺 Interstitial show error:", error);
      resolve(false);
    }
  });
};

// ==========================================
// REWARDED ADS
// ==========================================

export const loadRewarded = () => {
  if (!isAdMobAvailable || !RewardedAd) {
    console.log("📺 AdMob not available, skipping rewarded load");
    return;
  }

  try {
    rewardedAd = RewardedAd.createForAdRequest(getRewardedId());

    rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      isRewardedLoaded = true;
      useAdStore.getState().actions.setRewardedReady(true);
      console.log("🎁 Rewarded loaded");
    });

    rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      console.log("🎁 Reward earned");
    });

    rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      isRewardedLoaded = false;
      useAdStore.getState().actions.setRewardedReady(false);
      loadRewarded(); // Preload next
    });

    rewardedAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.log("🎁 Rewarded error:", error);
      isRewardedLoaded = false;
      useAdStore.getState().actions.setRewardedReady(false);
    });

    rewardedAd.load();
  } catch (error) {
    console.log("🎁 Rewarded init error:", error);
  }
};

export const showRewarded = (): Promise<boolean> => {
  if (!isAdMobAvailable || !isRewardedLoaded || !rewardedAd) {
    console.log("🎁 Rewarded not ready");
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const unsubscribeReward = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        unsubscribeReward();
        useAdStore.getState().actions.markRewardedShown();
        resolve(true);
      },
    );

    const unsubscribeClose = rewardedAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        unsubscribeClose();
      },
    );

    const unsubscribeError = rewardedAd.addAdEventListener(
      AdEventType.ERROR,
      () => {
        unsubscribeError();
        resolve(false);
      },
    );

    try {
      rewardedAd.show();
    } catch (error) {
      console.log("🎁 Rewarded show error:", error);
      resolve(false);
    }
  });
};

// ==========================================
// INITIALIZATION
// ==========================================

export const initializeAds = () => {
  if (!isAdMobAvailable) {
    console.log("📺 AdMob not available, skipping initialization");
    return;
  }

  console.log("📺 Initializing ads...");
  loadInterstitial();
  loadRewarded();
};

export const isInterstitialReady = () =>
  isAdMobAvailable && isInterstitialLoaded;
export const isRewardedReady = () => isAdMobAvailable && isRewardedLoaded;
