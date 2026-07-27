import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import { getClerkErrorMessage } from "@/lib/clerkError";

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
    <View className="flex-1 justify-center gap-4 bg-white px-6">
      <Text className="text-2xl font-bold">Geras Profesionales</Text>
      <Text className="text-base text-gray-600">Inicia sesión para continuar</Text>

      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

      <TextInput
        className="rounded-lg border border-gray-300 px-4 py-3"
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="rounded-lg border border-gray-300 px-4 py-3"
        placeholder="Contraseña"
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        className="items-center justify-center rounded-lg bg-black py-3 disabled:opacity-50"
        onPress={onSubmit}
        disabled={submitting || !email || !password}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="font-semibold text-white">Iniciar sesión</Text>
        )}
      </Pressable>

      <Link href="/forgot-password" className="text-center text-sm text-gray-600">
        ¿Olvidaste tu contraseña?
      </Link>
      <Link href="/sign-up" className="text-center text-sm text-gray-600">
        ¿No tienes cuenta? Crea una
      </Link>
    </View>
  );
}
