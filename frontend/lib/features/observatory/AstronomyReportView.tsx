import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FontFamily, Palette } from '@/assets_shared';
import { formatApiErrorAlert } from '@/lib/api/client';
import {
  getGalaxyOverview,
  listGalaxyReports,
  type GalaxyReportListItem,
} from '@/lib/api/galaxy';

import { LockedReportCard } from './LockedReportCard';
import { ReportCard } from './ReportCard';
import {
  POLARIS_QUOTE,
  buildLockedReportMessage,
  buildReportTitle,
  formatPeriodKo,
  getCurrentSeasonPeriod,
  getSeasonDateRange,
  isSameSeasonPeriod,
  type ReportItem,
} from './data';

export interface AstronomyReportViewProps {
  northStarText?: string;
  refreshKey?: number;
}

/** 천문리포트 탭 — GET /api/v1/galaxy/reports (+ 현재 계절 잠금 카드) */
export function AstronomyReportView({
  northStarText = '',
  refreshKey = 0,
}: AstronomyReportViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState<{
    title: string;
    message: string;
    period: string;
  } | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const current = getCurrentSeasonPeriod();
      const { start, end } = getSeasonDateRange(current.year, current.season);

      const [overview, list] = await Promise.all([
        getGalaxyOverview({ year: current.year, season: current.season }),
        listGalaxyReports(),
      ]);

      setLocked({
        title: buildReportTitle(overview.year, overview.season_label),
        message: buildLockedReportMessage(overview.year, overview.season_label),
        period: formatPeriodKo(start, end),
      });

      const quote =
        overview.north_star_text?.trim() ||
        northStarText.trim() ||
        POLARIS_QUOTE;

      const past = (list.items ?? [])
        .filter(
          (item: GalaxyReportListItem) =>
            !isSameSeasonPeriod(
              { year: item.year, season: item.season },
              { year: current.year, season: current.season },
            ),
        )
        .map((item: GalaxyReportListItem) => {
          const range = getSeasonDateRange(item.year, item.season);
          return {
            id: item.id,
            title: buildReportTitle(item.year, item.season_label),
            message: quote,
            period: formatPeriodKo(range.start, range.end),
            year: item.year,
            season: item.season,
            seasonLabel: item.season_label,
          } satisfies ReportItem;
        });

      setReports(past);
    } catch (err) {
      console.error('Galaxy reports load error:', err);
      setError(formatApiErrorAlert(err));
    } finally {
      setLoading(false);
    }
  }, [northStarText]);

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
      {locked ? (
        <LockedReportCard
          title={locked.title}
          message={northStarText.trim() || POLARIS_QUOTE}
          lockMessage={locked.message}
          period={locked.period}
        />
      ) : null}
      {reports.map((item) => (
        <ReportCard key={item.id} item={item} />
      ))}
      {reports.length === 0 ? (
        <Text style={styles.emptyHint}>
          지난 계절 리포트가 아직 없습니다.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
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
    fontSize: 13,
    color: Palette.cream,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
