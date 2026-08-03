import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FontFamily, Palette, ValueQuote, polarisImage, withOpacity } from '@/assets_shared';
import { formatApiErrorAlert } from '@/lib/api/client';
import { getGalaxyOverview } from '@/lib/api/galaxy';

import { ClusterProgressRow } from './ClusterProgressRow';
import { ObservationNoteCard } from './ObservationNoteCard';
import { SummaryStatCard } from './SummaryStatCard';
import {
  POLARIS_QUOTE,
  buildStatsTitle,
  daysUntilSeasonEnd,
  formatPeriodKo,
  getSeasonDateRange,
  toClusterItems,
  type ClusterItem,
  type SummaryItem,
} from './data';
import { panelSurface } from './panelStyles';

export interface GalaxyStatisticsViewProps {
  northStarText?: string;
  refreshKey?: number;
}

/** 은하 관측 통계 탭 — GET /api/v1/galaxy/overview */
export function GalaxyStatisticsView({
  northStarText: northStarTextProp,
  refreshKey = 0,
}: GalaxyStatisticsViewProps = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState('');
  const [quote, setQuote] = useState(POLARIS_QUOTE);
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([]);
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await getGalaxyOverview();
      const selected = overview.constellations.map((c) => c.category);
      const { start, end } = getSeasonDateRange(overview.year, overview.season);
      const dDay = daysUntilSeasonEnd(overview.year, overview.season);
      const northStar =
        overview.north_star_text?.trim() ||
        northStarTextProp?.trim() ||
        POLARIS_QUOTE;

      setTitle(buildStatsTitle(overview.year, overview.season_label));
      setPeriod(formatPeriodKo(start, end));
      setQuote(northStar);
      setSummaryItems([
        { label: '전체 별', value: `${overview.total_star_count}개` },
        {
          label: '별자리',
          value: `${overview.observed_constellation_count}개`,
        },
        {
          label: '주요 성단',
          value: overview.largest_category?.category ?? '-',
        },
        { label: '계절 종료', value: `D-${dDay}` },
      ]);
      setClusters(toClusterItems(overview.constellations, selected));
      setNote(
        overview.summary.lines.filter(Boolean).join(' ') ||
          '아직 관측 요약이 없습니다.',
      );
    } catch (err) {
      console.error('Galaxy overview load error:', err);
      setError(formatApiErrorAlert(err));
    } finally {
      setLoading(false);
    }
  }, [northStarTextProp]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Palette.cream} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.period}>{period}</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.polarisRow}>
        <Image
          source={polarisImage}
          style={styles.polarisIcon}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <ValueQuote style={styles.quoteWrap} textStyle={styles.quote}>
          {quote}
        </ValueQuote>
      </View>

      <View style={styles.summaryRow}>
        {summaryItems.map((item) => (
          <SummaryStatCard key={item.label} item={item} />
        ))}
      </View>

      <View style={styles.clusterCard}>
        <Text style={styles.sectionLabel}>은하 내부 성단 구성 현황</Text>
        <View style={styles.sectionDivider} />
        <View style={styles.clusterList}>
          {clusters.length > 0 ? (
            clusters.map((item) => (
              <ClusterProgressRow key={item.name} item={item} />
            ))
          ) : (
            <Text style={styles.emptyHint}>아직 관측된 성단이 없습니다.</Text>
          )}
        </View>
      </View>

      <ObservationNoteCard body={note} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 20,
    gap: 16,
  },
  center: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
    color: Palette.cream,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: FontFamily.extraLight,
    fontSize: 12,
    color: Palette.cream,
    textAlign: 'center',
    paddingVertical: 8,
  },
  headerBlock: {
    paddingTop: 8,
  },
  title: {
    fontFamily: FontFamily.medium,
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: Palette.cream,
    marginBottom: 6,
  },
  period: {
    fontFamily: FontFamily.extraLight,
    fontSize: 13,
    letterSpacing: -0.1,
    color: Palette.cream,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: withOpacity(Palette.cream, 0.45),
    marginTop: 14,
  },
  polarisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 25,
    paddingVertical: 2,
  },
  polarisIcon: {
    width: 88,
    height: 88,
    marginLeft: 17,
  },
  quoteWrap: {
    flex: 1,
    minWidth: 0,
    maxWidth: 220,
    justifyContent: 'flex-start',
  },
  quote: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  clusterCard: {
    ...panelSurface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionLabel: {
    fontFamily: FontFamily.extraLight,
    fontSize: 13,
    letterSpacing: -0.2,
    color: Palette.cream,
    marginBottom: 10,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: withOpacity(Palette.cream, 0.45),
    marginBottom: 14,
  },
  clusterList: {
    gap: 14,
  },
});
