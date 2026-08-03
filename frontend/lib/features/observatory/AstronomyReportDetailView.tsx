import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Background,
  BackButton,
  ClusterPngIcon,
  FontFamily,
  Palette,
  ResponsiveScreen,
  ValueQuote,
  getClusterLabelColor,
  polarisImage,
  withOpacity,
  type ClusterIndex,
} from '@/assets_shared';
import { formatApiErrorAlert } from '@/lib/api/client';
import {
  getGalaxyReport,
  saveGalaxyReportReflection,
  type GalaxyReportDetailResponse,
} from '@/lib/api/galaxy';

import { ClusterProgressRow } from './ClusterProgressRow';
import { ImpressionModal, ImpressionSection } from './ImpressionModal';
import {
  POLARIS_QUOTE,
  buildReportTitle,
  clusterIndexForCategory,
  formatMonthLabel,
  formatPeriodKo,
  toClusterItems,
  type ClusterItem,
} from './data';
import { panelSurface } from './panelStyles';

const SHAPE_STAR_0 = require('@/assets_shared/stars_png/ic_shapestar0.png');

/** 천문리포트 상세 — GET/PUT /api/v1/galaxy/reports/{id} */
export default function AstronomyReportDetailView() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    period?: string;
  }>();

  const reportId = typeof params.id === 'string' ? params.id : '';
  const fallbackTitle =
    typeof params.title === 'string' ? params.title : '관측 리포트';
  const fallbackPeriod =
    typeof params.period === 'string' ? params.period : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<GalaxyReportDetailResponse | null>(null);
  const [impression, setImpression] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!reportId) {
      setError('리포트 ID가 없습니다.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const detail = await getGalaxyReport(reportId);
      setReport(detail);
      setImpression(detail.reflection?.trim() ?? '');
    } catch (err) {
      console.error('Galaxy report detail load error:', err);
      setError(formatApiErrorAlert(err));
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = useCallback(
    async (text: string) => {
      if (!reportId) return;
      const trimmed = text.trim();
      if (!trimmed) {
        Alert.alert('알림', '종합 소감을 입력해 주세요.');
        return;
      }
      setSaving(true);
      try {
        const updated = await saveGalaxyReportReflection(reportId, trimmed);
        setReport(updated);
        setImpression(updated.reflection?.trim() ?? trimmed);
        setModalVisible(false);
      } catch (err) {
        Alert.alert('저장 실패', formatApiErrorAlert(err));
      } finally {
        setSaving(false);
      }
    },
    [reportId],
  );

  const viewModel = useMemo(() => {
    if (!report) return null;

    const selected =
      report.north_star_snapshot?.selected_categories ??
      report.statistics_snapshot?.selected_categories ??
      [];
    const distribution =
      report.statistics_snapshot?.selected_distribution ??
      selected.map((category) => ({
        category,
        star_count: 0,
        ratio: 0,
      }));

    const clusters = toClusterItems(distribution, selected);
    const constellationCounts = distribution.map((row) => ({
      cluster: clusterIndexForCategory(row.category, selected),
      name: row.category,
      count: row.star_count,
    }));

    const largestCategory =
      report.statistics_snapshot?.largest_category?.category ??
      clusters[0]?.name ??
      selected[0] ??
      '';
    const dominantCluster = clusterIndexForCategory(
      largestCategory,
      selected,
    ) as ClusterIndex;

    const monthly = (report.statistics_snapshot?.monthly_dominant_categories ?? [])
      .filter((m) => m.category)
      .map((m) => ({
        month: formatMonthLabel(m.month),
        name: m.category as string,
        cluster: clusterIndexForCategory(m.category as string, selected),
      }));

    const ai = report.ai_analysis ?? {};
    const title =
      ai.title?.trim() ||
      buildReportTitle(report.year, report.season_label) ||
      fallbackTitle;
    const period =
      formatPeriodKo(report.season_start, report.season_end) || fallbackPeriod;
    const quote =
      report.north_star_snapshot?.text?.trim() ||
      report.statistics_snapshot?.north_star_text?.trim() ||
      POLARIS_QUOTE;

    return {
      title,
      period,
      quote,
      clusters,
      constellationCounts,
      dominantCluster,
      dominantName: largestCategory || '성단',
      mainAnalysis:
        ai.dominant_category_analysis?.trim() ||
        ai.north_star_alignment?.trim() ||
        '',
      keywordAnalysis:
        ai.record_trend_analysis?.trim() ||
        ai.monthly_change_analysis?.trim() ||
        '',
      monthly,
      reflectionQuestion: report.reflection_question,
    };
  }, [fallbackPeriod, fallbackTitle, report]);

  return (
    <ResponsiveScreen style={styles.screen}>
      <Background width={width} height={height} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.navBar}>
          <BackButton onPress={() => router.back()} iconSize={28} />
          <Text style={styles.navTitle} numberOfLines={1}>
            천문연구소 - 천문리포트
          </Text>
          <View style={styles.navSpacer} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Palette.cream} size="large" />
          </View>
        ) : error || !viewModel ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error ?? '리포트를 불러오지 못했습니다.'}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.reportTitle}>{viewModel.title}</Text>
            {viewModel.period ? (
              <Text style={styles.period}>{viewModel.period}</Text>
            ) : null}
            <View style={styles.divider} />

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>01 · 북극성 및 성단 구성</Text>
              <View style={styles.sectionDivider} />

              <Text style={styles.subLabel}>a. 가장 중요한 가치, 북극성</Text>
              <View style={styles.polarisRow}>
                <Image
                  source={polarisImage}
                  style={styles.polarisIcon}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
                <ValueQuote style={styles.quoteWrap} textStyle={styles.quote}>
                  {viewModel.quote}
                </ValueQuote>
              </View>

              <View style={styles.constellationHeader}>
                <Text style={styles.subLabelInline}>b. 성단별 별자리</Text>
                <View style={styles.constellationHintRow}>
                  <Image
                    source={SHAPE_STAR_0}
                    style={styles.hintStar}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                  <Text style={styles.constellationHint}>별자리 개수</Text>
                </View>
              </View>
              <View style={styles.constellationRow}>
                {viewModel.constellationCounts.map((item) => (
                  <View key={item.name} style={styles.constellationItem}>
                    <View style={styles.constellationIconBox}>
                      <ClusterPngIcon cluster={item.cluster} size={40} />
                    </View>
                    <Text
                      style={[
                        styles.constellationName,
                        { color: getClusterLabelColor(item.cluster) },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <View style={styles.countRow}>
                      <Image
                        source={SHAPE_STAR_0}
                        style={styles.countStar}
                        resizeMode="contain"
                        accessibilityIgnoresInvertColors
                      />
                      <Text style={styles.constellationCount}>{item.count}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <Text style={[styles.subLabel, styles.subLabelTop]}>
                c. 성단별 별 개수 통계
              </Text>
              <View style={styles.barList}>
                {viewModel.clusters.map((item: ClusterItem) => (
                  <ClusterProgressRow key={item.name} item={item} />
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>02 · 빛 기록 경향 분석</Text>
              <View style={styles.sectionDivider} />

              <Text style={styles.subLabel}>a. 주요 성단 분석</Text>
              <View style={styles.analysisRow}>
                <View style={styles.analysisIconCol}>
                  <ClusterPngIcon cluster={viewModel.dominantCluster} size={72} />
                  <Text
                    style={[
                      styles.analysisIconLabel,
                      {
                        color: getClusterLabelColor(viewModel.dominantCluster),
                      },
                    ]}
                  >
                    {viewModel.dominantName}
                  </Text>
                </View>
                <Text style={styles.analysisBody}>
                  {viewModel.mainAnalysis || '분석 내용이 아직 없습니다.'}
                </Text>
              </View>

              <Text style={[styles.subLabel, styles.subLabelTop]}>
                b. 주요 키워드 분석
              </Text>
              <Text style={styles.analysisBody}>
                {viewModel.keywordAnalysis || '분석 내용이 아직 없습니다.'}
              </Text>

              <Text style={[styles.subLabel, styles.subLabelTop]}>
                c. 월별 주요 성단 변화
              </Text>
              <View style={styles.monthlyRow}>
                {viewModel.monthly.length > 0 ? (
                  viewModel.monthly.map((item, index) => (
                    <View key={`${item.month}-${item.name}`} style={styles.monthlyGroup}>
                      <MonthlyClusterItem
                        cluster={item.cluster}
                        name={item.name}
                        month={item.month}
                      />
                      {index < viewModel.monthly.length - 1 ? (
                        <Text style={styles.monthlyArrow}>{'>'}</Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.analysisBody}>월별 변화가 아직 없습니다.</Text>
                )}
              </View>
            </View>

            <ImpressionSection
              text={impression}
              onPressEdit={() => setModalVisible(true)}
            />
            {viewModel.reflectionQuestion ? (
              <Text style={styles.reflectionHint}>
                {viewModel.reflectionQuestion}
              </Text>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>

      <ImpressionModal
        visible={modalVisible}
        initialText={impression}
        onClose={() => {
          if (!saving) setModalVisible(false);
        }}
        onSave={handleSave}
      />
    </ResponsiveScreen>
  );
}

function MonthlyClusterItem({
  cluster,
  name,
  month,
}: {
  cluster: ClusterIndex;
  name: string;
  month: string;
}) {
  return (
    <View style={styles.monthlyItem}>
      <View style={styles.monthlyIconBox}>
        <ClusterPngIcon cluster={cluster} size={52} />
      </View>
      <Text
        style={[styles.monthlyName, { color: getClusterLabelColor(cluster) }]}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text style={styles.monthlyMonth}>{month}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#173F72',
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
    color: Palette.cream,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
    gap: 14,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    minHeight: 48,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.light,
    fontSize: 13,
    letterSpacing: -0.1,
    color: Palette.cream,
  },
  navSpacer: {
    width: 52,
  },
  reportTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: Palette.cream,
  },
  period: {
    fontFamily: FontFamily.light,
    fontSize: 13,
    letterSpacing: -0.1,
    color: Palette.cream,
    marginTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: withOpacity(Palette.cream, 0.35),
    marginTop: 10,
    marginBottom: 4,
  },
  card: {
    ...panelSurface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontFamily: FontFamily.light,
    fontSize: 12,
    letterSpacing: -0.1,
    color: Palette.cream,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: withOpacity(Palette.cream, 0.35),
    marginTop: 12,
    marginBottom: 14,
  },
  subLabel: {
    fontFamily: FontFamily.light,
    fontSize: 12,
    letterSpacing: -0.1,
    color: Palette.cream,
    marginBottom: 10,
  },
  subLabelInline: {
    fontFamily: FontFamily.light,
    fontSize: 12,
    letterSpacing: -0.1,
    color: Palette.cream,
  },
  subLabelTop: {
    marginTop: 16,
  },
  polarisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 25,
    marginBottom: 16,
  },
  polarisIcon: {
    width: 64,
    height: 64,
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
    letterSpacing: -0.2,
  },
  constellationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  constellationHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hintStar: {
    width: 12,
    height: 12,
  },
  constellationHint: {
    fontFamily: FontFamily.extraLight,
    fontSize: 11,
    color: Palette.cream,
  },
  constellationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 8,
  },
  constellationItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  constellationIconBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  constellationName: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  countStar: {
    width: 10,
    height: 10,
  },
  constellationCount: {
    fontFamily: FontFamily.extraLight,
    fontSize: 12,
    color: Palette.cream,
  },
  barList: {
    gap: 12,
  },
  analysisRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  analysisIconCol: {
    width: 80,
    alignItems: 'center',
    gap: 6,
  },
  analysisIconLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    textAlign: 'center',
  },
  analysisBody: {
    flex: 1,
    fontFamily: FontFamily.extraLight,
    fontSize: 13,
    lineHeight: 21,
    letterSpacing: -0.1,
    color: Palette.cream,
  },
  monthlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  monthlyGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthlyItem: {
    alignItems: 'center',
    width: 72,
  },
  monthlyIconBox: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthlyName: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  monthlyMonth: {
    fontFamily: FontFamily.extraLight,
    fontSize: 11,
    color: Palette.cream,
    marginTop: 2,
  },
  monthlyArrow: {
    fontFamily: FontFamily.extraLight,
    fontSize: 18,
    color: Palette.cream,
    marginHorizontal: 4,
  },
  reflectionHint: {
    fontFamily: FontFamily.extraLight,
    fontSize: 12,
    lineHeight: 18,
    color: Palette.cream,
    paddingHorizontal: 4,
  },
});
