import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { WalletCard } from "@/components/WalletCard";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type WalletResp = {
  balance: number;
  totals: { earned: number; withdrawn: number; pendingWithdrawal: number };
  transactions: { id: string; note: string | null; createdAt: string; type: "CREDIT" | "DEBIT"; amount: number }[];
};

export default function UserWalletScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WalletResp | null>(null);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [upiName, setUpiName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<WalletResp>("/api/v2/users/me/wallet");
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

  const onWithdraw = async () => {
    setBusy(true);
    setMsg("");
    try {
      const resp = await api.post("/api/wallet/withdraw", {
        amount: Number(amount),
        upiId,
        upiName,
      });
      setMsg((resp.data as { message?: string })?.message || "Withdrawal requested");
      setAmount("");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Withdrawal failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Wallet</Text>

        <WalletCard
          balance={data?.balance ?? 0}
          earned={data?.totals?.earned ?? 0}
          withdrawn={data?.totals?.withdrawn ?? 0}
          pendingWithdrawal={data?.totals?.pendingWithdrawal ?? 0}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Withdraw</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="Amount"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            value={upiId}
            onChangeText={setUpiId}
            placeholder="UPI ID/Number"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <TextInput
            value={upiName}
            onChangeText={setUpiName}
            placeholder="UPI Name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Pressable onPress={onWithdraw} disabled={busy} style={({ pressed }) => [styles.btn, pressed && styles.pressed, busy && styles.disabled]}>
            <Text style={styles.btnText}>{busy ? "Submitting..." : "Request Withdrawal"}</Text>
          </Pressable>
          {msg ? <Text style={styles.muted}>{msg}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {(data?.transactions ?? []).map((t) => (
            <View key={t.id} style={styles.txRow}>
              <Text style={[styles.txAmt, t.type === "CREDIT" ? styles.txCredit : styles.txDebit]}>
                {t.type === "CREDIT" ? "+" : "-"}Rs {t.amount.toFixed(2)}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.txNote} numberOfLines={1}>
                  {t.note || "Transaction"}
                </Text>
                <Text style={styles.txMeta}>{new Date(t.createdAt).toLocaleString()}</Text>
              </View>
            </View>
          ))}
          {!loading && (data?.transactions?.length ?? 0) === 0 ? <Text style={styles.muted}>No transactions.</Text> : null}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  title: { color: colors.text, fontSize: 22, fontWeight: "900" },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  sectionTitle: { color: colors.text, fontWeight: "900" },
  input: { height: 46, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", paddingHorizontal: 12, color: colors.text, fontWeight: "700" },
  btn: { height: 46, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.6 },
  btnText: { color: "#09101F", fontWeight: "900", fontSize: 14 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
  txRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#22304A" },
  txAmt: { width: 96, fontWeight: "900" },
  txCredit: { color: colors.success },
  txDebit: { color: colors.danger },
  txNote: { color: colors.text, fontWeight: "800", fontSize: 12 },
  txMeta: { color: colors.textMuted, fontWeight: "700", fontSize: 11, marginTop: 4 },
});
