import { apiGet, apiPost, apiPut } from './client';

/** 백엔드 Season enum */
export type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';

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
  season: Season;
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
  season: Season;
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
  season: Season;
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

/** GET /api/v1/galaxy/overview */
export function getGalaxyOverview(params?: {
  year?: number;
  season?: Season;
}): Promise<GalaxyOverviewResponse> {
  const query = new URLSearchParams();
  if (params?.year != null) query.set('year', String(params.year));
  if (params?.season) query.set('season', params.season);
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
  season: Season,
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
