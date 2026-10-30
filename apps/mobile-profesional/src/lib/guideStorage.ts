import { getStoredValue, removeStoredValue, setStoredValue } from "./localStorage";

const GUIDE_SEEN_KEY = "geras_guide_seen";

export async function hasSeenGuide(): Promise<boolean> {
  const value = await getStoredValue(GUIDE_SEEN_KEY);
  return value === "1";
}

export async function markGuideSeen(): Promise<void> {
  await setStoredValue(GUIDE_SEEN_KEY, "1");
}

// Solo para desarrollo: "olvidar" que ya se vio, para poder probarla
// de nuevo sin desinstalar la app.
export async function resetGuideSeen(): Promise<void> {
  await removeStoredValue(GUIDE_SEEN_KEY);
}
