import { router } from "expo-router";
import { Search } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { TaskCard, TaskCardData } from "@/components/TaskCard";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type CampaignRow = {
  id: string;
  title: string;
  description: string;
  taskCategory: string;
  taskType: string;
  netRewardPerTask: number;
  leftSubmissions: number;
  blockedBySubmissionMode: boolean;
  blockedByRepeatRule: boolean;
  isAvailable?: boolean;
};

type CampaignList = { campaigns: CampaignRow[] };

export default function UserWorkScreen() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<CampaignList>("/api/v2/campaigns");
      setRows(resp.data.campaigns || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((c) => (!q ? true : `${c.title} ${c.description}`.toLowerCase().includes(q)))
      .map<TaskCardData>((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        taskCategory: c.taskCategory,
        taskType: c.taskType,
        rewardNet: Number(c.netRewardPerTask || 0),
        leftSlots: c.leftSubmissions ?? 0,
        blocked: Boolean(c.blockedBySubmissionMode || c.blockedByRepeatRule),
      }));
  }, [query, rows]);

  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Text style={styles.title}>Work</Text>
          <Pressable onPress={load} style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}>
            <Text style={styles.refreshText}>{loading ? "..." : "Refresh"}</Text>
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Search color={colors.textMuted} size={18} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tasks"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}
        {!loading && cards.length === 0 ? <Text style={styles.muted}>No campaigns available.</Text> : null}

        <View style={styles.list}>
          {cards.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() =>
                router.push({
                  pathname: "/(user)/task/[id]",
                  params: { id: task.id },
                })
              }
            />
          ))}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 28 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { color: colors.text, fontSize: 22, fontWeight: "900" },
  refresh: { height: 34, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  refreshText: { color: colors.textMuted, fontWeight: "900", fontSize: 12 },
  searchWrap: { height: 48, borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  searchInput: { flex: 1, height: "100%", color: colors.text, fontSize: 15, fontWeight: "600" },
  error: { color: colors.danger, fontWeight: "800", marginBottom: 10 },
  muted: { color: colors.textMuted, fontWeight: "700", marginBottom: 10 },
  list: { gap: 12 },
});
