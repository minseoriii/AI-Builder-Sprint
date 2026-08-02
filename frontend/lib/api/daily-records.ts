import { apiGet, apiPost, apiPut } from './client';

/** 백엔드 CONSTELLATION_CATEGORIES 와 동일 */
export const CONSTELLATION_CATEGORIES = [
  '가족',
  '관계·사랑',
  '건강',
  '성장·배움',
  '커리어·성취',
  '재정적 안정',
  '자율·독립',
  '창의성·표현',
  '기여·봉사',
  '영성·신념',
  '즐거움·여가',
  '모험·도전',
  '소속감·공동체',
  '진정성·자기다움',
  '리더십·영향력',
  '균형·조화',
] as const;

export type ConstellationCategory = (typeof CONSTELLATION_CATEGORIES)[number];

export type DailyRecordDimension =
  | 'PERSON'
  | 'PLACE'
  | 'ACTIVITY'
  | 'TIME'
  | 'EMOTION';

export const DAILY_RECORD_DIMENSIONS: DailyRecordDimension[] = [
  'PERSON',
  'PLACE',
  'ACTIVITY',
  'TIME',
  'EMOTION',
];

export type DailyRecordTags = Record<DailyRecordDimension, string[]>;

export interface MissingQuestion {
  dimension: DailyRecordDimension;
  question: string;
}

export type DailyRecordAnalysisStatus =
  | 'NEEDS_INPUT'
  | 'READY_FOR_REVIEW'
  | 'READY_FOR_CONFIRMATION'
  | 'CONFIRMED'
  | 'EXPIRED';

export interface AnalyzeDailyRecordResponse {
  analysis_id: string;
  status: DailyRecordAnalysisStatus;
  original_text: string;
  tags: DailyRecordTags;
  missing_questions: MissingQuestion[];
}

export interface CategoryRankingItem {
  category: string;
  score: number;
  reason: string;
}

export interface UpdateDailyRecordDetailsResponse {
  analysis_id: string;
  status: DailyRecordAnalysisStatus;
  original_text: string;
  recorded_on: string;
  tags: DailyRecordTags;
  primary_category: string;
  category_ranking: CategoryRankingItem[];
}

export interface ConfirmDailyRecordResponse {
  daily_record_id: string;
  star_id: string;
  primary_category: string;
  recorded_on: string;
}

export interface HomeConstellation {
  category: string;
  selected_from_north_star: boolean;
  star_count: number;
  stars: { id: string; source_type: string; recorded_on: string; preview: string }[];
}

export interface HomeResponse {
  north_star_text: string | null;
  today_recorded: boolean;
  total_star_count: number;
  constellations: HomeConstellation[];
  comet_recommendation: unknown | null;
}

/** 로컬 날짜 YYYY-MM-DD (recorded_on) */
export function todayRecordedOn(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 제어 문자 제거 후 trim — 빈 문자열은 제외 */
export function sanitizeTag(tag: string): string {
  return tag.replace(/[\r\n\t\f\v]/g, '').trim();
}

export function sanitizeTagList(tags: string[]): string[] {
  return tags.map(sanitizeTag).filter((tag) => tag.length > 0);
}

export function sanitizeDailyRecordTags(tags: DailyRecordTags): DailyRecordTags {
  const sanitized = {} as DailyRecordTags;
  for (const dimension of DAILY_RECORD_DIMENSIONS) {
    sanitized[dimension] = sanitizeTagList(tags[dimension] ?? []);
  }
  return sanitized;
}

/** PUT details 요청용 — 정제 후 빈 차원은 '미입력'으로 채움 */
export function sanitizeDailyRecordTagsForRequest(
  tags: DailyRecordTags,
): DailyRecordTags {
  const sanitized = sanitizeDailyRecordTags(tags);
  for (const dimension of DAILY_RECORD_DIMENSIONS) {
    if (sanitized[dimension].length === 0) {
      sanitized[dimension] = ['미입력'];
    }
  }
  return sanitized;
}

/** POST /api/v1/daily-records/analyze */
export function analyzeDailyRecord(
  text: string,
  recordedOn: string = todayRecordedOn(),
): Promise<AnalyzeDailyRecordResponse> {
  return apiPost<AnalyzeDailyRecordResponse>('/api/v1/daily-records/analyze', {
    text,
    recorded_on: recordedOn,
  });
}

/** PUT /api/v1/daily-records/analyses/{id}/details */
export function updateDailyRecordDetails(
  analysisId: string,
  tags: DailyRecordTags,
): Promise<UpdateDailyRecordDetailsResponse> {
  return apiPut<UpdateDailyRecordDetailsResponse>(
    `/api/v1/daily-records/analyses/${analysisId}/details`,
    { tags: sanitizeDailyRecordTagsForRequest(tags) },
  );
}

/** POST /api/v1/daily-records/analyses/{id}/confirm */
export function confirmDailyRecord(
  analysisId: string,
  primaryCategory: string,
): Promise<ConfirmDailyRecordResponse> {
  return apiPost<ConfirmDailyRecordResponse>(
    `/api/v1/daily-records/analyses/${analysisId}/confirm`,
    { primary_category: primaryCategory },
  );
}

/** GET /api/v1/home */
export function getHome(): Promise<HomeResponse> {
  return apiGet<HomeResponse>('/api/v1/home');
}
