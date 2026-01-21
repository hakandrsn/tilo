import { COLORS } from "@/src/constants/colors";
import { initializeAds } from "@/src/services/adManager";
import { loginWithDevice } from "@/src/services/authService";
import { getDeviceId } from "@/src/services/deviceService";
import { useAdActions } from "@/src/store/adStore";
import { useProgressActions } from "@/src/store/progressStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import CustomSplashScreen from "../src/components/CustomSplashScreen";

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
  const adActions = useAdActions();

  useEffect(() => {
    async function prepare() {
      try {
        // Hide Native Splash IMMEDIATELY so our Custom Splash shows
        await SplashScreen.hideAsync();

        const deviceId = await getDeviceId();

        // Login & Load Data
        await loginWithDevice();
        await progressActions.loadProgress();
        await adActions.loadAdState();

        const { getChapters } = await import("../src/store/dataStore").then(
          (m) => m.useDataStore.getState().actions,
        );
        await getChapters();

        try {
          // Delay ad init slightly to prioritize UI
          setTimeout(() => initializeAds(), 100);
        } catch (error) {
          console.log("📺 Ad initialization skipped:", error);
        }
      } catch (e) {
        console.warn("App init error:", e);
      } finally {
        // Data is ready, start transitioning out the splash screen
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Sync Queue Setup
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const setupSync = async () => {
      const { setupSyncListener } = await import("../src/services/syncQueue");
      unsubscribe = setupSyncListener();
    };
    setupSync();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <View style={styles.container}>
          <StatusBar style="dark" />

          {/* Main App Content - Rendered but covered by Splash until ready */}
          {appIsReady && (
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen
                name="chapters"
                options={{
                  title: "Bölümler",
                  headerStyle: { backgroundColor: COLORS.background },
                  headerTintColor: COLORS.textPrimary,
                  headerTitleStyle: {
                    fontWeight: "600",
                    color: COLORS.textPrimary,
                  },
                  contentStyle: { backgroundColor: COLORS.background },
                  headerShadowVisible: false,
                  animation: "slide_from_right",
                  headerShown: true,
                }}
              />
              <Stack.Screen
                name="levels/[chapterId]"
                options={{
                  title: "Seviyeler",
                  animation: "slide_from_right",
                  headerShown: false,
                  freezeOnBlur: true,
                }}
              />
              <Stack.Screen
                name="game/jigsaw/[chapterId]/[levelId]"
                options={{
                  headerShown: false,
                  animation: "slide_from_right",
                }}
              />
            </Stack>
          )}
          {!appIsReady && <CustomSplashScreen />}
        </View>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
});
