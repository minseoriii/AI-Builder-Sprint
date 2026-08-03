import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, Palette } from '@/assets_shared';

import type { SummaryItem } from './data';
import { panelSurface } from './panelStyles';

export interface SummaryStatCardProps {
  item: SummaryItem;
}

/** 통계 요약 카드 (전체 별 / 별자리 / 주요 성단 / 계절 종료) — 정사각형 */
export function SummaryStatCard({ item }: SummaryStatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{item.value}</Text>
      <Text style={styles.label}>{item.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...panelSurface,
    flex: 1,
    minWidth: 0,
    aspectRatio: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  value: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.4,
    color: Palette.cream,
    textAlign: 'center',
    width: '100%',
  },
  label: {
    fontFamily: FontFamily.extraLight,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: -0.2,
    color: Palette.cream,
    textAlign: 'center',
    width: '100%',
  },
});
