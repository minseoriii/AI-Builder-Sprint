import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, Palette, withOpacity } from '@/assets_shared';

import type { ClusterItem } from './data';

export interface ClusterProgressRowProps {
  item: ClusterItem;
}

/** 성단별 진행 막대 행 */
export function ClusterProgressRow({ item }: ClusterProgressRowProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.name, { color: item.color }]}>{item.name}</Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${item.percent}%`,
              backgroundColor: item.color,
            },
          ]}
        />
      </View>
      <Text style={styles.meta}>{item.percent}%</Text>
      <Text style={styles.count}>{item.count}개</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    width: 72,
    letterSpacing: -0.2,
    flexShrink: 0,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 99,
    backgroundColor: withOpacity('#FFFFFF', 0.08),
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
  meta: {
    fontFamily: FontFamily.extraLight,
    fontSize: 12,
    minWidth: 34,
    textAlign: 'right',
    color: Palette.cream,
    flexShrink: 0,
  },
  count: {
    fontFamily: FontFamily.extraLight,
    fontSize: 12,
    minWidth: 28,
    textAlign: 'right',
    color: Palette.cream,
    flexShrink: 0,
  },
});
