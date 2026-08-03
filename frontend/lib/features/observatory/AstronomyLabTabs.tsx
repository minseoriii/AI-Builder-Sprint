import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamily, Palette, withOpacity } from '@/assets_shared';

import type { LabSubTab } from './data';

const TABS: { id: LabSubTab; label: string }[] = [
  { id: 'stats', label: '은하 관측 통계' },
  { id: 'report', label: '천문리포트' },
];

export interface AstronomyLabTabsProps {
  activeTab: LabSubTab;
  onChange: (tab: LabSubTab) => void;
}

/** 천문연구소 세그먼트 탭 — 은하 관측 통계 / 천문리포트 */
export function AstronomyLabTabs({ activeTab, onChange }: AstronomyLabTabsProps) {
  return (
    <View style={styles.row}>
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.tab, active ? styles.tabActive : styles.tabInactive]}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  tabActive: {
    backgroundColor: withOpacity(Palette.cream, 0.15),
    borderColor: withOpacity(Palette.cream, 0.6),
  },
  tabInactive: {
    backgroundColor: withOpacity('#0A1833', 0.45),
    borderColor: withOpacity(Palette.cream, 0.25),
  },
  label: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: -0.2,
    color: Palette.cream,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    paddingTop: 0,
    paddingBottom: 0,
  },
  labelActive: {
    fontFamily: FontFamily.medium,
    color: Palette.cream,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
