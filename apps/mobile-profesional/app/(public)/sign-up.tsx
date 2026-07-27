import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { getClerkErrorMessage } from "@/lib/clerkError";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onCreate() {
    if (!isLoaded || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      // `unsafeMetadata.role` es la autodeclaración "soy profesional" —
      // el webhook del server (userSync.ts) la usa solo en la creación
      // de la cuenta para setear `users.role`. Nunca puede llegar a
      // 'admin' por acá: ver el comentario en userSync.ts.
      await signUp.create({
        emailAddress: email.trim(),
        password,
        unsafeMetadata: { role: "professional" },
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerify() {
    if (!isLoaded || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/");
      } else {
        setError("No pudimos completar la verificación. Revisa el código.");
      }
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "verify") {
    return (
      <View className="flex-1 justify-center gap-4 bg-white px-6">
        <Text className="text-2xl font-bold">Verifica tu email</Text>
        <Text className="text-base text-gray-600">Te enviamos un código a {email}</Text>

        {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

        <TextInput
          className="rounded-lg border border-gray-300 px-4 py-3"
          placeholder="Código de verificación"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
        />

        <Pressable
          className="items-center justify-center rounded-lg bg-black py-3 disabled:opacity-50"
          onPress={onVerify}
          disabled={submitting || !code}
        >
          {submitting ? <ActivityIndicator color="#ffffff" /> : <Text className="font-semibold text-white">Verificar</Text>}
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center gap-4 bg-white px-6">
      <Text className="text-2xl font-bold">Crea tu cuenta de profesional</Text>

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
        autoComplete="password-new"
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        className="items-center justify-center rounded-lg bg-black py-3 disabled:opacity-50"
        onPress={onCreate}
        disabled={submitting || !email || !password}
      >
        {submitting ? <ActivityIndicator color="#ffffff" /> : <Text className="font-semibold text-white">Crear cuenta</Text>}
      </Pressable>

      <Link href="/sign-in" className="text-center text-sm text-gray-600">
        ¿Ya tienes cuenta? Inicia sesión
      </Link>
    </View>
  );
}
