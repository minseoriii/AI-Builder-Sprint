import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, Palette, withOpacity } from '@/assets_shared';

import { panelSurface } from './panelStyles';

export interface ObservationNoteCardProps {
  title?: string;
  body: string;
}

/** 현재 은하 관측 경향 노트 카드 */
export function ObservationNoteCard({
  title = '현재 은하 관측 경향 노트',
  body,
}: ObservationNoteCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.divider} />
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...panelSurface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontFamily: FontFamily.extraLight,
    fontSize: 13,
    letterSpacing: -0.2,
    color: Palette.cream,
    marginBottom: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: withOpacity(Palette.cream, 0.45),
    marginBottom: 12,
  },
  body: {
    fontFamily: FontFamily.light,
    fontSize: 13,
    lineHeight: 21,
    letterSpacing: -0.1,
    color: Palette.cream,
  },
});
