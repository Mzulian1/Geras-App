import { useEffect, useState } from "react";
import { hasSeenGuide } from "@/lib/guideStorage";

type GuideGateState = "checking" | "show" | "hide";

// Se muestra la guía automáticamente la primera vez que la cuenta
// llega a un estado navegable, y nunca más — hasta que se "olvide"
// explícitamente (desde Perfil, o resetGuideSeen() en desarrollo).
export function useGuideGate(active: boolean): GuideGateState {
  const [state, setState] = useState<GuideGateState>("checking");

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    hasSeenGuide().then((seen) => {
      if (!cancelled) setState(seen ? "hide" : "show");
    });
    return () => {
      cancelled = true;
    };
  }, [active]);

  return active ? state : "hide";
}
