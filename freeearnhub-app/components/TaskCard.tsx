import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors } from '@/lib/theme';

type TaskCardProps = {
  title: string;
  reward: string;
  tag: string;
};

export function TaskCard({ title, reward, tag }: TaskCardProps) {
  return (
    <Card>
      <View style={styles.row}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.tag}>{tag}</Text>
        </View>
        <Text style={styles.reward}>{reward}</Text>
      </View>
      <View style={styles.action}>
        <Button title="Start" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  tag: {
    marginTop: 6,
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  reward: {
    color: '#67F1B7',
    fontSize: 18,
    fontWeight: '700',
  },
  action: {
    marginTop: 14,
  },
});
