import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, BottomNavigationBar } from '@/assets_shared';

export default function CometView() {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0d1f48', '#081432', '#060e28']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.content}>
          <AppText variant="emphasis" style={styles.title}>
            혜성관측소
          </AppText>
          <AppText style={styles.subtitle}>준비 중입니다.</AppText>
        </View>
      </SafeAreaView>
      <BottomNavigationBar activeTab="comet" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#06101f',
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 120,
    gap: 8,
  },
  title: {
    fontSize: 22,
  },
  subtitle: {
    opacity: 0.65,
  },
});
