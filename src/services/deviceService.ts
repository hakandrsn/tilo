import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { randomUUID } from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const SECURE_STORAGE_KEY = "puzzleGame_deviceId";
const LEGACY_STORAGE_KEY = "@puzzleGame:deviceId"; // For migration
let cachedDeviceId: string | null = null;

/**
 * Persistent Device ID System with SecureStore
 *
 * Uses SecureStore (Keychain on iOS, EncryptedSharedPreferences on Android)
 * to ensure device ID persists even after app uninstall.
 *
 * Why SecureStore:
 * - iOS: Stored in Keychain → Survives app deletion
 * - Android: Stored in EncryptedSharedPreferences → Survives app deletion
 * - Encrypted and secure
 * - Can sync across devices via iCloud Keychain (iOS) or Google Backup (Android)
 *
 * Migration Strategy:
 * - First check SecureStore (new users)
 * - If empty, check AsyncStorage (existing users)
 * - Migrate AsyncStorage → SecureStore
 * - This prevents existing users from losing progress
 */
export const getDeviceId = async (): Promise<string> => {
  if (cachedDeviceId) return cachedDeviceId;

  try {
    // 1. Try SecureStore first (primary storage)
    const secureId = await SecureStore.getItemAsync(SECURE_STORAGE_KEY);

    if (secureId) {
      console.log("📱 Device ID (SecureStore - Persistent):", secureId);
      cachedDeviceId = secureId;
      return secureId;
    }

    // 2. Check AsyncStorage for migration (existing users)
    const legacyId = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);

    if (legacyId) {
      console.log("📱 Device ID (Migrating from AsyncStorage):", legacyId);

      // Migrate to SecureStore
      try {
        await SecureStore.setItemAsync(SECURE_STORAGE_KEY, legacyId);
        console.log("✅ Migration successful: AsyncStorage → SecureStore");
      } catch (migrateError) {
        console.warn(
          "⚠️ SecureStore migration failed, continuing with AsyncStorage:",
          migrateError,
        );
      }

      cachedDeviceId = legacyId;
      return legacyId;
    }

    // 3. No existing ID - Generate new UUID
    const uuid = randomUUID();

    // 4. Save to SecureStore
    await SecureStore.setItemAsync(SECURE_STORAGE_KEY, uuid);
    console.log("📱 Device ID (New UUID - SecureStore):", uuid);

    // Also save to AsyncStorage as backup (in case SecureStore fails on read later)
    await AsyncStorage.setItem(LEGACY_STORAGE_KEY, uuid).catch((e) =>
      console.warn("AsyncStorage backup failed:", e),
    );

    cachedDeviceId = uuid;
    return uuid;
  } catch (error) {
    console.error("❌ Device ID error:", error);

    // Fallback: Try AsyncStorage as last resort
    try {
      const fallbackId = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      if (fallbackId) {
        console.warn("⚠️ Using AsyncStorage fallback:", fallbackId);
        cachedDeviceId = fallbackId;
        return fallbackId;
      }
    } catch (asyncError) {
      console.error("AsyncStorage fallback also failed:", asyncError);
    }

    // Last resort: Temporary ID (not saved)
    cachedDeviceId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.error("🆘 Using temporary ID (not persistent):", cachedDeviceId);
    return cachedDeviceId;
  }
};

export const getAppInfo = () => {
  return {
    name: Application.applicationName,
    version: Application.nativeApplicationVersion,
    buildVersion: Application.nativeBuildVersion,
  };
};
