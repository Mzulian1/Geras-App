import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import {
  BrandFooter,
  Card,
  GerasBrand,
  HelpBanner,
  HeroHeader,
  PrimaryButton,
  SecondaryButton,
  useGerasTheme,
} from "@geras/ui";
import { getClerkErrorMessage } from "@/lib/clerkError";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

// Login de Profesional. Misma estructura, mismos componentes y mismas
// decisiones de accesibilidad que el login de Familia (ver el comentario
// allá): acá el usuario es el profesional y no el adulto mayor, pero la
// pauta se mantiene por consistencia entre las dos apps.
//
// Decisiones que no son estéticas:
//
//  - Google va PRIMERO porque es el camino que no exige recordar una
//    contraseña, la principal fuente de fricción y de abandono.
//  - El formulario de correo está OCULTO hasta que se pide ("Ingresar con
//    correo"). Es la regla de progresión de la guía §3: dos caminos
//    desplegados a la vez hacen que el usuario compare en vez de entrar.
//    El botón no es decorativo — revela el formulario y le da el foco.
//  - Etiquetas visibles arriba de cada campo, no solo `placeholder`: el
//    placeholder desaparece al escribir y deja al usuario sin contexto.
//  - Áreas táctiles de 48px+, ningún texto relevante bajo 14px.
//  - `ScrollView` para que con el teclado abierto —o con el tamaño de
//    letra del sistema aumentado— nada quede inalcanzable.
//  - El gradiente queda SOLO en la cabecera de marca; los campos y el
//    botón van sobre superficie clara, con contraste garantizado.
export default function SignInScreen() {
  const theme = useGerasTheme();
  const { height } = useWindowDimensions();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFormVisible, setEmailFormVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");

  // Mismo caso que en mobile-familia: Clerk puede responder
  // `needs_second_factor` y mandar un código al correo según el riesgo
  // del intento. Sin esta rama, la contraseña correcta terminaba en
  // "No pudimos completar el inicio de sesión" y no había forma de entrar.
  async function onSubmit() {
    if (!isLoaded || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const attempt = await signIn.create({ identifier: email.trim(), password });

      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/");
        return;
      }

      if (attempt.status === "needs_second_factor") {
        const factor = attempt.supportedSecondFactors?.find(
          (f): f is Extract<typeof f, { strategy: "email_code" }> => f.strategy === "email_code"
        );
        if (factor) {
          await signIn.prepareSecondFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
          });
          setCodeSentTo(factor.safeIdentifier);
          return;
        }
      }

      setError("No pudimos completar el inicio de sesión. Intenta nuevamente.");
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitCode() {
    if (!isLoaded || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const attempt = await signIn.attemptSecondFactor({ strategy: "email_code", code: code.trim() });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/");
        return;
      }
      setError("No pudimos completar el inicio de sesión. Intenta nuevamente.");
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.textPrimary,
    backgroundColor: theme.surface,
  } as const;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* El hero ocupa el 42% del alto de la pantalla y la tarjeta de
          ingreso se monta sobre su borde inferior. */}
      <HeroHeader
        minHeight={Math.round(height * 0.42)}
        paddingTop={56}
        overlapBy={56}
        overlap={
          <Card emphasis="lifted">
            <View style={{ gap: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: "700", color: theme.textPrimary }}>Inicia sesión</Text>

              {error ? (
                <View style={{ borderRadius: 12, backgroundColor: theme.errorSoft, padding: 16 }}>
                  <Text style={{ fontSize: 15, color: theme.error }}>{error}</Text>
                </View>
              ) : null}

              <View style={{ gap: 8 }}>
                <GoogleSignInButton onError={setError} disabled={submitting} />
                <Text style={{ textAlign: "center", fontSize: 14, color: theme.textSecondary }}>
                  La forma más rápida. No necesitas recordar una contraseña.
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ height: 1, flex: 1, backgroundColor: theme.borderSoft }} />
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>o</Text>
                <View style={{ height: 1, flex: 1, backgroundColor: theme.borderSoft }} />
              </View>

              {codeSentTo ? (
                <View style={{ gap: 16 }}>
                  <Text style={{ fontSize: 15, color: theme.textSecondary }}>
                    Por seguridad te enviamos un código a {codeSentTo}. Escríbelo para terminar de entrar.
                  </Text>
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textPrimary }}>
                      Código de 6 dígitos
                    </Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="123456"
                      placeholderTextColor={theme.textDisabled}
                      keyboardType="number-pad"
                      autoComplete="one-time-code"
                      autoFocus
                      value={code}
                      onChangeText={setCode}
                      accessibilityLabel="Código de verificación"
                    />
                  </View>
                  <PrimaryButton
                    label="Confirmar código"
                    onPress={onSubmitCode}
                    loading={submitting}
                    disabled={!code}
                    fullWidth
                  />
                </View>
              ) : emailFormVisible ? (
                <View style={{ gap: 16 }}>
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textPrimary }}>
                      Correo electrónico
                    </Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="tucorreo@ejemplo.com"
                      placeholderTextColor={theme.textDisabled}
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      autoFocus
                      value={email}
                      onChangeText={setEmail}
                      accessibilityLabel="Correo electrónico"
                    />
                  </View>

                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textPrimary }}>Contraseña</Text>
                    <View style={{ position: "relative", justifyContent: "center" }}>
                      <TextInput
                        style={[inputStyle, { paddingRight: 52 }]}
                        placeholder="Tu contraseña"
                        placeholderTextColor={theme.textDisabled}
                        secureTextEntry={!showPassword}
                        autoComplete="password"
                        value={password}
                        onChangeText={setPassword}
                        accessibilityLabel="Contraseña"
                      />
                      <Pressable
                        onPress={() => setShowPassword((visible) => !visible)}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={showPassword ? "Ocultar la contraseña" : "Mostrar la contraseña"}
                        style={{ position: "absolute", right: 14, height: 44, width: 32, alignItems: "center", justifyContent: "center" }}
                      >
                        <Ionicons
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color={theme.textSecondary}
                        />
                      </Pressable>
                    </View>
                  </View>

                  <PrimaryButton
                    label="Ingresar"
                    onPress={onSubmit}
                    loading={submitting}
                    disabled={!email || !password}
                    fullWidth
                  />
                </View>
              ) : (
                <SecondaryButton
                  label="Ingresar con correo"
                  onPress={() => setEmailFormVisible(true)}
                  fullWidth
                  icon={({ color, size }) => <Ionicons name="mail-outline" size={size} color={color} />}
                />
              )}

              <View style={{ gap: 14, alignItems: "center", paddingTop: 4 }}>
                <Link href="/sign-up" style={{ fontSize: 15, fontWeight: "600", color: theme.primaryDark }}>
                  Crear cuenta
                </Link>
                <Link href="/forgot-password" style={{ fontSize: 15, color: theme.textSecondary }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </View>
            </View>
          </Card>
        }
      >
        <View style={{ alignItems: "center", gap: 14 }}>
          <GerasBrand variant="horizontal" tone="light" size="lg" showTagline={false} />
          <Text style={{ fontSize: 22, fontWeight: "700", color: theme.white, textAlign: "center" }}>
            Geras Profesional
          </Text>
          <Text style={{ textAlign: "center", fontSize: 15, color: theme.white, opacity: 0.9, paddingHorizontal: 8 }}>
            Gestiona tu agenda, recibe solicitudes y llega a más familias que necesitan tu trabajo.
          </Text>
        </View>
      </HeroHeader>

      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <HelpBanner
          title="¿Necesitas ayuda?"
          message="Si no puedes ingresar o todavía no completaste tu registro, escríbenos a contacto@solucionesmayores.cl."
          icon="help-buoy-outline"
        />
        <BrandFooter message="Una iniciativa de Soluciones Mayores" />
      </View>
    </ScrollView>
  );
}
