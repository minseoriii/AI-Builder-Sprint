import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';

// ─── Types ─────────────────────────────────────────────────────────────────

type Tab = 'galaxy' | 'observatory' | 'home' | 'comet' | 'mypage';

interface Cluster {
  id: string;
  label: string;
}

// ─── Data ──────────────────────────────────────────────────────────────────

const CLUSTERS: Cluster[] = [
  { id: 'c1', label: '자유·독립' },
  { id: 'c2', label: '성장·배움' },
  { id: 'c3', label: '관계·사랑' },
  { id: 'c4', label: '모험·도전' },
  { id: 'c5', label: '건강' },
];

const TABS: { id: Tab; label: string }[] = [
  { id: 'galaxy', label: '은하감상' },
  { id: 'observatory', label: '천문연구소' },
  { id: 'home', label: '홈' },
  { id: 'comet', label: '해성관측소' },
  { id: 'mypage', label: '마이페이지' },
];

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

// ─── SVG Icons ─────────────────────────────────────────────────────────────

function StarIcon4({ size = 32, color = '#f5d06a' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Path
        d="M20 2 L22.5 17.5 L38 20 L22.5 22.5 L20 38 L17.5 22.5 L2 20 L17.5 17.5 Z"
        fill={color}
        opacity={0.95}
      />
    </Svg>
  );
}

function StarIconSmall({ size = 20, color = '#6b9fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Path
        d="M20 4 L22 17 L35 20 L22 23 L20 36 L18 23 L5 20 L18 17 Z"
        fill={color}
        opacity={0.9}
      />
    </Svg>
  );
}

function CreateStarIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 40 40" fill="none">
      <Path
        d="M20 6 L22 18 L34 20 L22 22 L20 34 L18 22 L6 20 L18 18 Z"
        fill="#8ab4f8"
        opacity={0.9}
      />
    </Svg>
  );
}

function TabIcon({ id, color }: { id: Tab; color: string }) {
  switch (id) {
    case 'galaxy':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.5} />
          <Ellipse cx="12" cy="12" rx="4" ry="10" stroke={color} strokeWidth={1.5} />
          <Line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth={1.5} />
        </Svg>
      );
    case 'observatory':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'home':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill={color}>
          <Path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </Svg>
      );
    case 'comet':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.5} />
          <Path
            d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'mypage':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={1.5} />
        </Svg>
      );
  }
}

// ─── Twinkle animation helper ──────────────────────────────────────────────

function useTwinkle(delayMs: number, durationMs: number) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(opacity, {
          toValue: 1,
          duration: durationMs / 2,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: durationMs / 2,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [delayMs, durationMs, opacity]);

  return opacity;
}

// ─── Cluster positioned on a circle ────────────────────────────────────────

function ClusterItem({
  label,
  index,
  total,
  radius,
  centerX,
  centerY,
  onSelect,
  selected,
}: {
  label: string;
  index: number;
  total: number;
  radius: number;
  centerX: number;
  centerY: number;
  onSelect: () => void;
  selected: boolean;
}) {
  const angleDeg = -90 + (360 / total) * index;
  const angleRad = (angleDeg * Math.PI) / 180;
  const x = centerX + radius * Math.cos(angleRad);
  const y = centerY + radius * Math.sin(angleRad);
  const twinkleOpacity = useTwinkle(index * 480, 2400);
  const itemHalfW = 40;
  const itemHalfH = 28;

  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.7}
      style={[
        styles.clusterItem,
        {
          left: x - itemHalfW,
          top: y - itemHalfH,
        },
      ]}
    >
      <Animated.View style={{ opacity: twinkleOpacity }}>
        <StarIconSmall
          size={selected ? 24 : 20}
          color={selected ? '#f5d06a' : '#8ab4f8'}
        />
      </Animated.View>
      <Text
        style={[
          styles.clusterLabel,
          selected && styles.clusterLabelSelected,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Background stars ───────────────────────────────────────────────────────

const BG_STARS = [
  { x: 8, y: 12, s: 1.5, d: 0 },
  { x: 85, y: 8, s: 1, d: 1.2 },
  { x: 92, y: 22, s: 1.5, d: 0.6 },
  { x: 15, y: 30, s: 1, d: 2.1 },
  { x: 75, y: 35, s: 1.5, d: 0.3 },
  { x: 5, y: 55, s: 1, d: 1.8 },
  { x: 95, y: 60, s: 1.5, d: 0.9 },
  { x: 20, y: 72, s: 1, d: 1.5 },
  { x: 80, y: 70, s: 1, d: 2.4 },
  { x: 50, y: 5, s: 1.5, d: 0.7 },
  { x: 30, y: 15, s: 1, d: 1.1 },
  { x: 65, y: 18, s: 1, d: 2.0 },
  { x: 10, y: 45, s: 1, d: 1.6 },
  { x: 88, y: 48, s: 1.5, d: 0.4 },
  { x: 40, y: 80, s: 1, d: 1.9 },
  { x: 60, y: 82, s: 1, d: 0.8 },
];

function BgStar({
  x,
  y,
  s,
  d,
  screenW,
  screenH,
}: {
  x: number;
  y: number;
  s: number;
  d: number;
  screenW: number;
  screenH: number;
}) {
  const opacity = useTwinkle(d * 1000, (2 + d) * 1000);

  return (
    <Animated.View
      style={[
        styles.bgStar,
        {
          left: (screenW * x) / 100,
          top: (screenH * y) / 100,
          width: s,
          height: s,
          borderRadius: s / 2,
          opacity,
        },
      ]}
    />
  );
}

function BackgroundStars() {
  const { width: screenW, height: screenH } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {BG_STARS.map((st, i) => (
        <BgStar key={i} {...st} screenW={screenW} screenH={screenH} />
      ))}
    </View>
  );
}

// ─── Polaris Modal ──────────────────────────────────────────────────────────

function PolarisModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCardWrap} onPress={() => {}}>
          <LinearGradient
            colors={['#0f2050', '#0a1635']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalCard}
          >
            <View style={styles.modalStarWrap}>
              <StarIcon4 size={40} color="#f5d06a" />
            </View>
            <Text style={styles.modalEyebrow}>나의 북극성</Text>
            <Text style={styles.modalBody}>
              새로운 시도를{'\n'}두려워하지 말자.
            </Text>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
          </LinearGradient>
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
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const { year, month, day, weekday, season } = getDateInfo();
  const polarisOpacity = useTwinkle(0, 2400);

  // Responsive orbit: scale for narrow phones, cap for large screens
  const maxContentW = Math.min(screenW, 430);
  const ORBIT_R = Math.max(88, Math.min(118, maxContentW * 0.3));
  const ORBIT_PAD = Math.max(52, Math.min(64, maxContentW * 0.15));
  const orbitSize = (ORBIT_R + ORBIT_PAD) * 2;
  const center = ORBIT_R + ORBIT_PAD;

  const handleCreateStar = () => {
    console.log('[Polaris] 별 생성하기 clicked — navigate to star creation flow');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0d1f48', '#081432', '#060e28']}
        locations={[0, 0.45, 1]}
        style={styles.screen}
      >
        <BackgroundStars />

        <SafeAreaView style={styles.safe} edges={['top']}>
          {/* Dev: open onboarding flow */}
          <TouchableOpacity
            style={styles.onboardingTestBtn}
            onPress={() => router.push('/onboarding')}
            activeOpacity={0.7}
          >
            <Text style={styles.onboardingTestBtnText}>온보딩 테스트</Text>
          </TouchableOpacity>

          {/* ── Header ──────────────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {year}년 {season}의 은하
            </Text>
            <Text style={styles.subtitle}>
              {year}년 {month}월 {day}일 {weekday}요일
            </Text>
          </View>

          {/* ── Galaxy View ─────────────────────────────────────────── */}
          <View style={styles.main}>
            <View style={[styles.orbitArea, { width: orbitSize, height: orbitSize }]}>
              {/* Outer orbit ring */}
              <View
                style={[
                  styles.orbitRingOuter,
                  {
                    width: ORBIT_R * 2 + 8,
                    height: ORBIT_R * 2 + 8,
                    borderRadius: ORBIT_R + 4,
                  },
                ]}
              />
              {/* Inner orbit ring */}
              <View
                style={[
                  styles.orbitRingInner,
                  {
                    width: ORBIT_R * 0.55 * 2,
                    height: ORBIT_R * 0.55 * 2,
                    borderRadius: ORBIT_R * 0.55,
                  },
                ]}
              />

              {CLUSTERS.map((c, i) => (
                <ClusterItem
                  key={c.id}
                  label={c.label}
                  index={i}
                  total={CLUSTERS.length}
                  radius={ORBIT_R}
                  centerX={center}
                  centerY={center}
                  onSelect={() =>
                    setSelectedCluster((prev) => (prev === c.id ? null : c.id))
                  }
                  selected={selectedCluster === c.id}
                />
              ))}

              {/* Polaris center button */}
              <TouchableOpacity
                onPress={() => setModalOpen(true)}
                activeOpacity={0.8}
                style={styles.polarisBtn}
              >
                <Animated.View style={{ opacity: polarisOpacity }}>
                  <StarIcon4 size={52} color="#f5d06a" />
                </Animated.View>
                <Text style={styles.polarisLabel}>polaris</Text>
              </TouchableOpacity>
            </View>

            {/* Value sentence */}
            <View style={styles.valueRow}>
              <Text style={styles.valueSpark}>✦</Text>
              <Text style={styles.valueText}>새로운 시도를 두려워하지 말자.</Text>
              <Text style={styles.valueSpark}>✦</Text>
            </View>

            {/* Create Star button */}
            <View style={styles.createWrap}>
              <Pressable
                onPress={handleCreateStar}
                style={({ pressed }) => [
                  styles.createBtnOuter,
                  pressed && styles.createBtnPressed,
                ]}
              >
                <LinearGradient
                  colors={['#1a3a7a', '#0f2255']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.createBtn}
                >
                  <CreateStarIcon />
                </LinearGradient>
              </Pressable>
              <Text style={styles.createLabel}>별 생성하기</Text>
            </View>
          </View>

          {/* ── Bottom Nav ──────────────────────────────────────────── */}
          <SafeAreaView edges={['bottom']} style={styles.navSafe}>
            <View style={styles.nav}>
              {TABS.map((tab) => {
                const isActive = tab.id === activeTab;
                const color = isActive ? '#e8eef8' : 'rgba(122,156,200,0.55)';
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id)}
                    activeOpacity={0.7}
                    style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  >
                    <TabIcon id={tab.id} color={color} />
                    <Text
                      style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SafeAreaView>
        </SafeAreaView>

        <PolarisModal visible={modalOpen} onClose={() => setModalOpen(false)} />
      </LinearGradient>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#06101f',
  },
  screen: {
    flex: 1,
    overflow: 'hidden',
  },
  safe: {
    flex: 1,
  },
  header: {
    zIndex: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  onboardingTestBtn: {
    position: 'absolute',
    top: 8,
    right: 16,
    zIndex: 30,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(200,218,255,0.35)',
    borderRadius: 8,
    backgroundColor: 'rgba(8,20,48,0.75)',
  },
  onboardingTestBtnText: {
    fontSize: 11,
    color: 'rgba(200,218,255,0.85)',
    letterSpacing: -0.1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#e8eef8',
    letterSpacing: -0.78,
    lineHeight: 31,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '300',
    color: 'rgba(122,156,200,0.65)',
    letterSpacing: -0.13,
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    zIndex: 10,
  },
  orbitArea: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  orbitRingOuter: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(107,159,255,0.18)',
  },
  orbitRingInner: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(107,159,255,0.1)',
  },
  clusterItem: {
    position: 'absolute',
    width: 80,
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  clusterLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(200,218,255,0.85)',
    letterSpacing: -0.11,
    textAlign: 'center',
  },
  clusterLabelSelected: {
    color: '#f5d06a',
    textShadowColor: 'rgba(245,208,106,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  polarisBtn: {
    zIndex: 5,
    alignItems: 'center',
    gap: 2,
    padding: 12,
  },
  polarisLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(200,218,255,0.7)',
    letterSpacing: 0.48,
  },
  valueRow: {
    marginTop: 12,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueSpark: {
    color: 'rgba(245,208,106,0.5)',
    fontSize: 12,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '300',
    color: 'rgba(200,218,255,0.65)',
    letterSpacing: -0.14,
  },
  createWrap: {
    marginTop: 32,
    alignItems: 'center',
    gap: 10,
  },
  createBtnOuter: {
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(107,159,255,0.35)',
    shadowColor: 'rgba(107,159,255,0.2)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  createBtnPressed: {
    transform: [{ scale: 0.94 }],
  },
  createBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(200,218,255,0.6)',
    letterSpacing: -0.13,
  },
  navSafe: {
    backgroundColor: 'rgba(8,20,48,0.92)',
  },
  nav: {
    zIndex: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingTop: 8,
    paddingHorizontal: 4,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabBtn: {
    borderRadius: 12,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 3,
    minWidth: 56,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(200,218,255,0.1)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(122,156,200,0.55)',
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    fontWeight: '500',
    color: '#e8eef8',
  },
  bgStar: {
    position: 'absolute',
    backgroundColor: 'rgba(200,218,255,0.7)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4,10,28,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCardWrap: {
    width: '100%',
    maxWidth: 340,
  },
  modalCard: {
    borderWidth: 1,
    borderColor: 'rgba(107,159,255,0.3)',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: 'rgba(6,20,60,0.8)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
  },
  modalStarWrap: {
    marginBottom: 16,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(122,156,200,0.8)',
    letterSpacing: 0.88,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  modalBody: {
    fontSize: 18,
    fontWeight: '500',
    color: '#e8eef8',
    lineHeight: 29,
    letterSpacing: -0.36,
    textAlign: 'center',
    marginBottom: 28,
  },
  modalCloseBtn: {
    backgroundColor: 'rgba(107,159,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(107,159,255,0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  modalCloseText: {
    color: 'rgba(200,218,255,0.8)',
    fontSize: 13,
    fontWeight: '400',
  },
});
