import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ResponsiveScreen, useResponsiveStyles } from '@/assets_shared';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const STYLE_DEF = {
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
} as const;

export default function ModalScreen() {
  const styles = useResponsiveStyles(STYLE_DEF);

  return (
    <ResponsiveScreen>
      <ThemedView style={styles.container}>
        <ThemedText type="title">This is a modal</ThemedText>
        <Link href="/" dismissTo style={styles.link}>
          <ThemedText type="link">Go to home screen</ThemedText>
        </Link>
      </ThemedView>
    </ResponsiveScreen>
  );
}
