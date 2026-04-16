import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { ScreenShell } from "@/components/ScreenShell";
import { colors } from "@/lib/theme";

export default function WalletScreen() {
  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Wallet</Text>
        <Card>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balance}>Rs 520</Text>
        </Card>

        <Card>
          <Text style={styles.section}>Transactions</Text>
          <View style={styles.itemRow}>
            <Text style={styles.credit}>+ Rs 220</Text>
            <Text style={styles.meta}>Task payout</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={styles.debit}>- Rs 100</Text>
            <Text style={styles.meta}>Withdrawal</Text>
          </View>
        </Card>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  balanceLabel: { color: colors.textMuted },
  balance: { color: colors.text, fontSize: 34, fontWeight: '800', marginTop: 8 },
  section: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  itemRow: { gap: 4, marginTop: 10 },
  credit: { color: colors.success, fontSize: 16, fontWeight: '700' },
  debit: { color: colors.danger, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.textMuted },
});
