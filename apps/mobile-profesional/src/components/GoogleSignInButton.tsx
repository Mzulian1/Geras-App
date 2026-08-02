import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSSO } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { getClerkErrorMessage } from "@/lib/clerkError";

// Cierra la sesión de navegador pendiente si la app se reabre a mitad del
// flujo OAuth (por ejemplo, si el usuario mata la pestaña de Google). Sin
// esto el WebBrowser puede quedar colgado en el siguiente intento.
WebBrowser.maybeCompleteAuthSession();

// Se usa el glifo de Ionicons en vez de un SVG con los colores oficiales
// porque react-native-svg no es dependencia de la app y no vale la pena
// sumarla solo por este ícono. El azul de marca da el reconocimiento visual.
function GoogleLogo() {
  return <Ionicons name="logo-google" size={22} color="#4285F4" />;
}

interface GoogleSignInButtonProps {
  // Se llama con el mensaje de error para que la pantalla lo muestre en el
  // mismo lugar que los errores de email/contraseña, en vez de duplicar UI.
  onError: (message: string) => void;
  disabled?: boolean;
}

// Login con Google vía Clerk. Usa useSSO() (la API actual de @clerk/clerk-expo;
// useOAuth() está deprecada) y abre el flujo en un AuthSession del navegador
// del sistema, que es el requisito de Google para OAuth en móvil: no acepta
// webviews embebidos.
export function GoogleSignInButton({ onError, disabled }: GoogleSignInButtonProps) {
  const { startSSOFlow } = useSSO();
  const [submitting, setSubmitting] = useState(false);

  // Precalentar el navegador hace que la transición sea inmediata en Android;
  // en iOS es no-op. En web, warmUpAsync/coolDownAsync ni siquiera existen
  // (lanzan una excepción no capturada que puede dejar la pantalla de login
  // en blanco al montar) — no aplica ahí de todos modos, así que se salta.
  useEffect(() => {
    if (Platform.OS === "web") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  async function onPress() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { createdSessionId, setActive, signUp } = await startSSOFlow({
        strategy: "oauth_google",
        // Se deriva del `scheme` de app.json (geras-profesional://). En Expo Go
        // makeRedirectUri() devuelve la URL del proxy de Expo automáticamente,
        // así que el mismo código sirve en Expo Go y en build nativa.
        redirectUrl: AuthSession.makeRedirectUri(),
        // Mismo `unsafeMetadata.role` que manda sign-up.tsx por email: si este
        // es el primer ingreso del usuario, el flujo SSO CREA la cuenta, y el
        // webhook del server (userSync.ts) lee este campo para setear
        // `users.role`. Sin esto, quien entre por Google queda con el rol por
        // defecto (family) en vez de profesional. Solo aplica en la creación;
        // en ingresos posteriores el webhook lo ignora.
        unsafeMetadata: { role: "professional" },
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/");
        return;
      }

      // Sin createdSessionId el flujo quedó incompleto. El caso que importa
      // distinguir es `missing_requirements`: Clerk creó el registro pero le
      // faltan campos obligatorios que Google no entrega. En la práctica esto
      // pasa cuando la instancia de Clerk tiene `password` marcado como
      // required — con esa configuración el alta por Google NUNCA puede
      // completarse, y un mensaje genérico haría perder tiempo buscando el
      // problema en la app en vez de en el dashboard.
      if (signUp?.status === "missing_requirements") {
        const missing = [...(signUp.missingFields ?? [])].join(", ");
        onError(
          `Tu cuenta de Google no pudo completarse porque Clerk exige datos que Google no entrega (${missing || "campos obligatorios"}). ` +
            "Hay que marcar esos campos como opcionales en el dashboard de Clerk."
        );
        return;
      }

      // Si no fue eso, lo más probable es que el usuario haya cancelado en la
      // pantalla de Google. No hace falta alarmar.
      onError("No pudimos completar el inicio de sesión con Google.");
    } catch (err) {
      onError(getClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Pressable
      // py-4 + text-lg para dar un área táctil cómoda (48px+) y texto
      // legible sin forzar la vista; border-2 para que el botón se lea como
      // opción principal aunque el fondo sea blanco (la guía de marca de
      // Google no permite pintarlo de un color arbitrario).
      className="flex-row items-center justify-center gap-3 rounded-lg border-2 border-gray-300 bg-white py-4 disabled:opacity-50"
      onPress={onPress}
      disabled={submitting || disabled}
      accessibilityRole="button"
      accessibilityLabel="Continuar con Google"
    >
      {submitting ? (
        <ActivityIndicator color="#000000" />
      ) : (
        <>
          <GoogleLogo />
          <Text className="text-lg font-semibold text-gray-900">Continuar con Google</Text>
        </>
      )}
    </Pressable>
  );
}
