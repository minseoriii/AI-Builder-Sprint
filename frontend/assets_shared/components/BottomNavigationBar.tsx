import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Palette, withOpacity } from '../colors';
import { requestScreenRefresh } from '../hooks/screenRefreshBus';
import {
  icComet,
  icGalaxyView,
  icHome,
  icLab,
  icMyPage,
} from '../images/navigation';
import { useResponsive } from '../responsive';
import { FontFamily } from '../typography';

export type BottomNavTab = 'galaxy' | 'observatory' | 'home' | 'comet' | 'mypage';

/** 디자인 기준 치수 (412×86) — 하이라이트 영역 = 바 전체 높이 */
export const BottomNavigationBarDimensions = {
  designWidth: 412,
  height: 86,
  tabHighlightInset: 2,
  iconSize: 28,
  fontSize: 14,
} as const;

const TAB_ROUTES: Record<BottomNavTab, Href> = {
  galaxy: '/galaxy-view',
  observatory: '/observatory',
  home: '/',
  comet: '/comet',
  mypage: '/mypage',
};

const NAV_TABS: {
  id: BottomNavTab;
  label: string;
  icon: number;
}[] = [
  { id: 'galaxy', label: '은하감상', icon: icGalaxyView },
  { id: 'observatory', label: '천문연구소', icon: icLab },
  { id: 'home', label: '홈', icon: icHome },
  { id: 'comet', label: '혜성관측소', icon: icComet },
  { id: 'mypage', label: '마이페이지', icon: icMyPage },
];

const ACTIVE_COLOR = Palette.cream;
const INACTIVE_COLOR = withOpacity(Palette.cream, 0.45);

const CREAM = Palette.creamActive;

/** 활성 탭 — 위 연함 → 아래로 갈수록 진함 */
const HIGHLIGHT_GRADIENT = {
  colors: [
    withOpacity(CREAM, 0.06),
    withOpacity(CREAM, 0.14),
    withOpacity(CREAM, 0.24),
    withOpacity(CREAM, 0.35),
  ] as const,
  locations: [0, 0.28, 0.62, 1] as const,
};

function TabHighlight({ inset }: { inset: number }) {
  return (
    <LinearGradient
      colors={[...HIGHLIGHT_GRADIENT.colors]}
      locations={[...HIGHLIGHT_GRADIENT.locations]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[
        styles.tabHighlight,
        { left: inset, right: inset },
      ]}
      pointerEvents="none"
    />
  );
}

export interface BottomNavigationBarProps {
  activeTab: BottomNavTab;
}

/** 412×86 하단 탭 바 — 하이라이트 영역까지만, safe area 여백 없음 */
export function BottomNavigationBar({ activeTab }: BottomNavigationBarProps) {
  const router = useRouter();
  const { scale, fontScale } = useResponsive();

  const barHeight = scale(BottomNavigationBarDimensions.height);
  const highlightInset = scale(BottomNavigationBarDimensions.tabHighlightInset);
  const iconSize = scale(BottomNavigationBarDimensions.iconSize);
  const labelSize = fontScale(BottomNavigationBarDimensions.fontSize);

  const handlePress = (tabId: BottomNavTab) => {
    if (tabId === activeTab) {
      requestScreenRefresh();
      return;
    }
    router.navigate(TAB_ROUTES[tabId]);
  };

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['#0A1833', '#122A52']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.bar, { height: barHeight }]}
      >
        {NAV_TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const tint = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;

          return (
            <Pressable
              key={tab.id}
              onPress={() => handlePress(tab.id)}
              style={styles.tabSlot}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              {isActive ? <TabHighlight inset={highlightInset} /> : null}
              <Image
                source={tab.icon}
                style={[styles.icon, { width: iconSize, height: iconSize, tintColor: tint }]}
                resizeMode="contain"
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  {
                    fontSize: labelSize,
                    lineHeight: labelSize * 1.2,
                    color: tint,
                  },
                  isActive && styles.labelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </LinearGradient>
    </View>
  );
}

/** 스크롤 콘텐츠 하단 여백 */
export function bottomNavigationInset(barHeight?: number): number {
  return barHeight ?? BottomNavigationBarDimensions.height;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
  },
  tabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  tabHighlight: {
    ...StyleSheet.absoluteFillObject,
  },
  icon: {
    zIndex: 1,
  },
  label: {
    fontFamily: FontFamily.regular,
    letterSpacing: -0.14,
    zIndex: 1,
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 2,
  },
  labelActive: {
    fontFamily: FontFamily.medium,
  },
});
