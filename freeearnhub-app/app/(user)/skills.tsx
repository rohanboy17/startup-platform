import { Stack, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { RefreshCw } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type SkillsResp = { skills: { slug: string; label: string }[] };

function splitSkills(input: string) {
  return input
    .split(/[,\n]/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export default function UserSkillsScreen() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [input, setInput] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const resp = await api.get<SkillsResp>("/api/v2/users/me/skills");
      setInput((resp.data.skills || []).map((s) => s.label).join(", "));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load skills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const parsed = useMemo(() => splitSkills(input), [input]);

  const onSave = async () => {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const resp = await api.put("/api/v2/users/me/skills", { skills: parsed });
      setMsg((resp.data as { message?: string })?.message || "Saved");
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
            <Text style={styles.title}>Skills</Text>
            <Text style={styles.sub}>Help businesses match you faster</Text>
          </View>
          <Pressable onPress={load} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <RefreshCw color={colors.text} size={18} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {msg ? <Text style={styles.muted}>{msg}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your skills</Text>
          <Text style={styles.hint}>Use commas. Example: data entry, field survey, social media</Text>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type skills..."
            placeholderTextColor={colors.textMuted}
            style={styles.textArea}
            multiline
          />
          <View style={styles.tags}>
            {parsed.slice(0, 10).map((s) => (
              <View key={s} style={styles.tag}>
                <Text style={styles.tagText} numberOfLines={1}>
                  {s}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable onPress={onSave} disabled={busy} style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, busy && styles.disabled]}>
          <Text style={styles.saveText}>{busy ? "Saving..." : "Save Skills"}</Text>
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
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  sectionTitle: { color: colors.text, fontWeight: "900" },
  hint: { color: colors.textMuted, fontWeight: "600", fontSize: 12, lineHeight: 18 },
  textArea: { minHeight: 110, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontWeight: "700" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  tag: { maxWidth: "48%", paddingHorizontal: 10, height: 30, borderRadius: 999, borderWidth: 1, borderColor: "rgba(124,58,237,0.35)", backgroundColor: "rgba(124,58,237,0.16)", alignItems: "center", justifyContent: "center" },
  tagText: { color: colors.text, fontWeight: "900", fontSize: 12 },
  saveBtn: { height: 48, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.5 },
  saveText: { color: "#09101F", fontWeight: "900", fontSize: 14 },
});
