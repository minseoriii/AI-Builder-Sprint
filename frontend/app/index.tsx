import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import {
  AppText,
  Background,
  BottomNavigationBar,
  ClusterIcon,
  Colors,
  FontFamily,
  ImageAssets,
  Palette,
  ResponsiveScreen,
  ScreenContainer,
  ScreenLayout,
  ValueQuote,
  createResponsiveStylesContext,
  showConnectionError,
  useAutoRefreshOnFocus,
  useResponsive,
  useTabExitConfirm,
  withOpacity,
} from '@/assets_shared';
import type { ClusterIndex } from '@/assets_shared';
import { getOnboardingStatus } from '@/lib/api/onboarding';
import { logHandledApiError } from '@/lib/api/logHandledApiError';

// ─── Types ─────────────────────────────────────────────────────────────────

interface HomeCluster {
  /** 온보딩 선택 순서 1~5 → ic_cluster1~5 */
  index: ClusterIndex;
  label: string;
}

// ─── Helper: Date ──────────────────────────────────────────────────────────

function getDateInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[now.getDay()];
  const seasons = [
    [12, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [9, 10, 11],
  ];
  const seasonNames = ['겨울', '봄', '여름', '가을'];
  let season = '봄';
  for (let i = 0; i < seasons.length; i++) {
    if (seasons[i].includes(month)) {
      season = seasonNames[i];
      break;
    }
  }
  return { year, month, day, weekday, season };
}

function categoriesToClusters(categories: string[]): HomeCluster[] {
  return categories.slice(0, 5).map((label, i) => ({
    index: ((i % 5) + 1) as ClusterIndex,
    label,
  }));
}

// ─── Cluster orbit item ────────────────────────────────────────────────────

function ClusterOrbitItem({
  cluster,
  index,
  total,
  radius,
  centerX,
  centerY,
  onSelect,
  selected,
}: {
  cluster: HomeCluster;
  index: number;
  total: number;
  radius: number;
  centerX: number;
  centerY: number;
  onSelect: () => void;
  selected: boolean;
}) {
  const styles = useStyles();
  const r = useResponsive();
  const angleDeg = -90 + (360 / total) * index;
  const angleRad = (angleDeg * Math.PI) / 180;
  const x = centerX + radius * Math.cos(angleRad);
  const y = centerY + radius * Math.sin(angleRad);
  const itemHalfW = r.scale(48);
  const itemHalfH = r.scale(40);

  return (
    <View
      style={[
        styles.clusterItem,
        {
          left: x - itemHalfW,
          top: y - itemHalfH,
          width: itemHalfW * 2,
        },
      ]}
    >
      <ClusterIcon
        cluster={cluster.index}
        label={cluster.label}
        iconSize={selected ? 56 : 52}
        onPress={onSelect}
        labelStyle={selected ? styles.clusterLabelSelected : undefined}
      />
    </View>
  );
}

// ─── Polaris Modal ──────────────────────────────────────────────────────────

function PolarisModal({
  visible,
  northStarText,
  onClose,
}: {
  visible: boolean;
  northStarText: string;
  onClose: () => void;
}) {
  const styles = useStyles();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalStarWrap}>
            <Image
              source={ImageAssets.ic_polaris}
              style={styles.modalPolaris}
              resizeMode="contain"
            />
          </View>
          <AppText style={styles.modalEyebrow}>나의 북극성 · 가치관</AppText>
          <ValueQuote style={styles.modalQuote} textStyle={styles.modalBody}>
            {northStarText || '아직 북극성이 설정되지 않았어요.'}
          </ValueQuote>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={styles.modalCloseBtn}
          >
            <AppText style={styles.modalCloseText}>닫기</AppText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function Index() {
  return <HomeScreen />;
}

function HomeScreen() {
  const styles = useScreenStyles(HOME_STYLE_DEF);
  const router = useRouter();
  const r = useResponsive();
  const { width, height } = useWindowDimensions();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<ClusterIndex | null>(
    null,
  );
  const [clusters, setClusters] = useState<HomeCluster[]>([]);
  const [northStarText, setNorthStarText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { year, month, day, weekday, season } = getDateInfo();

  const { ExitConfirmModal } = useTabExitConfirm({
    onBeforeExit: () => {
      if (modalOpen) {
        setModalOpen(false);
        return true;
      }
      return false;
    },
  });

  const loadHomeData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const status = await getOnboardingStatus();
      const categories = status.north_star?.selected_categories ?? [];
      setClusters(categoriesToClusters(categories));
      setNorthStarText(status.north_star?.text?.trim() ?? '');
    } catch (error) {
      logHandledApiError('Home onboarding load error', error);
      showConnectionError({ onRetry: () => void loadHomeData(isRefresh) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useAutoRefreshOnFocus(() => loadHomeData(false));

  const maxContentW = r.width;
  const ORBIT_R = Math.max(r.scale(88), Math.min(r.scale(118), maxContentW * 0.3));
  const ORBIT_PAD = Math.max(r.scale(52), Math.min(r.scale(64), maxContentW * 0.15));
  const orbitSize = (ORBIT_R + ORBIT_PAD) * 2;
  const center = ORBIT_R + ORBIT_PAD;

  return (
    <StylesProvider styles={styles}>
      <ResponsiveScreen>
        <StatusBar style="light" />
        <Background width={width} height={height} />

        <ScreenContainer
          withSafeArea
          withTopPadding
          topPadding={ScreenLayout.top}
          withHorizontalPadding
          refreshing={refreshing}
          onRefresh={() => loadHomeData(true)}
          style={styles.screen}
          contentStyle={styles.safe}
        >
          <View style={styles.header}>
            <AppText variant="emphasis" style={styles.title}>
              {year}년 {season}의 은하
            </AppText>
            <AppText style={styles.subtitle}>
              {year}년 {month}월 {day}일 {weekday}요일
            </AppText>
          </View>

          <View style={styles.main}>
            {loading && clusters.length === 0 ? (
              <ActivityIndicator color={Palette.cream} size="large" />
            ) : (
              <>
                <View
                  style={[styles.orbitArea, { width: orbitSize, height: orbitSize }]}
                >
                  <Image
                    source={ImageAssets.home_orbit}
                    style={[
                      styles.homeOrbit,
                      {
                        width: (ORBIT_R * 2 + r.scale(24)) * 1.4,
                        height: (ORBIT_R * 2 + r.scale(24)) * 1.4,
                      },
                    ]}
                    resizeMode="contain"
                  />

                  {clusters.map((c, i) => (
                    <ClusterOrbitItem
                      key={`${c.index}-${c.label}`}
                      cluster={c}
                      index={i}
                      total={Math.max(clusters.length, 1)}
                      radius={ORBIT_R}
                      centerX={center}
                      centerY={center}
                      onSelect={() =>
                        setSelectedCluster((prev) =>
                          prev === c.index ? null : c.index,
                        )
                      }
                      selected={selectedCluster === c.index}
                    />
                  ))}

                  <TouchableOpacity
                    onPress={() => setModalOpen(true)}
                    activeOpacity={0.8}
                    style={styles.polarisBtn}
                    accessibilityLabel="북극성 가치관 보기"
                  >
                    <Image
                      source={ImageAssets.ic_polaris}
                      style={{
                        width: r.scale(86),
                        height: r.scale(86),
                      }}
                      resizeMode="contain"
                    />
                    <AppText style={styles.polarisLabel}>polaris</AppText>
                  </TouchableOpacity>
                </View>

                <ValueQuote
                  style={styles.valueRow}
                  textStyle={styles.valueText}
                  numberOfLines={2}
                >
                  {northStarText || '나의 중심 목표를 설정해 보세요.'}
                </ValueQuote>

                <View style={styles.createWrap}>
                  <Pressable
                    onPress={() => router.push('/star-record')}
                    style={({ pressed }) => [
                      styles.createBtnOuter,
                      pressed && styles.createBtnPressed,
                    ]}
                  >
                    <Image
                      source={ImageAssets.home_btn_makestar}
                      style={styles.createBtnImage}
                      resizeMode="contain"
                    />
                  </Pressable>
                  <AppText style={styles.createLabel}>별 생성하기</AppText>
                </View>
              </>
            )}
          </View>
        </ScreenContainer>

        <BottomNavigationBar activeTab="home" />
        <PolarisModal
          visible={modalOpen}
          northStarText={northStarText}
          onClose={() => setModalOpen(false)}
        />
        {ExitConfirmModal}
      </ResponsiveScreen>
    </StylesProvider>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const HOME_STYLE_DEF = {
  screen: {
    flex: 1,
  },
  safe: {
    flexGrow: 1,
    paddingBottom: 96,
  },
  header: {
    zIndex: 10,
    paddingBottom: 8,
  },
  title: {
    fontFamily: FontFamily.medium,
    fontSize: 26,
    color: Colors.text.emphasis,
    letterSpacing: -0.78,
    lineHeight: 31,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: FontFamily.light,
    fontSize: 13,
    color: Palette.cream,
    letterSpacing: -0.13,
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    zIndex: 10,
    minHeight: 420,
  },
  orbitArea: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  homeOrbit: {
    position: 'absolute',
    alignSelf: 'center',
  },
  clusterItem: {
    position: 'absolute',
    alignItems: 'center',
  },
  clusterLabelSelected: {
    fontFamily: FontFamily.medium,
  },
  polarisBtn: {
    zIndex: 5,
    alignItems: 'center',
    gap: 2,
    padding: 12,
  },
  polarisLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Palette.cream,
    letterSpacing: 0.48,
  },
  valueRow: {
    marginTop: 12,
    paddingHorizontal: ScreenLayout.horizontal,
    maxWidth: '100%',
    alignSelf: 'center',
  },
  valueText: {
    fontSize: 14,
    letterSpacing: -0.14,
  },
  createWrap: {
    marginTop: 32,
    alignItems: 'center',
    gap: 2,
  },
  createBtnOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  createBtnImage: {
    width: 130,
    height: 130,
  },
  createLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Palette.cream,
    letterSpacing: -0.13,
    marginTop: -8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4,10,28,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ScreenLayout.horizontal,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: withOpacity(Palette.cream, 0.3),
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    backgroundColor: '#0f1e3d',
  },
  modalStarWrap: {
    marginBottom: 16,
  },
  modalPolaris: {
    width: 72,
    height: 72,
  },
  modalEyebrow: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Palette.cream,
    letterSpacing: 0.88,
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 18,
    color: Colors.text.emphasis,
    lineHeight: 29,
    letterSpacing: -0.36,
  },
  modalQuote: {
    marginBottom: 28,
  },
  modalCloseBtn: {
    backgroundColor: Colors.button.fill,
    borderWidth: 1,
    borderColor: Colors.button.borderActive,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontFamily: FontFamily.regular,
    color: Colors.text.buttonActive,
    fontSize: 13,
    lineHeight: 13,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
} as const;

const { StylesProvider, useStyles, useScreenStyles } =
  createResponsiveStylesContext<typeof HOME_STYLE_DEF>();
