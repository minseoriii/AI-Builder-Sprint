import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  AutoRefreshOnFocus,
  BottomNavigationBar,
  Palette,
  ResponsiveScreen,
  useResponsiveStyles,
  useTabExitConfirm,
} from '@/assets_shared';

const STYLE_DEF = {
  safe: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 120,
    gap: 8,
  },
  title: {
    fontSize: 22,
  },
  subtitle: {},
} as const;

export default function CometView() {
  const styles = useResponsiveStyles(STYLE_DEF);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { ExitConfirmModal } = useTabExitConfirm();

  const handleRefresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const handlePullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      handleRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [handleRefresh]);

  return (
    <AutoRefreshOnFocus onRefresh={handleRefresh}>
      <ResponsiveScreen key={refreshKey} style={{ backgroundColor: '#06101f' }}>
        <LinearGradient
          colors={['#0d1f48', '#081432', '#060e28']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ScrollView
            style={styles.safe}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void handlePullRefresh();
                }}
                tintColor={Palette.cream}
                colors={[Palette.cream]}
              />
            }
          >
            <View>
              <AppText variant="emphasis" style={styles.title}>
                혜성관측소
              </AppText>
              <AppText style={styles.subtitle}>준비 중입니다.</AppText>
            </View>
          </ScrollView>
        </SafeAreaView>
        <BottomNavigationBar activeTab="comet" />
        {ExitConfirmModal}
      </ResponsiveScreen>
    </AutoRefreshOnFocus>
  );
}
