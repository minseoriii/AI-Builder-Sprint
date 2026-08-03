import { apiGet } from './client';

export type ApiSeason = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';

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

export function getDefaultGalaxyFilter(): { year: number; season: KoreanSeason } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const season = apiSeasonToKorean(seasonForMonth(month));
  const year = seasonYearForDate(now.getFullYear(), month);
  return { year, season };
}

/** GET /api/v1/galaxy/overview */
export function getGalaxyOverview(
  year: number,
  season: ApiSeason,
): Promise<GalaxyOverviewResponse> {
  const params = new URLSearchParams({
    year: String(year),
    season,
  });
  return apiGet<GalaxyOverviewResponse>(`/api/v1/galaxy/overview?${params.toString()}`);
}
