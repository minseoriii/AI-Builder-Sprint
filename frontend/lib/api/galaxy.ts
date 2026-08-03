import { apiGet, apiPost, apiPut } from './client';

/** 백엔드 Season enum */
export type ApiSeason = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
/** @deprecated ApiSeason 사용 — observatory 호환 alias */
export type Season = ApiSeason;

export type KoreanSeason = '봄' | '여름' | '가을' | '겨울';

export interface ConstellationStat {
  category: string;
  selected_from_north_star: boolean;
  star_count: number;
  ratio: number;
}

export interface CategoryCount {
  category: string;
  star_count: number;
}

export interface GalaxyOverviewResponse {
  year: number;
  season: ApiSeason;
  season_label: string;
  north_star_text: string | null;
  total_star_count: number;
  observed_constellation_count: number;
  active_constellation_count: number;
  observation_days: number;
  unselected_category_star_count: number;
  constellations: ConstellationStat[];
  largest_category: CategoryCount | null;
  smallest_selected_category: CategoryCount | null;
  unobserved_selected_categories: string[];
  summary: { lines: string[] };
}

export interface GalaxyReportListItem {
  id: string;
  year: number;
  season: ApiSeason;
  season_label: string;
  generated_through: string;
  total_star_count: number;
  created_at: string;
}

export interface GalaxyReportListResponse {
  items: GalaxyReportListItem[];
}

export interface TagFrequencyItem {
  value: string;
  count: number;
}

export interface GalaxyReportStatisticsSnapshot {
  year?: number;
  season?: string;
  season_start?: string;
  season_end?: string;
  generated_through?: string;
  north_star_text?: string | null;
  selected_categories?: string[];
  total_star_count?: number;
  observed_constellation_count?: number;
  observation_days?: number;
  overall_distribution?: {
    category: string;
    star_count: number;
    ratio: number;
  }[];
  selected_distribution?: {
    category: string;
    star_count: number;
    ratio: number;
  }[];
  largest_category?: CategoryCount | null;
  smallest_selected_category?: CategoryCount | null;
  unobserved_selected_categories?: string[];
  dimension_tag_frequencies?: {
    dimension: string;
    top_tags: TagFrequencyItem[];
  }[];
  monthly_dominant_categories?: {
    month: string;
    category: string | null;
    star_count: number;
  }[];
  largest_category_tag_trends?: {
    category: string;
    PERSON?: TagFrequencyItem[];
    PLACE?: TagFrequencyItem[];
    ACTIVITY?: TagFrequencyItem[];
    TIME?: TagFrequencyItem[];
    EMOTION?: TagFrequencyItem[];
  } | null;
  north_star_snapshot?: {
    text?: string | null;
    selected_categories?: string[];
  };
}

export interface GalaxyReportAiAnalysis {
  title?: string;
  north_star_alignment?: string;
  dominant_category_analysis?: string;
  record_trend_analysis?: string;
  monthly_change_analysis?: string;
  unobserved_area_analysis?: string;
  closing_observation?: string;
}

export interface GalaxyReportDetailResponse {
  id: string;
  year: number;
  season: ApiSeason;
  season_label: string;
  season_start: string;
  season_end: string;
  generated_through: string;
  created_at: string;
  north_star_snapshot: {
    text?: string | null;
    selected_categories?: string[];
  };
  statistics_snapshot: GalaxyReportStatisticsSnapshot;
  ai_analysis: GalaxyReportAiAnalysis;
  reflection_question: string;
  reflection: string | null;
  reflection_updated_at: string | null;
}

const KOREAN_TO_API: Record<KoreanSeason, ApiSeason> = {
  봄: 'SPRING',
  여름: 'SUMMER',
  가을: 'AUTUMN',
  겨울: 'WINTER',
};

const API_TO_KOREAN: Record<ApiSeason, KoreanSeason> = {
  SPRING: '봄',
  SUMMER: '여름',
  AUTUMN: '가을',
  WINTER: '겨울',
};

export function koreanSeasonToApi(season: KoreanSeason): ApiSeason {
  return KOREAN_TO_API[season];
}

export function apiSeasonToKorean(season: ApiSeason): KoreanSeason {
  return API_TO_KOREAN[season];
}

export function seasonForMonth(month: number): ApiSeason {
  if (month >= 3 && month <= 5) return 'SPRING';
  if (month >= 6 && month <= 8) return 'SUMMER';
  if (month >= 9 && month <= 11) return 'AUTUMN';
  return 'WINTER';
}

/** 겨울(12~2월)은 season_year 규칙 적용 */
export function seasonYearForDate(year: number, month: number): number {
  if (month === 12) return year;
  if (month <= 2) return year - 1;
  return year;
}

export function getDefaultGalaxyFilter(): {
  year: number;
  season: KoreanSeason;
} {
  const now = new Date();
  const month = now.getMonth() + 1;
  const season = apiSeasonToKorean(seasonForMonth(month));
  const year = seasonYearForDate(now.getFullYear(), month);
  return { year, season };
}

/**
 * GET /api/v1/galaxy/overview
 * - getGalaxyOverview(year, season) — 은하감상
 * - getGalaxyOverview({ year?, season? }) / getGalaxyOverview() — 천문연구소
 */
export function getGalaxyOverview(
  yearOrParams?: number | { year?: number; season?: ApiSeason },
  season?: ApiSeason,
): Promise<GalaxyOverviewResponse> {
  if (typeof yearOrParams === 'number') {
    if (!season) {
      throw new Error('getGalaxyOverview(year, season) requires season');
    }
    const params = new URLSearchParams({
      year: String(yearOrParams),
      season,
    });
    return apiGet<GalaxyOverviewResponse>(
      `/api/v1/galaxy/overview?${params.toString()}`,
    );
  }

  const query = new URLSearchParams();
  if (yearOrParams?.year != null) query.set('year', String(yearOrParams.year));
  if (yearOrParams?.season) query.set('season', yearOrParams.season);
  const qs = query.toString();
  return apiGet<GalaxyOverviewResponse>(
    `/api/v1/galaxy/overview${qs ? `?${qs}` : ''}`,
  );
}

/** GET /api/v1/galaxy/reports */
export function listGalaxyReports(): Promise<GalaxyReportListResponse> {
  return apiGet<GalaxyReportListResponse>('/api/v1/galaxy/reports');
}

/** POST /api/v1/galaxy/reports/{year}/{season}/generate */
export function generateGalaxyReport(
  year: number,
  season: ApiSeason,
): Promise<GalaxyReportDetailResponse> {
  return apiPost<GalaxyReportDetailResponse>(
    `/api/v1/galaxy/reports/${year}/${season}/generate`,
    {},
  );
}

/** GET /api/v1/galaxy/reports/{report_id} */
export function getGalaxyReport(
  reportId: string,
): Promise<GalaxyReportDetailResponse> {
  return apiGet<GalaxyReportDetailResponse>(
    `/api/v1/galaxy/reports/${reportId}`,
  );
}

/** PUT /api/v1/galaxy/reports/{report_id}/reflection */
export function saveGalaxyReportReflection(
  reportId: string,
  reflection: string,
): Promise<GalaxyReportDetailResponse> {
  return apiPut<GalaxyReportDetailResponse>(
    `/api/v1/galaxy/reports/${reportId}/reflection`,
    { reflection },
  );
}
