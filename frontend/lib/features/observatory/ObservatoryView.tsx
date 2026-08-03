import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AutoRefreshOnFocus,
  Background,
  BottomNavigationBar,
  BottomNavigationBarDimensions,
  FontFamily,
  Palette,
  ResponsiveScreen,
  bottomNavigationInset,
  showConnectionError,
  useResponsive,
  useTabExitConfirm,
} from '@/assets_shared';
import { getOnboardingStatus } from '@/lib/api/onboarding';

import { AstronomyLabTabs } from './AstronomyLabTabs';
import { AstronomyReportView } from './AstronomyReportView';
import { GalaxyStatisticsView } from './GalaxyStatisticsView';
import type { LabSubTab } from './data';
import { logHandledApiError } from '@/lib/api/logHandledApiError';

/** 천문연구소 화면 (AstronomyLabScreen) */
export default function ObservatoryView() {
  const { width, height } = useWindowDimensions();
  const { scale } = useResponsive();
  const [activeTab, setActiveTab] = useState<LabSubTab>('stats');
  const [refreshKey, setRefreshKey] = useState(0);
  const [northStarText, setNorthStarText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { ExitConfirmModal } = useTabExitConfirm();

  const loadNorthStar = useCallback(async () => {
    try {
      const status = await getOnboardingStatus();
      setNorthStarText(status.north_star?.text?.trim() ?? '');
    } catch (error) {
      logHandledApiError('Observatory north star load error', error);
      showConnectionError({ onRetry: () => void loadNorthStar() });
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
    setActiveTab('stats');
    void loadNorthStar();
  }, [loadNorthStar]);

  const handlePullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      handleRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [handleRefresh]);

  useEffect(() => {
    void loadNorthStar();
  }, [loadNorthStar, refreshKey]);

  const navInset = bottomNavigationInset(
    scale(BottomNavigationBarDimensions.height),
  );

  return (
    <AutoRefreshOnFocus onRefresh={handleRefresh}>
      <ResponsiveScreen key={refreshKey} style={styles.screen}>
        <Background width={width} height={height} />

        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>천문연구소</Text>
          </View>

          <View style={styles.tabsPad}>
            <AstronomyLabTabs activeTab={activeTab} onChange={setActiveTab} />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: navInset + 24 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
            {activeTab === 'stats' ? (
              <GalaxyStatisticsView
                northStarText={northStarText}
                refreshKey={refreshKey}
              />
            ) : (
              <AstronomyReportView
                northStarText={northStarText}
                refreshKey={refreshKey}
              />
            )}
          </ScrollView>
        </SafeAreaView>

        <BottomNavigationBar activeTab="observatory" />
        {ExitConfirmModal}
      </ResponsiveScreen>
    </AutoRefreshOnFocus>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#173F72',
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 38,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: Palette.cream,
  },
  tabsPad: {
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
});
