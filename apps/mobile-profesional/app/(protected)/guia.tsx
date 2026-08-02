import { router } from "expo-router";
import { GuidedTour, type GuidedTourStep } from "@geras/ui";

const STEPS: GuidedTourStep[] = [
  {
    icon: "person-outline",
    title: "Completa tu perfil",
    description: "Cuéntanos tu profesión y experiencia para que las familias sepan quién eres.",
  },
  {
    icon: "document-attach-outline",
    title: "Carga tus documentos",
    description: "Sube tus documentos de respaldo — son privados y solo los ve el equipo de Geras.",
  },
  {
    icon: "briefcase-outline",
    title: "Configura tus servicios",
    description: "Elige qué servicios ofreces y define tu precio para cada uno.",
  },
  {
    icon: "calendar-outline",
    title: "Configura tu disponibilidad",
    description: "Marca los días y horarios en que puedes atender.",
  },
  {
    icon: "checkmark-done-outline",
    title: "Gestiona tus reservas",
    description: "Acepta o rechaza reservas, y marca cada atención como iniciada y finalizada.",
  },
];

// Guía reabrible desde Perfil. No se muestra automáticamente al primer
// ingreso todavía (mismo motivo que en Mobile Familia — ver guia.tsx
// allá y el informe final, Pendientes).
export default function GuideScreen() {
  return <GuidedTour steps={STEPS} onFinish={() => router.back()} onSkip={() => router.back()} />;
}
