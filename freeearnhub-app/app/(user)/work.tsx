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
};

type CampaignList = { campaigns: CampaignRow[] };

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skelTop}>
        <View style={styles.skelIcon} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={styles.skelLine} />
          <View style={[styles.skelLine, { width: "70%" }]} />
        </View>
        <View style={[styles.skelLine, { width: 64, height: 22, borderRadius: 10 }]} />
      </View>
      <View style={styles.skelBottom}>
        <View style={[styles.skelPill, { width: 88 }]} />
        <View style={[styles.skelPill, { width: 110 }]} />
        <View style={[styles.skelPill, { width: 58, marginLeft: "auto" }]} />
      </View>
    </View>
  );
}

export default function UserWorkScreen() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

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

  const categoryChips = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.taskCategory || "Other"));
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, 12)];
  }, [rows]);

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((c) => (selectedCategory === "All" ? true : c.taskCategory === selectedCategory))
      .filter((c) => (!q ? true : `${c.title} ${c.description} ${c.taskCategory} ${c.taskType}`.toLowerCase().includes(q)))
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
  }, [query, rows, selectedCategory]);

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {categoryChips.map((label) => (
            <Chip
              key={label}
              label={label}
              active={label === selectedCategory}
              onPress={() => setSelectedCategory(label)}
            />
          ))}
        </ScrollView>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.list}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <>
            {!error && cards.length === 0 ? <Text style={styles.muted}>No campaigns available.</Text> : null}
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
          </>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.text, fontSize: 22, fontWeight: "900" },
  refresh: { height: 34, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#22304A", backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  refreshText: { color: colors.textMuted, fontWeight: "900", fontSize: 12 },
  searchWrap: { height: 48, borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: colors.card, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, height: "100%", color: colors.text, fontSize: 15, fontWeight: "600" },

  chipsRow: { gap: 10, paddingVertical: 4 },
  chip: { height: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", alignItems: "center", justifyContent: "center" },
  chipActive: { borderColor: "rgba(124,58,237,0.55)", backgroundColor: "rgba(124,58,237,0.18)" },
  chipText: { color: colors.textMuted, fontWeight: "800", fontSize: 12 },
  chipTextActive: { color: colors.text, fontWeight: "900" },

  list: { gap: 12 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },

  skeletonCard: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: colors.card, padding: 14, gap: 12 },
  skelTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  skelIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#0F1626", borderWidth: 1, borderColor: "#22304A" },
  skelLine: { height: 12, borderRadius: 8, backgroundColor: "#0F1626", borderWidth: 1, borderColor: "#22304A" },
  skelBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  skelPill: { height: 28, borderRadius: 999, backgroundColor: "#0F1626", borderWidth: 1, borderColor: "#22304A" },
});

