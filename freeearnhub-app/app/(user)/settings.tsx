import { Stack, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { RefreshCw, UserRound, Wallet } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";
import { useAuth } from "@/store/auth-store";

type SettingsResp = {
  profile: {
    name: string | null;
    email: string;
    mobile: string | null;
    timezone: string | null;
  };
  withdrawals: {
    defaultUpiId: string | null;
    defaultUpiName: string | null;
    emergencyRemaining: number;
  };
};

export default function UserSettingsScreen() {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<SettingsResp | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [upiId, setUpiId] = useState("");
  const [upiName, setUpiName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const resp = await api.get<SettingsResp>("/api/v2/users/me/settings");
      setData(resp.data);
      setName(resp.data.profile.name || user?.name || "");
      setMobile(resp.data.profile.mobile || user?.mobile || "");
      setUpiId(resp.data.withdrawals.defaultUpiId || "");
      setUpiName(resp.data.withdrawals.defaultUpiName || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [user?.mobile, user?.name]);

  useEffect(() => {
    load();
  }, [load]);

  const canSave = useMemo(() => {
    if (!data) return false;
    return (
      name.trim() !== (data.profile.name || "") ||
      mobile.trim() !== (data.profile.mobile || "") ||
      upiId.trim() !== (data.withdrawals.defaultUpiId || "") ||
      upiName.trim() !== (data.withdrawals.defaultUpiName || "")
    );
  }, [data, name, mobile, upiId, upiName]);

  const onSave = async () => {
    if (!canSave) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const resp = await api.post("/api/v2/users/me/settings", {
        profile: {
          name: name.trim() || null,
          mobile: mobile.trim() || null,
        },
        withdrawals: {
          defaultUpiId: upiId.trim() || null,
          defaultUpiName: upiName.trim() || null,
        },
      });
      setMsg((resp.data as { message?: string })?.message || "Saved");
      await refreshProfile();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.sub}>Update your payout defaults</Text>
          </View>
          <Pressable onPress={load} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <RefreshCw color={colors.text} size={18} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {msg ? <Text style={styles.muted}>{msg}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.iconWrap}>
              <UserRound color={colors.accent} size={16} />
            </View>
            <Text style={styles.sectionTitle}>Account</Text>
          </View>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <TextInput
            value={mobile}
            onChangeText={setMobile}
            placeholder="Mobile (optional)"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            keyboardType="phone-pad"
          />

          <Text style={styles.hint}>
            Email is fixed: {data?.profile?.email || user?.email}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.iconWrap}>
              <Wallet color={colors.accent} size={16} />
            </View>
            <Text style={styles.sectionTitle}>Payout Details</Text>
          </View>

          <TextInput
            value={upiId}
            onChangeText={setUpiId}
            placeholder="UPI ID / number"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <TextInput
            value={upiName}
            onChangeText={setUpiName}
            placeholder="UPI name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.hint}>
            Emergency withdrawals remaining this month: {data?.withdrawals?.emergencyRemaining ?? "--"}
          </Text>
        </View>

        <Pressable
          onPress={onSave}
          disabled={!canSave || busy}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, (!canSave || busy) && styles.disabled]}
        >
          <Text style={styles.saveText}>{busy ? "Saving..." : "Save Changes"}</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { height: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  backText: { color: colors.textMuted, fontWeight: "900", fontSize: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },
  sub: { color: colors.textMuted, fontWeight: "700", marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  iconWrap: { width: 32, height: 32, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: colors.text, fontWeight: "900" },
  input: { height: 46, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", paddingHorizontal: 12, color: colors.text, fontWeight: "700" },
  hint: { color: colors.textMuted, fontWeight: "600", fontSize: 12, lineHeight: 18 },
  saveBtn: { height: 48, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.5 },
  saveText: { color: "#09101F", fontWeight: "900", fontSize: 14 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});
