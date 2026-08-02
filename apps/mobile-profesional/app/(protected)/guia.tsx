import { router } from "expo-router";
import { GuidedTour, type GuidedTourStep } from "@geras/ui";
import { markGuideSeen } from "@/lib/guideStorage";

const STEPS: GuidedTourStep[] = [
  {
    icon: "person-outline",
    title: "Completa tu perfil",
    description: "Cuéntanos tu profesión, experiencia y sube una foto para que las familias sepan quién eres.",
  },
  {
    icon: "briefcase-outline",
    title: "Configura tus servicios",
    description: "Elige qué servicios ofreces y define tu precio para cada uno.",
  },
  {
    icon: "calendar-outline",
    title: "Configura tu disponibilidad",
    description: "Marca los días y horarios en que puedes atender — de ahí sale tu agenda real.",
  },
  {
    icon: "search-outline",
    title: "Revisa tus oportunidades",
    description: "Mira las solicitudes abiertas que coinciden con tus servicios, comuna y disponibilidad.",
  },
  {
    icon: "checkmark-done-outline",
    title: "Gestiona tus reservas",
    description: "Acepta o rechaza reservas, y marca cada atención como iniciada y finalizada.",
  },
];

// Se muestra automáticamente al primer ingreso (ver (protected)/_layout.tsx)
// y es reabrible desde Perfil.
export default function GuideScreen() {
  function finish() {
    void markGuideSeen();
    router.replace("/");
  }
  return <GuidedTour steps={STEPS} onFinish={finish} onSkip={finish} />;
}
