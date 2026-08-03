import { apiGet } from './client';
import type { DailyRecordTags } from './daily-records';

export interface StarDetailResponse {
  id: string;
  source_type: string;
  category: string;
  recorded_on: string;
  recorded_year: number;
  recorded_month: number;
  recorded_day: number;
  content: string;
  tags: DailyRecordTags | null;
}

export interface ConstellationStarsResponse {
  category: string;
  stars: StarDetailResponse[];
}

/** GET /api/v1/constellations/{category}/stars */
export function getConstellationStars(
  category: string,
): Promise<ConstellationStarsResponse> {
  const encoded = encodeURIComponent(category);
  return apiGet<ConstellationStarsResponse>(`/api/v1/constellations/${encoded}/stars`);
}

/** GET /api/v1/stars/{star_id} */
export function getStarDetail(starId: string): Promise<StarDetailResponse> {
  return apiGet<StarDetailResponse>(`/api/v1/stars/${starId}`);
}
