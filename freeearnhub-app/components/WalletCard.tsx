import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

export function WalletCard({
  balance,
  earned,
  withdrawn,
  pendingWithdrawal,
}: {
  balance: number;
  earned: number;
  withdrawn: number;
  pendingWithdrawal: number;
}) {
  return (
    <LinearGradient colors={["#2C73FF", "#6D55FF"]} style={styles.card}>
      <Text style={styles.label}>Wallet Balance</Text>
      <Text style={styles.balance}>Rs {Number(balance || 0).toFixed(2)}</Text>
      <View style={styles.row}>
        <View style={styles.mini}>
          <Text style={styles.miniLabel}>Earned</Text>
          <Text style={styles.miniValue}>Rs {Number(earned || 0).toFixed(0)}</Text>
        </View>
        <View style={styles.mini}>
          <Text style={styles.miniLabel}>Withdrawn</Text>
          <Text style={styles.miniValue}>Rs {Number(withdrawn || 0).toFixed(0)}</Text>
        </View>
        <View style={styles.mini}>
          <Text style={styles.miniLabel}>Pending</Text>
          <Text style={styles.miniValue}>Rs {Number(pendingWithdrawal || 0).toFixed(0)}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 18, gap: 10, overflow: "hidden" },
  label: { color: "#E9EDFF", fontWeight: "700" },
  balance: { color: "#FFFFFF", fontSize: 36, fontWeight: "900" },
  row: { flexDirection: "row", gap: 10 },
  mini: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", backgroundColor: "rgba(12,19,40,0.35)", padding: 10, gap: 4 },
  miniLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "800" },
  miniValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
});
