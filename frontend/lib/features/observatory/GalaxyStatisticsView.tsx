import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  FontFamily,
  Palette,
  ValueQuote,
  polarisImage,
  showConnectionError,
  withOpacity,
} from '@/assets_shared';
import { getHome, type HomeConstellation } from '@/lib/api/daily-records';
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
import { logHandledApiError } from '@/lib/api/logHandledApiError';

/** 별이 1개 이상인 별자리(성단 카테고리) 개수 */
function countObservedConstellations(constellations: HomeConstellation[]): number {
  return constellations.filter((c) => c.star_count > 0).length;
}

/** 별이 가장 많이 등록된 성단 이름 */
function largestCategoryName(constellations: HomeConstellation[]): string {
  let best: HomeConstellation | null = null;
  for (const item of constellations) {
    if (item.star_count <= 0) continue;
    if (!best || item.star_count > best.star_count) {
      best = item;
    }
  }
  return best?.category ?? '-';
}

export interface GalaxyStatisticsViewProps {
  northStarText?: string;
  refreshKey?: number;
}

/** 은하 관측 통계 탭 — 요약은 GET /api/v1/home, 계절·노트는 overview */
export function GalaxyStatisticsView({
  northStarText: northStarTextProp,
  refreshKey = 0,
}: GalaxyStatisticsViewProps = {}) {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState('');
  const [quote, setQuote] = useState(POLARIS_QUOTE);
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([]);
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    try {
      const [home, overview] = await Promise.all([
        getHome(),
        getGalaxyOverview(),
      ]);

      const { start, end } = getSeasonDateRange(overview.year, overview.season);
      const dDay = daysUntilSeasonEnd(overview.year, overview.season);
      const northStar =
        home.north_star_text?.trim() ||
        overview.north_star_text?.trim() ||
        northStarTextProp?.trim() ||
        POLARIS_QUOTE;

      const selected = home.constellations
        .filter((c) => c.selected_from_north_star)
        .map((c) => c.category);
      const totalStars = home.total_star_count;
      const selectedRows = (
        selected.length > 0
          ? home.constellations.filter((c) => c.selected_from_north_star)
          : home.constellations
      ).map((c) => ({
        category: c.category,
        star_count: c.star_count,
        ratio: totalStars > 0 ? c.star_count / totalStars : 0,
      }));

      setTitle(buildStatsTitle(overview.year, overview.season_label));
      setPeriod(formatPeriodKo(start, end));
      setQuote(northStar);
      setSummaryItems([
        { label: '전체 별', value: `${totalStars}개` },
        {
          label: '별자리',
          value: `${countObservedConstellations(home.constellations)}개`,
        },
        {
          label: '주요 성단',
          value: largestCategoryName(home.constellations),
        },
        { label: '계절 종료', value: `D-${dDay}` },
      ]);
      setClusters(toClusterItems(selectedRows, selected));
      setNote(
        overview.summary.lines.filter(Boolean).join(' ') ||
          '아직 관측 요약이 없습니다.',
      );
    } catch (err) {
      logHandledApiError('Galaxy statistics load error', err);
      setHasError(true);
      showConnectionError({ onRetry: () => void load() });
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

  if (hasError) {
    return <View style={styles.center} />;
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
