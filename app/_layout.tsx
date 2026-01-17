import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import DevPanel from "../src/components/DevPanel";
import { COLORS } from "../src/constants/gameConfig";
import { initializeAds } from "../src/services/adManager";
import { loginWithDevice } from "../src/services/authService";
import { getDeviceId } from "../src/services/deviceService";
import { useAdActions } from "../src/store/adStore";
import { useHintActions } from "../src/store/hintStore";
import { useProgressActions } from "../src/store/progressStore";

const __DEV_MODE__ = true;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 60 * 24, // 24 hours (Aggressive caching for offline)
      gcTime: 1000 * 60 * 60 * 24 * 2, // 48 hours
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const progressActions = useProgressActions();
  const hintActions = useHintActions();
  const adActions = useAdActions();

  useEffect(() => {
    async function prepare() {
      try {
        const deviceId = await getDeviceId();
        console.log("🚀 App starting with device:", deviceId);

        // CRITICAL: Login FIRST so auth.currentUser is available
        await loginWithDevice();

        // THEN load progress (which needs auth.currentUser to fetch cloud data)
        await progressActions.loadProgress();
        await hintActions.loadHints();
        await adActions.loadAdState();

        try {
          initializeAds();
        } catch (error) {
          console.log("📺 Ad initialization skipped:", error);
        }
      } catch (e) {
        console.warn("App init error:", e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Setup sync queue listener
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupSync = async () => {
      const { setupSyncListener } = await import("../src/services/syncQueue");
      unsubscribe = setupSyncListener();
    };

    setupSync();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <View style={styles.container} onLayout={onLayoutRootView}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: COLORS.surface },
              headerTintColor: COLORS.textPrimary,
              headerTitleStyle: { fontWeight: "600" },
              contentStyle: { backgroundColor: COLORS.background },
              headerShadowVisible: false,
            }}
          />
          {__DEV_MODE__ && <DevPanel />}
        </View>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
});
