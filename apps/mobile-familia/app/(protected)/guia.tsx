import { router } from "expo-router";
import { GuidedTour, type GuidedTourStep } from "@geras/ui";

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

// Guía reabrible desde Perfil ("¿Cómo funciona Geras?"). No se muestra
// automáticamente al primer ingreso todavía — activar eso requiere
// persistir el estado "visto" y enganchar el gate de (protected)/_layout,
// que se deja pendiente a propósito para no tocar ese gate sin más
// tiempo de prueba en dispositivo (ver informe final, Pendientes).
export default function GuideScreen() {
  return <GuidedTour steps={STEPS} onFinish={() => router.back()} onSkip={() => router.back()} />;
}
