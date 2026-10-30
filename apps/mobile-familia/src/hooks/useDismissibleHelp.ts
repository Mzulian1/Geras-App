import { useEffect, useState } from "react";
import { getStoredValue, setStoredValue } from "@/lib/localStorage";

// Recuerda si una ayuda contextual (HelpBanner) ya fue cerrada, con la
// misma estrategia de persistencia local que ya usa guideStorage.ts
// para la guía interactiva — sin depender del backend. Una clave por
// banner (`geras_help_<key>`) para que cerrar uno no oculte los demás.
//
// La persistencia pasa por `lib/localStorage`, que elige el almacén
// según la plataforma: en web `expo-secure-store` no existe y lanzaba
// un rechazo sin capturar al montar cualquier pantalla con un aviso.
export function useDismissibleHelp(key: string) {
  const storageKey = `geras_help_${key}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    void getStoredValue(storageKey).then((value) => {
      if (mounted && value === "1") setDismissed(true);
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function dismiss() {
    setDismissed(true);
    void setStoredValue(storageKey, "1");
  }

  return { visible: !dismissed, dismiss };
}
