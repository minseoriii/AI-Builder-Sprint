import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette, withOpacity } from '../colors';
import { FontFamily } from '../typography';
import {
  icComet,
  icGalaxyView,
  icHome,
  icLab,
  icMyPage,
} from '../images/navigation';

export type BottomNavTab = 'galaxy' | 'observatory' | 'home' | 'comet' | 'mypage';

export const BottomNavigationBarDimensions = {
  designWidth: 412,
  height: 86,
  tabHighlightWidth: 69,
  tabHighlightHeight: 86,
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
const HIGHLIGHT_COLOR = withOpacity(Palette.creamActive, 0.35);

export interface BottomNavigationBarProps {
  activeTab: BottomNavTab;
}

/** 412×86 하단 탭 바 — 5개 화면 공용 */
export function BottomNavigationBar({ activeTab }: BottomNavigationBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handlePress = (tabId: BottomNavTab) => {
    if (tabId === activeTab) return;
    router.replace(TAB_ROUTES[tabId]);
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={['#0A1833', '#122A52']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bar}
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
              {isActive ? (
                <View style={styles.tabHighlight} pointerEvents="none" />
              ) : null}
              <Image
                source={tab.icon}
                style={[
                  styles.icon,
                  { tintColor: tint },
                ]}
                resizeMode="contain"
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: tint },
                  isActive ? styles.labelActive : null,
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

/** 스크롤 콘텐츠 하단 여백 (safe area 포함) */
export function bottomNavigationInset(bottomInset: number): number {
  return BottomNavigationBarDimensions.height + bottomInset;
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
    height: BottomNavigationBarDimensions.height,
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    maxWidth: BottomNavigationBarDimensions.designWidth,
    alignSelf: 'center',
  },
  tabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabHighlight: {
    position: 'absolute',
    top: 0,
    width: BottomNavigationBarDimensions.tabHighlightWidth,
    height: BottomNavigationBarDimensions.tabHighlightHeight,
    backgroundColor: HIGHLIGHT_COLOR,
  },
  icon: {
    width: BottomNavigationBarDimensions.iconSize,
    height: BottomNavigationBarDimensions.iconSize,
  },
  label: {
    fontFamily: FontFamily.regular,
    fontSize: BottomNavigationBarDimensions.fontSize,
    lineHeight: BottomNavigationBarDimensions.fontSize * 1.2,
    letterSpacing: -0.14,
  },
  labelActive: {
    fontFamily: FontFamily.medium,
  },
});
