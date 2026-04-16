import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { colors } from '@/lib/theme';

type StatCardProps = {
  label: string;
  value: string;
};

export function StatCard({ label, value }: StatCardProps) {
  return (
    <Card>
      <View style={styles.wrap}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
});
