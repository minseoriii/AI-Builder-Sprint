import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { FontFamily, Palette, ValueQuote } from '@/assets_shared';

import type { ReportItem } from './data';
import { panelSurface } from './panelStyles';

export interface ReportCardContentProps {
  title: string;
  message: string;
  period?: string;
}

/** 리포트 카드 공통 본문 (잠금/일반 동일 레이아웃) */
export function ReportCardContent({
  title,
  message,
  period = '',
}: ReportCardContentProps) {
  return (
    <>
      <Text style={styles.title}>{title}</Text>
      <ValueQuote style={styles.messageRow} textStyle={styles.message}>
        {message}
      </ValueQuote>
      {period ? <Text style={styles.period}>{period}</Text> : null}
    </>
  );
}

export interface ReportCardProps {
  item: ReportItem;
}

/** 이전 계절 관측 리포트 카드 */
export function ReportCard({ item }: ReportCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: '/observatory-report',
      params: {
        id: item.id,
        title: item.title,
        period: item.period,
        message: item.message,
      },
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <ReportCardContent
        title={item.title}
        message={item.message}
        period={item.period}
      />
    </Pressable>
  );
}

export const reportCardStyles = StyleSheet.create({
  card: {
    ...panelSurface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    minHeight: 96,
    overflow: 'hidden',
  },
});

const styles = StyleSheet.create({
  card: {
    ...reportCardStyles.card,
  },
  pressed: {
    opacity: 0.85,
  },
  title: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    letterSpacing: -0.2,
    color: Palette.cream,
    marginBottom: 12,
  },
  messageRow: {
    marginBottom: 14,
    justifyContent: 'flex-start',
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  period: {
    fontFamily: FontFamily.extraLight,
    fontSize: 9,
    letterSpacing: -0.1,
    color: Palette.cream,
    alignSelf: 'flex-end',
  },
});
