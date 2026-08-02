import { useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { BottomNavigationBar } from '@/assets_shared';

// ─── Types ─────────────────────────────────────────────────────────────────

type SubTab = 'stats' | 'report';

interface ClusterStat {
  name: string;
  count: number;
  color: string;
  glow: string;
}

interface ObservatoryMockData {
  year: string;
  season: string;
  period: string;
  polaris: string;
  totalStars: number;
  constellations: number;
  mainCluster: string;
  dDay: number;
  clusters: ClusterStat[];
  aiNote: string;
}

// ─── Mock data (API 연동 시 교체) ───────────────────────────────────────────

const MOCK_DATA: ObservatoryMockData = {
  year: '2026년',
  season: '여름',
  period: '2026년 06월 01일 ~ 2026년 08월 31일',
  polaris: '나만의 고유한 빛을 발하며 흔들리지 않는 중심 잡기',
  totalStars: 32,
  constellations: 5,
  mainCluster: '성장·배움',
  dDay: 24,
  clusters: [
    { name: '성장·배움', count: 12, color: '#A78BFA', glow: 'rgba(167,139,250,0.5)' },
    { name: '건강·운동', count: 8, color: '#34D399', glow: 'rgba(52,211,153,0.5)' },
    { name: '관계·일상', count: 6, color: '#60A5FA', glow: 'rgba(96,165,250,0.5)' },
    { name: '마음·휴식', count: 4, color: '#F472B6', glow: 'rgba(244,114,182,0.5)' },
    { name: '취미·창작', count: 2, color: '#FBBF24', glow: 'rgba(251,191,36,0.5)' },
  ],
  aiNote:
    "이번 계절은 '성장·배움' 성단의 별이 가장 눈부시게 빛나고 있어요. 꾸준한 탐구가 삶의 중심을 단단하게 잡아주고 있습니다.",
};

const COLORS = {
  bgDeep: '#060d20',
  bgCard: 'rgba(15, 23, 42, 0.85)',
  borderSubtle: 'rgba(255,255,255,0.08)',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textAccent: '#C4B5FD',
  purple: '#7C3AED',
  purpleSoft: '#A78BFA',
};

// ─── Deterministic star field ──────────────────────────────────────────────

const STAR_DOTS = [
  { x: 0.08, y: 0.07, s: 1.5, o: 0.35 },
  { x: 0.82, y: 0.12, s: 1.2, o: 0.25 },
  { x: 0.55, y: 0.05, s: 1.8, o: 0.4 },
  { x: 0.2, y: 0.22, s: 1.2, o: 0.3 },
  { x: 0.9, y: 0.35, s: 2, o: 0.45 },
  { x: 0.05, y: 0.48, s: 1.2, o: 0.28 },
  { x: 0.75, y: 0.58, s: 1.5, o: 0.32 },
  { x: 0.35, y: 0.78, s: 1.2, o: 0.22 },
  { x: 0.92, y: 0.72, s: 1.8, o: 0.38 },
  { x: 0.15, y: 0.88, s: 1.2, o: 0.3 },
  { x: 0.6, y: 0.92, s: 1.5, o: 0.26 },
  { x: 0.45, y: 0.18, s: 1.2, o: 0.34 },
  { x: 0.28, y: 0.4, s: 1.5, o: 0.2 },
  { x: 0.68, y: 0.28, s: 1.2, o: 0.42 },
  { x: 0.12, y: 0.65, s: 1.8, o: 0.28 },
  { x: 0.88, y: 0.15, s: 1.2, o: 0.36 },
  { x: 0.42, y: 0.55, s: 1.5, o: 0.24 },
  { x: 0.7, y: 0.82, s: 1.2, o: 0.4 },
  { x: 0.5, y: 0.35, s: 1.8, o: 0.18 },
  { x: 0.18, y: 0.12, s: 1.2, o: 0.33 },
];

function StarField() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {STAR_DOTS.map((st, i) => (
        <View
          key={i}
          style={[
            styles.starDot,
            {
              left: width * st.x,
              top: height * st.y,
              width: st.s,
              height: st.s,
              borderRadius: st.s / 2,
              opacity: st.o,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  accent,
  valueSm,
}: {
  value: string;
  label: string;
  accent: string;
  valueSm?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statGlow, { backgroundColor: accent }]} />
      <Text
        style={[
          styles.statValue,
          valueSm && styles.statValueSm,
          {
            color: accent,
            textShadowColor: `${accent}55`,
          },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ClusterBar({
  name,
  count,
  color,
  glow,
  percent,
}: {
  name: string;
  count: number;
  color: string;
  glow: string;
  percent: number;
}) {
  return (
    <View style={styles.barRow}>
      <Text style={styles.barName} numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${percent}%`,
              backgroundColor: color,
              shadowColor: glow,
            },
          ]}
        />
      </View>
      <Text style={styles.barPercent}>{percent}%</Text>
      <Text style={styles.barCount}>{count}개</Text>
    </View>
  );
}

function StatsContent({ data }: { data: ObservatoryMockData }) {
  const clusterTotal = useMemo(
    () => data.clusters.reduce((sum, c) => sum + c.count, 0),
    [data.clusters],
  );

  return (
    <>
      {/* Observation period */}
      <View style={styles.periodSection}>
        <Text style={styles.periodTitle}>
          {data.year} {data.season} 은하 관측 통계 현황
        </Text>
        <Text style={styles.periodRange}>{data.period}</Text>
        <View style={styles.divider} />
      </View>

      {/* Polaris */}
      <View style={styles.sectionPad}>
        <View style={styles.polarisCard}>
          <View style={styles.polarisIconWrap}>
            <Ionicons name="star" size={22} color={COLORS.purpleSoft} />
          </View>
          <Text style={styles.polarisText}>{data.polaris}</Text>
        </View>
      </View>

      {/* 1×4 stat row */}
      <View style={styles.statRow}>
        <StatCard value={`${data.totalStars}개`} label="전체별" accent="#60A5FA" />
        <StatCard value={`${data.constellations}개`} label="별자리" accent="#34D399" />
        <StatCard value={data.mainCluster} label="주요 성단" accent="#A78BFA" valueSm />
        <StatCard value={`D-${data.dDay}`} label={`${data.season} 은하`} accent="#F472B6" />
      </View>

      {/* Cluster bar chart */}
      <View style={styles.sectionPadTop}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>은하 구성 현황</Text>
          <View style={styles.barList}>
            {data.clusters.map((c) => {
              const pct =
                clusterTotal > 0 ? Math.round((c.count / clusterTotal) * 100) : 0;
              return (
                <ClusterBar
                  key={c.name}
                  name={c.name}
                  count={c.count}
                  color={c.color}
                  glow={c.glow}
                  percent={pct}
                />
              );
            })}
          </View>
        </View>
      </View>

      {/* AI note */}
      <View style={styles.aiNotePad}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>현재 은하 관측 경향 노트</Text>
          <Text style={styles.aiNoteBody}>{data.aiNote}</Text>
        </View>
      </View>
    </>
  );
}

function ReportPlaceholder() {
  return (
    <View style={styles.reportPad}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>천문 리포트</Text>
        <Text style={styles.aiNoteBody}>
          이번 시즌 천문 리포트는 곧 공개됩니다. 은하 관측 통계를 먼저 확인해 보세요.
        </Text>
      </View>
    </View>
  );
}

// ─── Main View ─────────────────────────────────────────────────────────────

export default function ObservatoryView() {
  const [activeTab, setActiveTab] = useState<SubTab>('stats');
  const [mockData] = useState<ObservatoryMockData>(MOCK_DATA);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0d1f48', '#081432', COLORS.bgDeep]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <StarField />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>천문연구소</Text>
          </View>

          {/* Sub-tab switcher */}
          <View style={styles.tabPad}>
            <View style={styles.tabSwitcher}>
              {(['stats', 'report'] as const).map((tab) => {
                const active = activeTab === tab;
                const label = tab === 'stats' ? '은하 관측 통계' : '천문 리포트';

                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    activeOpacity={0.85}
                    style={[styles.tabBtn, active && styles.tabBtnActive]}
                  >
                    {active ? (
                      <LinearGradient
                        colors={['rgba(124,58,237,0.25)', 'rgba(6,182,212,0.15)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                    ) : null}
                    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {activeTab === 'stats' ? (
            <StatsContent data={mockData} />
          ) : (
            <ReportPlaceholder />
          )}
        </ScrollView>
      </SafeAreaView>

      <BottomNavigationBar activeTab="observatory" />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  starDot: {
    position: 'absolute',
    backgroundColor: '#ffffff',
  },

  header: {
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },

  tabPad: {
    paddingTop: 14,
    paddingHorizontal: 20,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabBtnActive: {
    borderColor: 'rgba(124,58,237,0.4)',
    ...Platform.select({
      ios: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
    letterSpacing: -0.2,
    zIndex: 1,
  },
  tabLabelActive: {
    fontWeight: '600',
    color: COLORS.textAccent,
  },

  periodSection: {
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  periodTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  periodRange: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.borderSubtle,
    marginTop: 16,
  },

  sectionPad: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  sectionPadTop: {
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  polarisCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  polarisIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  polarisText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textAccent,
    lineHeight: 21,
    letterSpacing: -0.1,
  },

  statRow: {
    paddingTop: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  statGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 24,
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  statValueSm: {
    fontSize: 13,
    letterSpacing: -0.3,
    lineHeight: 18,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: -0.1,
    textAlign: 'center',
  },

  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.2,
  },

  barList: {
    gap: 14,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 64,
    letterSpacing: -0.2,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  barPercent: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 30,
    textAlign: 'right',
  },
  barCount: {
    fontSize: 12,
    color: COLORS.textAccent,
    width: 28,
    textAlign: 'right',
  },

  aiNotePad: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  aiNoteBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 22,
    letterSpacing: -0.1,
    marginTop: -6,
  },

  reportPad: {
    paddingTop: 24,
    paddingHorizontal: 20,
  },
});
