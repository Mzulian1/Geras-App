import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSSO } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { getClerkErrorMessage } from "@/lib/clerkError";

// Cierra la sesión de navegador pendiente si la app se reabre a mitad del
// flujo OAuth (por ejemplo, si el usuario mata la pestaña de Google). Sin
// esto el WebBrowser puede quedar colgado en el siguiente intento.
WebBrowser.maybeCompleteAuthSession();

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
  // en iOS es no-op. El cleanup libera el proceso al desmontar la pantalla.
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  async function onPress() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        // Se deriva del `scheme` de app.json (geras-familia://). En Expo Go
        // makeRedirectUri() devuelve la URL del proxy de Expo automáticamente,
        // así que el mismo código sirve en Expo Go y en build nativa.
        redirectUrl: AuthSession.makeRedirectUri(),
        // Mismo `unsafeMetadata.role` que manda sign-up.tsx por email: si este
        // es el primer ingreso del usuario, el flujo SSO CREA la cuenta, y el
        // webhook del server (userSync.ts) lee este campo para setear
        // `users.role`. Sin esto, quien entre por Google queda con el rol por
        // defecto en vez del de esta app. Solo aplica en la creación; en
        // ingresos posteriores el webhook lo ignora.
        unsafeMetadata: { role: "family" },
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/");
        return;
      }

      // Sin createdSessionId el flujo quedó incompleto: o el usuario canceló
      // en la pantalla de Google, o Clerk pide un paso extra (MFA, completar
      // perfil). No es un error que valga la pena mostrar si fue cancelación.
      onError("No pudimos completar el inicio de sesión con Google.");
    } catch (err) {
      onError(getClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Pressable
      className="flex-row items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-3 disabled:opacity-50"
      onPress={onPress}
      disabled={submitting || disabled}
      accessibilityRole="button"
      accessibilityLabel="Continuar con Google"
    >
      {submitting ? (
        <ActivityIndicator color="#000000" />
      ) : (
        <Text className="font-semibold text-gray-900">Continuar con Google</Text>
      )}
    </Pressable>
  );
}
