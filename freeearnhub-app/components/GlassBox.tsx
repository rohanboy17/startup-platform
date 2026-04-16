import { BlurView } from 'expo-blur';
import { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';

export function GlassBox({ children }: PropsWithChildren) {
  return (
    <BlurView intensity={40} tint="dark" style={styles.glass}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    padding: 16,
  },
});
