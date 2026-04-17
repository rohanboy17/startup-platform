import { Stack, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, Info, RefreshCw, ShieldAlert } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type: string;
};

type NotificationsResp = {
  unreadCount: number;
  totalCount: number;
  typeCounts: { success: number; warning: number; info: number };
  notifications: NotificationRow[];
};

function typeIcon(type: string) {
  if (type === "SUCCESS") return <CheckCircle2 color={colors.success} size={16} />;
  if (type === "WARNING") return <ShieldAlert color={colors.warning} size={16} />;
  return <Info color={colors.accentAlt} size={16} />;
}

export default function UserNotificationsScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<NotificationsResp | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<NotificationsResp>("/api/v2/users/me/notifications");
      setData(resp.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const headline = useMemo(() => {
    if (!data) return "";
    if (data.unreadCount > 0) return `${data.unreadCount} unread update${data.unreadCount === 1 ? "" : "s"}`;
    return "All caught up";
  }, [data]);

  return (
    <ScreenShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.sub}>{headline}</Text>
          </View>
          <Pressable onPress={load} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <RefreshCw color={colors.text} size={18} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{data?.typeCounts?.success ?? 0}</Text>
            <Text style={styles.metricLabel}>Success</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{data?.typeCounts?.warning ?? 0}</Text>
            <Text style={styles.metricLabel}>Warnings</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{data?.typeCounts?.info ?? 0}</Text>
            <Text style={styles.metricLabel}>Info</Text>
          </View>
        </View>

        {!loading && !error && (data?.notifications?.length ?? 0) === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No updates yet</Text>
            <Text style={styles.emptyText}>Approval and hiring updates will appear here.</Text>
          </View>
        ) : null}

        <View style={styles.list}>
          {(data?.notifications ?? []).map((n) => (
            <View key={n.id} style={[styles.card, !n.isRead && styles.cardUnread]}>
              <View style={styles.cardTop}>
                <View style={styles.iconWrap}>{typeIcon(n.type)}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {n.title}
                  </Text>
                  <Text style={styles.cardMsg} numberOfLines={2}>
                    {n.message}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>{new Date(n.createdAt).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { height: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  backText: { color: colors.textMuted, fontWeight: "900", fontSize: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },
  sub: { color: colors.textMuted, fontWeight: "700", marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  metricsRow: { flexDirection: "row", gap: 10 },
  metric: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 12, gap: 6 },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: "900" },
  metricLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  empty: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 16, gap: 10 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  emptyText: { color: colors.textMuted, fontWeight: "700", lineHeight: 18 },
  list: { gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  cardUnread: { borderColor: "rgba(124,58,237,0.40)", backgroundColor: "rgba(124,58,237,0.10)" },
  cardTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  iconWrap: { width: 34, height: 34, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.text, fontWeight: "900" },
  cardMsg: { color: colors.textMuted, fontWeight: "700", marginTop: 6, lineHeight: 18, fontSize: 12 },
  cardMeta: { color: colors.textMuted, fontWeight: "700", fontSize: 11 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});
