import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import { getClerkErrorMessage } from "@/lib/clerkError";

// Flujo estándar de reset de contraseña de Clerk vía `useSignIn()`
// (custom flow, no hay componente prebuilt en Expo). Si el proyecto de
// Clerk no tiene habilitado "reset password" para email/password, la
// llamada falla y el error real de Clerk queda visible en pantalla en
// vez de romper la app.
export default function ForgotPasswordScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onRequest() {
    if (!isLoaded || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signIn.create({ strategy: "reset_password_email_code", identifier: email.trim() });
      setStep("reset");
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onReset() {
    if (!isLoaded || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password,
      });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/");
      } else {
        setError("No pudimos restablecer la contraseña. Revisa el código.");
      }
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "reset") {
    return (
      <View className="flex-1 justify-center gap-4 bg-white px-6">
        <Text className="text-2xl font-bold">Restablece tu contraseña</Text>
        <Text className="text-base text-gray-600">Te enviamos un código a {email}</Text>

        {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

        <TextInput
          className="rounded-lg border border-gray-300 px-4 py-3"
          placeholder="Código de verificación"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
        />
        <TextInput
          className="rounded-lg border border-gray-300 px-4 py-3"
          placeholder="Nueva contraseña"
          secureTextEntry
          autoComplete="password-new"
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          className="items-center justify-center rounded-lg bg-black py-3 disabled:opacity-50"
          onPress={onReset}
          disabled={submitting || !code || !password}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="font-semibold text-white">Restablecer contraseña</Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center gap-4 bg-white px-6">
      <Text className="text-2xl font-bold">Recupera tu acceso</Text>
      <Text className="text-base text-gray-600">Te enviaremos un código para restablecer tu contraseña</Text>

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

      <Pressable
        className="items-center justify-center rounded-lg bg-black py-3 disabled:opacity-50"
        onPress={onRequest}
        disabled={submitting || !email}
      >
        {submitting ? <ActivityIndicator color="#ffffff" /> : <Text className="font-semibold text-white">Enviar código</Text>}
      </Pressable>

      <Link href="/sign-in" className="text-center text-sm text-gray-600">
        Volver a iniciar sesión
      </Link>
    </View>
  );
}
