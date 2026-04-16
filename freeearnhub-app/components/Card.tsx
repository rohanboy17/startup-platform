import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/lib/theme';

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: '#1F2A40',
    padding: 16,
  },
});
