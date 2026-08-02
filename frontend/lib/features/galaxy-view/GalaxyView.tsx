import { useState } from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';

// ─── Types ─────────────────────────────────────────────────────────────────

type CurrentView = 'GALLERY' | 'CONSTELLATION' | 'STAR';
type NavTab = 'galaxy' | 'observatory' | 'home' | 'comet' | 'mypage';

type StarTags = {
  who: string;
  place: string;
  time: string;
  act: string;
  emotion: string;
};

type StarData = {
  id: number;
  num: string;
  birthDate: string;
  tags: StarTags;
};

type ConstellationData = {
  id: number;
  num: string;
  birthDate: string;
  starCount: number;
  points: number[][];
  lines: number[][];
  stars: StarData[];
};

type ClusterData = {
  id: string;
  name: string;
  constellations: ConstellationData[];
};

type GalleryItem = {
  id: string;
  clusterId: string;
  constellationId: number;
  clusterName: string;
  num: string;
  date: string;
  points: number[][];
  lines: number[][];
};

// ─── Dummy Data ────────────────────────────────────────────────────────────

const CLUSTERS: ClusterData[] = [
  {
    id: 'ac',
    name: '모험·도전',
    constellations: [
      {
        id: 1,
        num: '첫',
        birthDate: '2026년 7월 8일',
        starCount: 5,
        points: [
          [55, 30],
          [110, 55],
          [90, 110],
          [40, 120],
          [20, 75],
        ],
        lines: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 0],
          [1, 3],
        ],
        stars: [
          {
            id: 1,
            num: '첫',
            birthDate: '2026년 6월 9일',
            tags: {
              who: '대학 동기',
              place: '부산대학교 넉넉한 터',
              time: '늦은 밤',
              act: '캔맥주를 마심',
              emotion: '시원함',
            },
          },
          {
            id: 2,
            num: '두',
            birthDate: '2026년 6월 18일',
            tags: {
              who: '친구들',
              place: '해운대 바닷가',
              time: '저녁 무렵',
              act: '모래사장을 걷다',
              emotion: '설렘',
            },
          },
          {
            id: 3,
            num: '세',
            birthDate: '2026년 6월 25일',
            tags: {
              who: '혼자',
              place: '광안리 카페',
              time: '오후 3시',
              act: '글쓰기',
              emotion: '고요함',
            },
          },
          {
            id: 4,
            num: '네',
            birthDate: '2026년 7월 2일',
            tags: {
              who: '팀원',
              place: '남포동 골목',
              time: '저녁 7시',
              act: '맛집 탐방',
              emotion: '유쾌함',
            },
          },
          {
            id: 5,
            num: '다섯',
            birthDate: '2026년 7월 8일',
            tags: {
              who: '선배',
              place: '부산역 근처',
              time: '자정',
              act: '이야기 나누기',
              emotion: '감사함',
            },
          },
        ],
      },
      {
        id: 2,
        num: '두',
        birthDate: '2026년 7월 20일',
        starCount: 5,
        points: [
          [30, 40],
          [100, 30],
          [120, 90],
          [70, 130],
          [10, 100],
        ],
        lines: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 0],
          [0, 2],
        ],
        stars: [
          {
            id: 1,
            num: '첫',
            birthDate: '2026년 7월 10일',
            tags: {
              who: '동생',
              place: '서면 카페',
              time: '오후 2시',
              act: '커피 마시기',
              emotion: '여유로움',
            },
          },
          {
            id: 2,
            num: '두',
            birthDate: '2026년 7월 12일',
            tags: {
              who: '친구',
              place: '영도 다리',
              time: '석양 무렵',
              act: '사진 찍기',
              emotion: '낭만',
            },
          },
          {
            id: 3,
            num: '세',
            birthDate: '2026년 7월 14일',
            tags: {
              who: '혼자',
              place: '감천문화마을',
              time: '아침 10시',
              act: '산책',
              emotion: '평온함',
            },
          },
          {
            id: 4,
            num: '네',
            birthDate: '2026년 7월 17일',
            tags: {
              who: '동료',
              place: '해운대 횟집',
              time: '저녁 6시',
              act: '회식',
              emotion: '뿌듯함',
            },
          },
          {
            id: 5,
            num: '다섯',
            birthDate: '2026년 7월 20일',
            tags: {
              who: '연인',
              place: '달맞이 언덕',
              time: '밤 9시',
              act: '야경 감상',
              emotion: '행복',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'gr',
    name: '건강',
    constellations: [
      {
        id: 1,
        num: '첫',
        birthDate: '2026년 7월 12일',
        starCount: 5,
        points: [
          [60, 20],
          [110, 45],
          [130, 100],
          [80, 140],
          [20, 110],
        ],
        lines: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 0],
          [0, 3],
          [1, 3],
        ],
        stars: [
          {
            id: 1,
            num: '첫',
            birthDate: '2026년 7월 1일',
            tags: {
              who: '운동 친구',
              place: '한강 공원',
              time: '이른 아침',
              act: '조깅',
              emotion: '활력',
            },
          },
          {
            id: 2,
            num: '두',
            birthDate: '2026년 7월 4일',
            tags: {
              who: '가족',
              place: '집 근처 공원',
              time: '저녁 6시',
              act: '산책',
              emotion: '포근함',
            },
          },
          {
            id: 3,
            num: '세',
            birthDate: '2026년 7월 7일',
            tags: {
              who: '혼자',
              place: '헬스장',
              time: '오전 7시',
              act: '웨이트 트레이닝',
              emotion: '성취감',
            },
          },
          {
            id: 4,
            num: '네',
            birthDate: '2026년 7월 10일',
            tags: {
              who: '트레이너',
              place: '수영장',
              time: '오전 6시',
              act: '수영',
              emotion: '상쾌함',
            },
          },
          {
            id: 5,
            num: '다섯',
            birthDate: '2026년 7월 12일',
            tags: {
              who: '동네 친구',
              place: '자전거 도로',
              time: '오후 5시',
              act: '자전거 타기',
              emotion: '자유로움',
            },
          },
        ],
      },
      {
        id: 2,
        num: '두',
        birthDate: '2026년 7월 25일',
        starCount: 5,
        points: [
          [55, 20],
          [115, 40],
          [125, 100],
          [75, 140],
          [10, 110],
          [5, 55],
        ],
        lines: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 5],
          [5, 0],
          [1, 4],
        ],
        stars: [
          {
            id: 1,
            num: '첫',
            birthDate: '2026년 7월 15일',
            tags: {
              who: '러닝 크루',
              place: '올림픽 공원',
              time: '새벽 5시',
              act: '마라톤 연습',
              emotion: '도전',
            },
          },
          {
            id: 2,
            num: '두',
            birthDate: '2026년 7월 18일',
            tags: {
              who: '친구',
              place: '요가 스튜디오',
              time: '오후 7시',
              act: '요가',
              emotion: '평화로움',
            },
          },
          {
            id: 3,
            num: '세',
            birthDate: '2026년 7월 20일',
            tags: {
              who: '혼자',
              place: '등산로',
              time: '오전 8시',
              act: '등산',
              emotion: '성취감',
            },
          },
          {
            id: 4,
            num: '네',
            birthDate: '2026년 7월 22일',
            tags: {
              who: '동생',
              place: '배드민턴장',
              time: '저녁 8시',
              act: '배드민턴',
              emotion: '즐거움',
            },
          },
          {
            id: 5,
            num: '다섯',
            birthDate: '2026년 7월 25일',
            tags: {
              who: '가족',
              place: '근처 공원',
              time: '저녁 7시',
              act: '가족 체조',
              emotion: '따뜻함',
            },
          },
        ],
      },
    ],
  },
];

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'g1',
    clusterId: 'gr',
    constellationId: 1,
    clusterName: '건강',
    num: '첫',
    date: '2026년 7월 12일',
    points: [
      [55, 25],
      [105, 50],
      [125, 105],
      [65, 135],
      [15, 100],
      [10, 50],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
      [0, 3],
    ],
  },
  {
    id: 'g2',
    clusterId: 'ac',
    constellationId: 1,
    clusterName: '모험·도전',
    num: '첫',
    date: '2026년 7월 8일',
    points: [
      [65, 20],
      [120, 50],
      [105, 110],
      [45, 130],
      [15, 80],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
      [0, 2],
      [1, 3],
    ],
  },
  {
    id: 'g3',
    clusterId: 'ac',
    constellationId: 1,
    clusterName: '모험·도전',
    num: '첫',
    date: '2026년 7월 8일',
    points: [
      [70, 30],
      [125, 55],
      [110, 115],
      [50, 135],
      [10, 85],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
      [1, 3],
    ],
  },
  {
    id: 'g4',
    clusterId: 'gr',
    constellationId: 1,
    clusterName: '건강',
    num: '첫',
    date: '2026년 7월 12일',
    points: [
      [55, 20],
      [110, 40],
      [130, 95],
      [80, 130],
      [20, 115],
      [5, 60],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
      [0, 2],
    ],
  },
  {
    id: 'g5',
    clusterId: 'ac',
    constellationId: 2,
    clusterName: '모험·도전',
    num: '두',
    date: '2026년 7월 20일',
    points: [
      [40, 30],
      [105, 25],
      [130, 85],
      [70, 125],
      [10, 90],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
      [1, 3],
    ],
  },
  {
    id: 'g6',
    clusterId: 'gr',
    constellationId: 2,
    clusterName: '건강',
    num: '두',
    date: '2026년 7월 25일',
    points: [
      [60, 15],
      [120, 45],
      [115, 110],
      [55, 140],
      [15, 105],
      [10, 45],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
      [1, 4],
    ],
  },
];

const NAV_TABS: { id: NavTab; label: string }[] = [
  { id: 'galaxy', label: '은하감상' },
  { id: 'observatory', label: '천문연구소' },
  { id: 'home', label: '홈' },
  { id: 'comet', label: '혜성관측소' },
  { id: 'mypage', label: '마이페이지' },
];

const FILTER_PILLS = ['2026년', '여름', '성단 선택'] as const;

const STAR_TAGS_ORDER: { key: keyof StarTags; label: string }[] = [
  { key: 'who', label: '함께한 사람' },
  { key: 'place', label: '장소' },
  { key: 'time', label: '시간' },
  { key: 'act', label: '한 일' },
  { key: 'emotion', label: '감정' },
];

const COLORS = {
  bgDeep: '#060812',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0AAB0',
  textMuted: '#6C7A89',
  textSubtitle: '#6C8AA0',
  cyan: '#00F5FF',
  gold: '#FFD966',
  purple: '#8A2BE2',
  borderSubtle: 'rgba(255,255,255,0.08)',
};

// ─── Star field ────────────────────────────────────────────────────────────

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

// ─── SVG Graphics ──────────────────────────────────────────────────────────

function ConstellationSVG({
  points,
  lines,
  size = 150,
  small = false,
}: {
  points: number[][];
  lines: number[][];
  size?: number;
  small?: boolean;
}) {
  const pad = small ? 10 : 16;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = (size - pad * 2) / Math.max(rangeX, rangeY);
  const offsetX = (size - rangeX * scale) / 2;
  const offsetY = (size - rangeY * scale) / 2;

  const mapped = points.map(([x, y]) => [
    (x - minX) * scale + offsetX,
    (y - minY) * scale + offsetY,
  ]);

  const dotR = small ? 2 : 3;
  const glowR = small ? 4 : 6;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {lines.map(([a, b], i) => (
        <Line
          key={`line-${i}`}
          x1={mapped[a][0]}
          y1={mapped[a][1]}
          x2={mapped[b][0]}
          y2={mapped[b][1]}
          stroke="rgba(255,215,100,0.45)"
          strokeWidth={small ? 0.8 : 1.2}
        />
      ))}
      {mapped.map(([x, y], i) => (
        <Circle key={`glow-${i}`} cx={x} cy={y} r={glowR} fill="rgba(255,200,80,0.12)" />
      ))}
      {mapped.map(([x, y], i) => (
        <Circle key={`dot-${i}`} cx={x} cy={y} r={dotR} fill="#FFD966" opacity={0.95} />
      ))}
      {mapped.map(([x, y], i) => (
        <Circle key={`core-${i}`} cx={x} cy={y} r={dotR * 0.5} fill="#FFF5CC" />
      ))}
    </Svg>
  );
}

function GlowingStar({ size = 150 }: { size?: number }) {
  const cx = size / 2;
  const cy = size / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id="starGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="20%" stopColor="#00F5FF" stopOpacity="0.9" />
          <Stop offset="60%" stopColor="#00C8FF" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#0088CC" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={40} fill="rgba(0,245,255,0.08)" />
      <Circle cx={cx} cy={cy} r={24} fill="rgba(0,245,255,0.15)" />
      <Circle cx={cx} cy={cy} r={10} fill="url(#starGrad)" />
      <Circle cx={cx} cy={cy} r={5} fill="#FFFFFF" opacity={0.95} />
      {[0, 90].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <Line
            key={`spike-${angle}`}
            x1={cx + Math.cos(rad) * 35}
            y1={cy + Math.sin(rad) * 35}
            x2={cx - Math.cos(rad) * 35}
            y2={cy - Math.sin(rad) * 35}
            stroke="rgba(0,245,255,0.6)"
            strokeWidth={1}
          />
        );
      })}
      {[45, 135].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <Line
            key={`diag-${angle}`}
            x1={cx + Math.cos(rad) * 18}
            y1={cy + Math.sin(rad) * 18}
            x2={cx - Math.cos(rad) * 18}
            y2={cy - Math.sin(rad) * 18}
            stroke="rgba(0,245,255,0.35)"
            strokeWidth={0.7}
          />
        );
      })}
    </Svg>
  );
}

function ClusterIcon({ small = false }: { small?: boolean }) {
  const s = small ? 26 : 32;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={6} fill="#00F5FF" opacity={0.9} />
      <Circle cx={16} cy={16} r={3} fill="#FFFFFF" />
      {[
        [16, 4],
        [28, 12],
        [28, 20],
        [16, 28],
        [4, 20],
        [4, 12],
      ].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={2} fill="#A78BFA" opacity={0.8} />
      ))}
    </Svg>
  );
}

// ─── Bottom Nav Icons ──────────────────────────────────────────────────────

function NavTabIcon({ id, active }: { id: NavTab; active: boolean }) {
  const activeColor = COLORS.cyan;
  const idleColor = COLORS.textMuted;
  const c = active ? activeColor : idleColor;

  switch (id) {
    case 'galaxy':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Circle cx={11} cy={11} r={4} fill={c} opacity={active ? 0.9 : 0.7} />
          {active ? (
            <Circle cx={11} cy={11} r={7} stroke={COLORS.cyan} strokeWidth={1} opacity={0.3} />
          ) : null}
          <Circle cx={4} cy={6} r={1.5} fill={active ? '#A78BFA' : idleColor} opacity={0.8} />
          <Circle cx={18} cy={8} r={1} fill={active ? '#A78BFA' : idleColor} opacity={0.7} />
          <Circle cx={6} cy={17} r={1} fill={active ? COLORS.cyan : idleColor} opacity={0.6} />
          <Circle cx={17} cy={16} r={1.5} fill={active ? '#A78BFA' : idleColor} opacity={0.7} />
        </Svg>
      );
    case 'observatory':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Path d="M9 13h4v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-6z" fill={c} />
          <Path d="M4 13 Q11 4 18 13" stroke={c} strokeWidth={1.5} fill="none" />
          <Line x1={11} y1={4} x2={11} y2={2} stroke={c} strokeWidth={1.5} />
        </Svg>
      );
    case 'home':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Path
            d="M3 10L11 3L19 10V19H14V14H8V19H3V10Z"
            stroke={c}
            strokeWidth={1.5}
            fill="none"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'comet':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Circle cx={15} cy={7} r={3} fill={c} opacity={0.9} />
          <Path d="M13 9L4 18" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
          <Path
            d="M11 11L4 14"
            stroke={c}
            strokeWidth={1}
            strokeLinecap="round"
            opacity={0.5}
          />
          <Path
            d="M13 13L8 18"
            stroke={c}
            strokeWidth={1}
            strokeLinecap="round"
            opacity={0.4}
          />
        </Svg>
      );
    case 'mypage':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Circle cx={11} cy={8} r={3.5} stroke={c} strokeWidth={1.5} />
          <Path
            d="M4 19C4 15.686 7.134 13 11 13C14.866 13 18 15.686 18 19"
            stroke={c}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </Svg>
      );
  }
}

function BottomNav({
  activeNav,
  onPress,
}: {
  activeNav: NavTab;
  onPress: (id: NavTab) => void;
}) {
  return (
    <View style={styles.bottomNav}>
      <LinearGradient
        colors={['rgba(8,10,28,0.85)', 'rgba(8,10,28,0.97)']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView edges={['bottom']} style={styles.navSafe}>
        <View style={styles.nav}>
          {NAV_TABS.map((tab) => {
            const isActive = tab.id === activeNav;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => onPress(tab.id)}
                activeOpacity={0.7}
                style={[styles.navItem, isActive && styles.navItemActive]}
              >
                {isActive ? <View style={styles.navGlow} pointerEvents="none" /> : null}
                <NavTabIcon id={tab.id} active={isActive} />
                <Text
                  style={[styles.navLabel, isActive && styles.navLabelActive]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Shared CTA ────────────────────────────────────────────────────────────

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.primaryBtn}>
      <LinearGradient
        colors={['rgba(0,245,255,0.25)', 'rgba(138,43,226,0.35)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Text style={styles.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function BackIconButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.backIconBtn}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="뒤로가기"
    >
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M15 18L9 12L15 6"
          stroke={COLORS.textSecondary}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </TouchableOpacity>
  );
}

// ─── Gallery View ──────────────────────────────────────────────────────────

function GalleryCard({
  item,
  index,
  cardWidth,
  onPress,
}: {
  item: GalleryItem;
  index: number;
  cardWidth: number;
  onPress: () => void;
}) {
  const bgDots = Array.from({ length: 8 }, (_, j) => ({
    topPct: 15 + ((j * 31 + index * 17) % 70),
    leftPct: 10 + ((j * 43 + index * 23) % 80),
    size: j % 3 === 0 ? 1.5 : 1,
    opacity: 0.3 + (j % 3) * 0.2,
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.galleryCard, { width: cardWidth }]}
    >
      <LinearGradient
        colors={['rgba(20,30,80,0.8)', 'rgba(10,15,45,0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.galleryGraphic, { height: cardWidth }]}>
        {bgDots.map((dot, j) => (
          <View
            key={j}
            style={[
              styles.galleryBgDot,
              {
                top: `${dot.topPct}%`,
                left: `${dot.leftPct}%`,
                width: dot.size,
                height: dot.size,
                borderRadius: dot.size / 2,
                opacity: dot.opacity,
              },
            ]}
          />
        ))}
        <ConstellationSVG points={item.points} lines={item.lines} size={120} small />
      </View>
      <View style={styles.galleryCardBody}>
        <View style={styles.galleryCardRow}>
          <Text style={styles.galleryCardTitle}>
            {item.clusterName} 성단의{'\n'}
            {item.num} 번째 별자리
          </Text>
          <Text style={styles.galleryCardDate}>{item.date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function GalleryView({ onSelectItem }: { onSelectItem: (item: GalleryItem) => void }) {
  const { width } = useWindowDimensions();
  const gap = 12;
  const horizontalPad = 16;
  const cardWidth = (width - horizontalPad * 2 - gap) / 2;

  return (
    <FlatList
      data={GALLERY_ITEMS}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.galleryRow}
      contentContainerStyle={styles.galleryList}
      showsVerticalScrollIndicator={false}
      renderItem={({ item, index }) => (
        <GalleryCard
          item={item}
          index={index}
          cardWidth={cardWidth}
          onPress={() => onSelectItem(item)}
        />
      )}
    />
  );
}

// ─── Constellation View ────────────────────────────────────────────────────

function ConstellationView({
  cluster,
  constellation,
  onPrev,
  onNext,
  onViewStars,
  onBack,
}: {
  cluster: ClusterData;
  constellation: ConstellationData;
  onPrev: () => void;
  onNext: () => void;
  onViewStars: () => void;
  onBack: () => void;
}) {
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.detailScroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.detailTopBar}>
        <BackIconButton onPress={onBack} />
      </View>

      <View style={styles.clusterHeader}>
        <ClusterIcon />
        <Text style={styles.clusterName}>{cluster.name}</Text>
        <Text style={styles.clusterBirth}>{constellation.birthDate} 탄생</Text>
      </View>

      <View style={styles.viewerRow}>
        <TouchableOpacity onPress={onPrev} activeOpacity={0.7} style={styles.arrowBtn}>
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.constFrame}>
          <ConstellationSVG
            points={constellation.points}
            lines={constellation.lines}
            size={150}
          />
        </View>

        <TouchableOpacity onPress={onNext} activeOpacity={0.7} style={styles.arrowBtn}>
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.detailInfo}>
        <Text style={styles.detailTitle}>
          {cluster.name} 성단의 {constellation.num} 번째 별자리
        </Text>
        <Text style={styles.detailSub}>{constellation.starCount}개의 별로 구성</Text>
      </View>

      <View style={styles.ctaBlock}>
        <PrimaryButton label="별자리 관측하기" onPress={onViewStars} />
      </View>
    </ScrollView>
  );
}

// ─── Star View ─────────────────────────────────────────────────────────────

function StarView({
  clusterName,
  stars,
  starIdx,
  onPrev,
  onNext,
  onBack,
}: {
  clusterName: string;
  stars: StarData[];
  starIdx: number;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const star = stars[starIdx];
  const isFirst = starIdx === 0;
  const isLast = starIdx === stars.length - 1;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.detailScroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.detailTopBar}>
        <BackIconButton onPress={onBack} />
      </View>

      <View style={styles.clusterHeader}>
        <ClusterIcon />
        <Text style={styles.clusterName}>{clusterName}</Text>
        <Text style={styles.clusterBirth}>{star.birthDate} 탄생</Text>
      </View>

      <View style={styles.viewerRow}>
        <TouchableOpacity
          onPress={onPrev}
          disabled={isFirst}
          activeOpacity={0.7}
          style={[styles.arrowBtn, isFirst && styles.arrowDisabled]}
        >
          <Text style={[styles.arrowText, isFirst && styles.arrowTextDisabled]}>‹</Text>
        </TouchableOpacity>

        <View style={styles.starFrame}>
          <GlowingStar size={150} />
        </View>

        <TouchableOpacity
          onPress={onNext}
          disabled={isLast}
          activeOpacity={0.7}
          style={[styles.arrowBtn, isLast && styles.arrowDisabled]}
        >
          <Text style={[styles.arrowText, isLast && styles.arrowTextDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.detailInfo}>
        <Text style={styles.detailTitle}>
          {clusterName} 성단의 {star.num} 번째 별
        </Text>

        <View style={styles.tagList}>
          {STAR_TAGS_ORDER.map((tag) => (
            <View key={tag.key} style={styles.tagRow}>
              <Text style={styles.tagLabel}>{tag.label}</Text>
              <View style={styles.tagPill}>
                <Text style={styles.tagValue}>{star.tags[tag.key]}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.ctaBlock}>
        <PrimaryButton label="기록 확인하기" onPress={() => {}} />
      </View>
    </ScrollView>
  );
}

// ─── Main View ─────────────────────────────────────────────────────────────

export default function GalaxyView() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<CurrentView>('GALLERY');
  const [clusterIdx, setClusterIdx] = useState(0);
  const [constIdx, setConstIdx] = useState(0);
  const [starIdx, setStarIdx] = useState(0);
  const activeNav: NavTab = 'galaxy';

  const cluster = CLUSTERS[clusterIdx];
  const constellation = cluster.constellations[constIdx];
  const stars = constellation.stars;

  const handleGallerySelect = (item: GalleryItem) => {
    const nextClusterIdx = CLUSTERS.findIndex((c) => c.id === item.clusterId);
    if (nextClusterIdx < 0) return;

    const nextConstIdx = CLUSTERS[nextClusterIdx].constellations.findIndex(
      (c) => c.id === item.constellationId,
    );
    if (nextConstIdx < 0) return;

    setClusterIdx(nextClusterIdx);
    setConstIdx(nextConstIdx);
    setStarIdx(0);
    setCurrentView('CONSTELLATION');
  };

  const handleViewStars = () => {
    setStarIdx(0);
    setCurrentView('STAR');
  };

  const prevConst = () => {
    const len = cluster.constellations.length;
    setConstIdx((i) => (i - 1 + len) % len);
    setStarIdx(0);
  };

  const nextConst = () => {
    const len = cluster.constellations.length;
    setConstIdx((i) => (i + 1) % len);
    setStarIdx(0);
  };

  const prevStar = () => setStarIdx((i) => Math.max(0, i - 1));
  const nextStar = () => setStarIdx((i) => Math.min(stars.length - 1, i + 1));

  const handleNavPress = (tabId: NavTab) => {
    if (tabId === 'home') {
      router.push('/');
      return;
    }
    if (tabId === 'observatory') {
      router.push('/observatory');
      return;
    }
    if (tabId === 'galaxy') return;
    // 혜성관측소 / 마이페이지 — 추후 라우트 연동
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0F1430', '#0B0D1B', '#090C20', '#0D0F24']}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />
      <StarField />

      {/* Nebula glow blobs */}
      <View style={styles.nebulaPurple} pointerEvents="none" />
      <View style={styles.nebulaCyan} pointerEvents="none" />
      <View style={styles.nebulaViolet} pointerEvents="none" />

      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>은하감상</Text>
          <Text style={styles.headerSubtitle}>
            &quot;2026년 여름의 은하에서 관측된 빛&quot;
          </Text>
        </View>

        {/* Filter pills only — no mode tabs */}
        <View style={styles.filterRow}>
          {FILTER_PILLS.map((label) => (
            <TouchableOpacity key={label} activeOpacity={0.85} style={styles.filterPill}>
              <Text style={styles.filterPillText}>{label}</Text>
              <Text style={styles.filterCaret}>▾</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {currentView === 'GALLERY' ? (
            <GalleryView onSelectItem={handleGallerySelect} />
          ) : null}
          {currentView === 'CONSTELLATION' ? (
            <ConstellationView
              cluster={cluster}
              constellation={constellation}
              onPrev={prevConst}
              onNext={nextConst}
              onViewStars={handleViewStars}
              onBack={() => setCurrentView('GALLERY')}
            />
          ) : null}
          {currentView === 'STAR' ? (
            <StarView
              clusterName={cluster.name}
              stars={stars}
              starIdx={starIdx}
              onPrev={prevStar}
              onNext={nextStar}
              onBack={() => setCurrentView('CONSTELLATION')}
            />
          ) : null}
        </View>
      </SafeAreaView>

      <BottomNav activeNav={activeNav} onPress={handleNavPress} />
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
  starDot: {
    position: 'absolute',
    backgroundColor: '#ffffff',
  },

  nebulaPurple: {
    position: 'absolute',
    width: 280,
    height: 280,
    top: 120,
    left: -60,
    borderRadius: 140,
    backgroundColor: 'rgba(138,43,226,0.06)',
  },
  nebulaCyan: {
    position: 'absolute',
    width: 200,
    height: 200,
    top: 350,
    right: -40,
    borderRadius: 100,
    backgroundColor: 'rgba(0,245,255,0.05)',
  },
  nebulaViolet: {
    position: 'absolute',
    width: 180,
    height: 180,
    bottom: 180,
    left: 60,
    borderRadius: 90,
    backgroundColor: 'rgba(100,60,180,0.06)',
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textSubtitle,
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  filterPillText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  filterCaret: {
    fontSize: 10,
    color: COLORS.textSecondary,
    opacity: 0.7,
  },

  content: {
    flex: 1,
    minHeight: 0,
  },

  galleryList: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  galleryRow: {
    gap: 12,
    marginBottom: 12,
  },
  galleryCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(10,15,45,0.9)',
  },
  galleryGraphic: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,12,35,0.6)',
    position: 'relative',
  },
  galleryBgDot: {
    position: 'absolute',
    backgroundColor: '#ffffff',
  },
  galleryCardBody: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  galleryCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  galleryCardTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textPrimary,
    lineHeight: 16,
  },
  galleryCardDate: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'right',
    flexShrink: 0,
    maxWidth: 72,
    lineHeight: 14,
  },

  detailScroll: {
    paddingBottom: 120,
  },
  detailTopBar: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
    alignItems: 'flex-start',
  },
  backIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterHeader: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  clusterName: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  clusterBirth: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    opacity: 0.35,
  },
  arrowText: {
    fontSize: 28,
    color: COLORS.textSecondary,
    lineHeight: 32,
  },
  arrowTextDisabled: {
    color: 'rgba(108,122,137,0.45)',
  },

  constFrame: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,28,70,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,100,0.2)',
  },
  starFrame: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,60,100,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.2)',
  },

  detailInfo: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  detailSub: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  tagList: {
    marginTop: 16,
    gap: 8,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tagLabel: {
    width: 80,
    fontSize: 12,
    color: COLORS.textMuted,
    paddingTop: 6,
  },
  tagPill: {
    flexShrink: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tagValue: {
    fontSize: 13,
    color: '#E0E8F0',
  },

  ctaBlock: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.4)',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    zIndex: 1,
  },

  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  navSafe: {
    backgroundColor: 'transparent',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
    height: 64,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 48,
    position: 'relative',
  },
  navItemActive: {},
  navGlow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,245,255,0.12)',
    top: -2,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  navLabelActive: {
    color: COLORS.cyan,
    textShadowColor: 'rgba(0,245,255,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
