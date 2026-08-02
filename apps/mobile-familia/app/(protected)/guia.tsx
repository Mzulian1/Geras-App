import { router } from "expo-router";
import { GuidedTour, type GuidedTourStep } from "@geras/ui";
import { markGuideSeen } from "@/lib/guideStorage";

const STEPS: GuidedTourStep[] = [
  {
    icon: "search-outline",
    title: "Busca servicios",
    description: "Explora los servicios de cuidado disponibles para personas mayores, agrupados por tipo de ayuda.",
  },
  {
    icon: "people-outline",
    title: "Elige un profesional",
    description: "Revisa perfiles verificados con evaluación, experiencia y precio antes de decidir.",
  },
  {
    icon: "business-outline",
    title: "Busca una residencia",
    description: "Compara residencias por comuna, precio y características, y contacta directo desde la app.",
  },
  {
    icon: "calendar-outline",
    title: "Reserva",
    description: "Elige fecha y hora con el calendario y confirma tu reserva en pocos pasos.",
  },
  {
    icon: "list-outline",
    title: "Revisa tu actividad",
    description: "Sigue el estado de tus solicitudes, reservas y consultas desde la pestaña Actividad.",
  },
];

// Se muestra automáticamente al primer ingreso (ver (protected)/_layout.tsx)
// y es reabrible desde Perfil ("¿Cómo funciona Geras?"). Omitir y
// Comenzar marcan lo mismo como "visto" — no hay diferencia de
// contenido entre saltarla o terminarla, solo cambia si se vuelve a
// mostrar sola la próxima vez.
export default function GuideScreen() {
  function finish() {
    void markGuideSeen();
    // No usa router.back(): cuando se abre automáticamente al primer
    // ingreso (vía <Redirect/> desde _layout) no hay una pantalla
    // previa a la que volver.
    router.replace("/");
  }
  return <GuidedTour steps={STEPS} onFinish={finish} onSkip={finish} />;
}
