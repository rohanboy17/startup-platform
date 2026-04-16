import { Link, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { Mail, ShieldCheck } from "lucide-react-native";

import { Button } from "@/components/Button";
import { GlassBox } from "@/components/GlassBox";
import { ScreenShell } from "@/components/ScreenShell";
import { colors } from "@/lib/theme";
import { useAuth } from "@/store/auth-store";

export default function LoginScreen() {
  const { login, isBusy } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onLogin() {
    setError("");
    try {
      await login(identifier, password);
      router.replace("/(tabs)/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.screen}
      >
        <Text style={styles.brand}>FreeEarnHub</Text>
        <Text style={styles.subtitle}>Verified work, local hiring, one flow.</Text>
        <GlassBox>
          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <Mail color={colors.textMuted} size={18} />
              <TextInput
                placeholder="Email or mobile"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={identifier}
                autoCapitalize="none"
                onChangeText={setIdentifier}
              />
            </View>
            <View style={styles.inputWrap}>
              <ShieldCheck color={colors.textMuted} size={18} />
              <TextInput
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
            <Button title={isBusy ? "Signing in..." : "Login"} onPress={onLogin} />
            {isBusy ? <ActivityIndicator color={colors.accent} size="small" /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Link href="/(auth)/register" style={styles.link}>
              Create account
            </Link>
          </View>
        </GlassBox>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  brand: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  form: { gap: 12 },
  inputWrap: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#27334B",
    paddingHorizontal: 12,
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#111726",
  },
  input: {
    flex: 1,
    height: "100%",
    color: colors.text,
    fontSize: 15,
  },
  link: {
    color: colors.accent,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  error: {
    color: "#FF7A9A",
    fontSize: 13,
    textAlign: "center",
  },
});
