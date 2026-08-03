import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

// Recuerda si una ayuda contextual (HelpBanner) ya fue cerrada, con la
// misma estrategia de persistencia local que ya usa guideStorage.ts
// para la guía interactiva — sin depender del backend. Una clave por
// banner (`geras_help_<key>`) para que cerrar uno no oculte los demás.
export function useDismissibleHelp(key: string) {
  const storageKey = `geras_help_${key}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    void SecureStore.getItemAsync(storageKey).then((value) => {
      if (mounted && value === "1") setDismissed(true);
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function dismiss() {
    setDismissed(true);
    void SecureStore.setItemAsync(storageKey, "1");
  }

  return { visible: !dismissed, dismiss };
}
