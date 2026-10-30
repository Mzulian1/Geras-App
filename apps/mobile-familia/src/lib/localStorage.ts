import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// ============================================================
// PERSISTENCIA LOCAL QUE TAMBIÉN FUNCIONA EN WEB
//
// `expo-secure-store` es un módulo nativo: en web no existe, y llamarlo
// revienta con "ExpoSecureStore.default.getValueWithKeyAsync is not a
// function". En la app desplegada el error quedaba como un rechazo de
// promesa sin capturar —invisible para el usuario, pero dejando la
// guía interactiva y las ayudas contextuales sin funcionar— y en
// desarrollo levantaba la pantalla roja de error.
//
// Acá se elige el almacén según la plataforma. En web se usa
// `localStorage`, que es lo correcto para lo que se guarda: banderas de
// interfaz ("ya vio la guía", "cerró este aviso"). NO se debe usar este
// módulo para nada sensible en web — localStorage no está cifrado y
// cualquier script de la página lo lee. Los tokens de sesión no pasan
// por acá: de eso se encarga Clerk con sus propias cookies.
//
// Todo va envuelto en try/catch porque `localStorage` también puede
// fallar: en ventanas privadas o con las cookies bloqueadas, el solo
// hecho de accederlo lanza. Una bandera de interfaz que no se puede
// guardar no es motivo para romper una pantalla; el peor caso es que la
// guía se vuelva a ofrecer.
// ============================================================

const esWeb = Platform.OS === "web";

export async function getStoredValue(key: string): Promise<string | null> {
  try {
    if (esWeb) return globalThis.localStorage?.getItem(key) ?? null;
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setStoredValue(key: string, value: string): Promise<void> {
  try {
    if (esWeb) {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Ver el comentario de arriba: no poder recordar una preferencia de
    // interfaz nunca debe tumbar la pantalla que la usa.
  }
}

export async function removeStoredValue(key: string): Promise<void> {
  try {
    if (esWeb) {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Igual que en setStoredValue.
  }
}
