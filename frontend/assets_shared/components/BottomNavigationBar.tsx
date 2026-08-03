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
  fontSize: 11,
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
/** 비포커스 탭 — 회색 */
const INACTIVE_COLOR = '#8B93A7';

const CREAM = Palette.creamActive;

/**
 * 활성 탭 글로우 — 탭보다 넓게 퍼지며 가장자리는 완전 투명.
 * 슬롯 overflow에 잘리지 않도록 바 레벨에 1회만 렌더.
 */
function TabHighlight({
  tabIndex,
  tabCount,
}: {
  tabIndex: number;
  tabCount: number;
}) {
  const tabWidth = 100 / tabCount;
  const glowWidth = tabWidth * 1.55;
  const left = tabIndex * tabWidth - (glowWidth - tabWidth) / 2;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.tabHighlight,
        {
          left: `${left}%`,
          width: `${glowWidth}%`,
        },
      ]}
    >
      <LinearGradient
        colors={[
          withOpacity(CREAM, 0),
          withOpacity(CREAM, 0.05),
          withOpacity(CREAM, 0.14),
          withOpacity(CREAM, 0.22),
          withOpacity(CREAM, 0.28),
          withOpacity(CREAM, 0.22),
          withOpacity(CREAM, 0.14),
          withOpacity(CREAM, 0.05),
          withOpacity(CREAM, 0),
        ]}
        locations={[0, 0.1, 0.22, 0.36, 0.5, 0.64, 0.78, 0.9, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
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
  const iconSize = scale(BottomNavigationBarDimensions.iconSize);
  const labelSize = fontScale(BottomNavigationBarDimensions.fontSize);
  const activeIndex = NAV_TABS.findIndex((tab) => tab.id === activeTab);

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
        {activeIndex >= 0 ? (
          <TabHighlight tabIndex={activeIndex} tabCount={NAV_TABS.length} />
        ) : null}

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
    overflow: 'hidden',
  },
  tabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    zIndex: 1,
  },
  tabHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 0,
  },
  icon: {
    zIndex: 1,
  },
  label: {
    fontFamily: FontFamily.light,
    letterSpacing: -0.14,
    zIndex: 1,
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 2,
  },
  labelActive: {
    fontFamily: FontFamily.light,
  },
});
