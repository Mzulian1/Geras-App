import * as SecureStore from "expo-secure-store";

const GUIDE_SEEN_KEY = "geras_guide_seen";

export async function hasSeenGuide(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(GUIDE_SEEN_KEY);
  return value === "1";
}

export async function markGuideSeen(): Promise<void> {
  await SecureStore.setItemAsync(GUIDE_SEEN_KEY, "1");
}

// Solo para desarrollo: "olvidar" que ya se vio, para poder probarla
// de nuevo sin desinstalar la app.
export async function resetGuideSeen(): Promise<void> {
  await SecureStore.deleteItemAsync(GUIDE_SEEN_KEY);
}
