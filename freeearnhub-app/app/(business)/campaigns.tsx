import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ClipboardList, Plus, RefreshCw } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { BusinessCampaignCard, type BusinessCampaignCardData } from "@/components/BusinessCampaignCard";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type BusinessCampaignsResponse = {
  accessRole: string;
  campaigns: BusinessCampaignCardData[];
};

export default function BusinessCampaignsScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BusinessCampaignsResponse | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<BusinessCampaignsResponse>("/api/v2/business/campaigns");
      setData(resp.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const canCreate = useMemo(() => {
    const role = (data?.accessRole || "").toUpperCase();
    return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
  }, [data?.accessRole]);

  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.left}>
            <ClipboardList color={colors.accent} size={18} />
            <Text style={styles.title}>Campaigns</Text>
          </View>
          <View style={styles.actions}>
            <Pressable onPress={load} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
              <RefreshCw color={colors.text} size={18} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/(business)/create-campaign")}
              style={({ pressed }) => [styles.iconBtnPrimary, pressed && styles.pressed, !canCreate && styles.disabledBtn]}
              disabled={!canCreate}
            >
              <Plus color="#09101F" size={18} />
            </Pressable>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}

        {!loading && !error && (data?.campaigns?.length ?? 0) === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No campaigns yet</Text>
            <Text style={styles.emptyText}>Create a campaign to start moderated submissions.</Text>
            <Pressable
              onPress={() => router.push("/(business)/create-campaign")}
              style={({ pressed }) => [styles.cta, pressed && styles.pressed, !canCreate && styles.disabledBtn]}
              disabled={!canCreate}
            >
              <Text style={styles.ctaText}>Create Campaign</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.list}>
          {(data?.campaigns ?? []).map((campaign) => (
            <BusinessCampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </View>

        {!canCreate ? (
          <Text style={styles.hint}>Your team role does not allow creating campaigns on mobile.</Text>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  iconBtnPrimary: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  disabledBtn: { opacity: 0.45 },
  list: { gap: 12 },
  empty: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 16, gap: 10 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  emptyText: { color: colors.textMuted, fontWeight: "700", lineHeight: 18 },
  cta: { height: 44, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", marginTop: 4 },
  ctaText: { color: "#09101F", fontWeight: "900" },
  hint: { color: colors.textMuted, fontWeight: "700", lineHeight: 18 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});
