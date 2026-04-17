import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RefreshCw, Wallet } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type BusinessOverview = {
  kycStatus: string;
  wallet: { balance: number; totalFunded: number; totalSpent: number; totalRefund: number };
  lowBalance: boolean;
  lowBalanceThreshold: number;
  lockedBudget: number;
};

export default function BusinessWalletScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BusinessOverview | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<BusinessOverview>("/api/v2/business/overview");
      setData(resp.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.left}>
            <Wallet color={colors.accent} size={18} />
            <Text style={styles.title}>Wallet</Text>
          </View>
          <Pressable onPress={load} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <RefreshCw color={colors.text} size={18} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Business Balance</Text>
          <Text style={styles.amount}>Rs {Number(data?.wallet?.balance ?? 0).toFixed(2)}</Text>
          <Text style={styles.meta}>KYC: {data?.kycStatus || "PENDING"}</Text>
          {data?.lowBalance ? (
            <Text style={styles.warn}>Low balance. Keep at least Rs {Number(data?.lowBalanceThreshold ?? 0).toFixed(0)}.</Text>
          ) : (
            <Text style={styles.ok}>Balance healthy for new work.</Text>
          )}
        </View>

        <View style={styles.row}>
          <View style={styles.mini}>
            <Text style={styles.miniLabel}>Funded</Text>
            <Text style={styles.miniValue}>Rs {Number(data?.wallet?.totalFunded ?? 0).toFixed(0)}</Text>
          </View>
          <View style={styles.mini}>
            <Text style={styles.miniLabel}>Spent</Text>
            <Text style={styles.miniValue}>Rs {Number(data?.wallet?.totalSpent ?? 0).toFixed(0)}</Text>
          </View>
          <View style={styles.mini}>
            <Text style={styles.miniLabel}>Locked</Text>
            <Text style={styles.miniValue}>Rs {Number(data?.lockedBudget ?? 0).toFixed(0)}</Text>
          </View>
        </View>

        <View style={styles.hintCard}>
          <Text style={styles.hintTitle}>Funding</Text>
          <Text style={styles.hintText}>Razorpay funding and invoices are handled on the web dashboard. Mobile is view-first.</Text>
        </View>
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
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 16, gap: 10 },
  cardTitle: { color: colors.textMuted, fontWeight: "900" },
  amount: { color: colors.text, fontSize: 34, fontWeight: "900" },
  meta: { color: colors.textMuted, fontWeight: "700" },
  warn: { color: colors.danger, fontWeight: "800" },
  ok: { color: colors.success, fontWeight: "800" },
  row: { flexDirection: "row", gap: 10 },
  mini: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 12, gap: 6 },
  miniLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  miniValue: { color: colors.text, fontSize: 16, fontWeight: "900" },
  hintCard: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 8 },
  hintTitle: { color: colors.text, fontWeight: "900" },
  hintText: { color: colors.textMuted, fontWeight: "700", lineHeight: 18 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});
