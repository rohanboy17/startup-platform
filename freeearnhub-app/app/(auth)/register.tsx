import { Link, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Building2, UserRound } from "lucide-react-native";

import { Button } from "@/components/Button";
import { GlassBox } from "@/components/GlassBox";
import { ScreenShell } from "@/components/ScreenShell";
import { colors } from "@/lib/theme";
import { useAuth } from "@/store/auth-store";

export default function RegisterScreen() {
  const { register, isBusy } = useAuth();
  const [role, setRole] = useState<"USER" | "BUSINESS">("USER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");

  async function onRegister() {
    setError("");
    try {
      await register({
        name,
        email,
        mobile,
        password,
        role,
        referralCode: referralCode || undefined,
      });
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create account");
    }
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={styles.screen}>
        <Text style={styles.brand}>Create account</Text>
        <GlassBox>
          <View style={styles.form}>
            <View style={styles.roleRow}>
              <Pressable
                onPress={() => setRole("USER")}
                style={[styles.roleBtn, role === "USER" && styles.roleBtnActive]}
              >
                <UserRound color={role === "USER" ? "#09101F" : colors.textMuted} size={16} />
                <Text style={[styles.roleText, role === "USER" && styles.roleTextActive]}>User</Text>
              </Pressable>
              <Pressable
                onPress={() => setRole("BUSINESS")}
                style={[styles.roleBtn, role === "BUSINESS" && styles.roleBtnActive]}
              >
                <Building2 color={role === "BUSINESS" ? "#09101F" : colors.textMuted} size={16} />
                <Text style={[styles.roleText, role === "BUSINESS" && styles.roleTextActive]}>Business</Text>
              </Pressable>
            </View>

            <TextInput placeholder="Name" placeholderTextColor={colors.textMuted} style={styles.input} value={name} onChangeText={setName} />
            <TextInput
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={email}
              autoCapitalize="none"
              onChangeText={setEmail}
            />
            <TextInput
              placeholder="Mobile (+91...)"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={mobile}
              onChangeText={setMobile}
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {role === "USER" ? (
              <TextInput
                placeholder="Referral code (optional)"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={referralCode}
                onChangeText={setReferralCode}
              />
            ) : null}
            <Button title={isBusy ? "Creating..." : "Create Account"} onPress={onRegister} />
            {isBusy ? <ActivityIndicator color={colors.accent} size="small" /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Link href="/(auth)/login" style={styles.link}>
              Back to login
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
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 18,
  },
  form: { gap: 12 },
  roleRow: {
    flexDirection: "row",
    gap: 10,
  },
  roleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A344B",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#111726",
  },
  roleBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  roleText: {
    color: colors.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },
  roleTextActive: {
    color: "#09101F",
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#27334B",
    paddingHorizontal: 14,
    color: colors.text,
    backgroundColor: "#111726",
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
