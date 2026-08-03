import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { FontFamily, Palette } from '@/assets_shared';

import { ReportCardContent, reportCardStyles } from './ReportCard';
import { POLARIS_QUOTE } from './data';

export interface LockedReportCardProps {
  title: string;
  message?: string;
  lockMessage: string;
  period?: string;
}

/**
 * 현재 계절 잠금 리포트 — 일반 카드와 동일 레이아웃 + #050040 50% 오버레이.
 * TODO: 레포에 lock PNG 에셋이 없어 @expo/vector-icons Ionicons 사용.
 */
export function LockedReportCard({
  title,
  message = '',
  lockMessage,
  period = '',
}: LockedReportCardProps) {
  return (
    <View
      style={styles.card}
      pointerEvents="none"
      accessibilityState={{ disabled: true }}
    >
      <ReportCardContent
        title={title}
        message={message.trim() || POLARIS_QUOTE}
        period={period}
      />

      <View style={styles.overlay}>
        {/* TODO: replace with dedicated lock asset when available */}
        <Ionicons name="lock-closed" size={36} color={Palette.creamActive} />
        <Text style={styles.lockMessage}>{lockMessage}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...reportCardStyles.card,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 0, 64, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  lockMessage: {
    fontFamily: FontFamily.extraLight,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.1,
    color: Palette.cream,
    textAlign: 'center',
  },
});
