import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import { GerasBrand, GradientBackground, PrimaryButton, useGerasTheme } from "@geras/ui";
import { getClerkErrorMessage } from "@/lib/clerkError";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

// Mismo criterio de accesibilidad y misma estructura visual que
// mobile-familia (ver comentario allá): gradiente institucional solo en
// la cabecera de marca, campos y botón de envío sobre superficie clara
// para contraste garantizado. Acá el usuario es el profesional, no el
// adulto mayor, pero se mantiene la misma pauta por consistencia entre
// las dos apps.
export default function SignInScreen() {
  const theme = useGerasTheme();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (!isLoaded || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const attempt = await signIn.create({ identifier: email.trim(), password });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/");
      } else {
        setError("No pudimos completar el inicio de sesión. Intenta nuevamente.");
      }
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.surface }} keyboardShouldPersistTaps="handled">
      <GradientBackground variant="primary" style={{ paddingTop: 64, paddingBottom: 32, paddingHorizontal: 24 }}>
        <View style={{ alignItems: "center", gap: 12 }}>
          <GerasBrand variant="horizontal" tone="light" size="lg" showTagline={false} />
          <Text style={{ textAlign: "center", fontSize: 15, color: theme.white, paddingHorizontal: 8 }}>
            El ecosistema de cuidado y bienestar para personas mayores y sus familias
          </Text>
        </View>
      </GradientBackground>

      <View style={{ gap: 20, padding: 24 }}>
        {error ? (
          <View style={{ borderRadius: 12, backgroundColor: theme.errorSoft, padding: 16 }}>
            <Text style={{ fontSize: 15, color: theme.error }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          <GoogleSignInButton onError={setError} disabled={submitting} />
          <Text style={{ textAlign: "center", fontSize: 13, color: theme.textSecondary }}>
            La forma más rápida. No necesitas recordar una contraseña.
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}>
          <View style={{ height: 1, flex: 1, backgroundColor: theme.borderSoft }} />
          <Text style={{ fontSize: 13, color: theme.textSecondary }}>o con tu email</Text>
          <View style={{ height: 1, flex: 1, backgroundColor: theme.borderSoft }} />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: "500", color: theme.textPrimary }}>Email</Text>
          <TextInput
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.borderSoft,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: theme.textPrimary,
              backgroundColor: theme.surface,
            }}
            placeholder="tucorreo@ejemplo.com"
            placeholderTextColor={theme.textDisabled}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            accessibilityLabel="Email"
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: "500", color: theme.textPrimary }}>Contraseña</Text>
          <TextInput
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.borderSoft,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: theme.textPrimary,
              backgroundColor: theme.surface,
            }}
            placeholder="Tu contraseña"
            placeholderTextColor={theme.textDisabled}
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            accessibilityLabel="Contraseña"
          />
        </View>

        <PrimaryButton
          label="Iniciar sesión"
          onPress={onSubmit}
          loading={submitting}
          disabled={!email || !password}
          fullWidth
        />

        <View style={{ gap: 16, paddingTop: 8, alignItems: "center" }}>
          <Link href="/forgot-password" style={{ fontSize: 15, color: theme.textSecondary }}>
            ¿Olvidaste tu contraseña?
          </Link>
          <Link href="/sign-up" style={{ fontSize: 15, color: theme.textSecondary }}>
            ¿No tienes cuenta? Crea una
          </Link>
        </View>

        <Text style={{ textAlign: "center", fontSize: 12, color: theme.textDisabled, paddingTop: 16 }}>
          Desarrollado por Soluciones Mayores
        </Text>
      </View>
    </ScrollView>
  );
}
