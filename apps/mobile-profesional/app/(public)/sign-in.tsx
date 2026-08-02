import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import { getClerkErrorMessage } from "@/lib/clerkError";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

// Mismo criterio de accesibilidad que en mobile-familia (ver comentario
// allá): Google primero por ser el camino sin contraseña, etiquetas
// visibles arriba de cada campo, áreas táctiles de 48px+ y tipografía
// grande. Acá el usuario es el profesional, no el adulto mayor, pero se
// mantiene la misma pauta por consistencia entre las dos apps.
export default function SignInScreen() {
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
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="grow justify-center gap-5 px-6 py-10"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-2">
        <Text className="text-3xl font-bold text-gray-900">Geras Profesionales</Text>
        <Text className="text-lg text-gray-600">Ingresa para continuar</Text>
      </View>

      {error ? (
        <View className="rounded-lg bg-red-50 p-4">
          <Text className="text-base text-red-700">{error}</Text>
        </View>
      ) : null}

      <View className="gap-2">
        <GoogleSignInButton onError={setError} disabled={submitting} />
        <Text className="text-center text-sm text-gray-500">
          La forma más rápida. No necesitas recordar una contraseña.
        </Text>
      </View>

      <View className="flex-row items-center gap-3 py-2">
        <View className="h-px flex-1 bg-gray-200" />
        <Text className="text-sm text-gray-500">o con tu email</Text>
        <View className="h-px flex-1 bg-gray-200" />
      </View>

      <View className="gap-2">
        <Text className="text-base font-medium text-gray-700">Email</Text>
        <TextInput
          className="rounded-lg border border-gray-300 px-4 py-4 text-lg text-gray-900"
          placeholder="tucorreo@ejemplo.com"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          accessibilityLabel="Email"
        />
      </View>

      <View className="gap-2">
        <Text className="text-base font-medium text-gray-700">Contraseña</Text>
        <TextInput
          className="rounded-lg border border-gray-300 px-4 py-4 text-lg text-gray-900"
          placeholder="Tu contraseña"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          accessibilityLabel="Contraseña"
        />
      </View>

      <Pressable
        className="items-center justify-center rounded-lg bg-black py-4 disabled:opacity-50"
        onPress={onSubmit}
        disabled={submitting || !email || !password}
        accessibilityRole="button"
        accessibilityLabel="Iniciar sesión"
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-lg font-semibold text-white">Iniciar sesión</Text>
        )}
      </Pressable>

      <View className="gap-4 pt-2">
        <Link href="/forgot-password" className="text-center text-base text-gray-600">
          ¿Olvidaste tu contraseña?
        </Link>
        <Link href="/sign-up" className="text-center text-base text-gray-600">
          ¿No tienes cuenta? Crea una
        </Link>
      </View>

      <Text className="pt-6 text-center text-xs text-gray-400">Desarrollado por Soluciones Mayores</Text>
    </ScrollView>
  );
}
