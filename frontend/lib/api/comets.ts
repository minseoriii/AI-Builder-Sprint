import { apiDelete, apiGet, apiPost, apiPut } from './client';

export type CometStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type CometSourceType = 'AI_RECOMMENDATION' | 'USER_CREATED';
export type CometRecordStatus = 'RECORDED' | 'STAR_CREATED';

export interface CometItem {
  id: string;
  source_type: CometSourceType;
  target_category: string;
  title: string;
  description: string | null;
  reason: string | null;
  status: CometStatus;
  created_at: string;
  target_completion_date: string | null;
  completed_on: string | null;
  completed_at: string | null;
  activity_summary: string | null;
  record_status: CometRecordStatus | null;
  star_id: string | null;
}

export interface CometListResponse {
  items: CometItem[];
}

export interface CometCreateRequest {
  title: string;
  target_category: string;
  description?: string | null;
  target_completion_date?: string | null;
}

export interface CometUpdateRequest {
  title?: string;
  target_category?: string;
  description?: string | null;
  target_completion_date?: string | null;
  activity_summary?: string;
}

export interface CometCompleteRequest {
  activity_summary: string;
  completed_on?: string;
}

export interface CometCompleteResponse {
  comet_id: string;
  completed_on: string;
  activity_summary: string;
  record_status: CometRecordStatus;
}

export interface CometCreateStarResponse {
  comet_id: string;
  star_id: string;
  category: string;
  recorded_on: string;
  record_status: CometRecordStatus;
}

export interface CometRecommendationItem {
  id: string;
  target_category: string;
  title: string;
  description: string;
  reason: string;
  estimated_minutes: number;
  expires_at: string;
}

export interface CometRecommendationGenerateResponse {
  recommendation: CometRecommendationItem;
  reused: boolean;
}

export interface CometRecommendationCurrentResponse {
  recommendation: CometRecommendationItem | null;
}

/** GET /api/v1/comets */
export function listComets(status?: CometStatus): Promise<CometListResponse> {
  const query = status ? `?status=${status}` : '';
  return apiGet<CometListResponse>(`/api/v1/comets${query}`);
}

/** POST /api/v1/comets */
export function createComet(payload: CometCreateRequest): Promise<CometItem> {
  return apiPost<CometItem>('/api/v1/comets', payload);
}

/** PUT /api/v1/comets/{id} */
export function updateComet(
  cometId: string,
  payload: CometUpdateRequest,
): Promise<CometItem> {
  return apiPut<CometItem>(`/api/v1/comets/${cometId}`, payload);
}

/** DELETE /api/v1/comets/{id} */
export function deleteComet(cometId: string): Promise<void> {
  return apiDelete(`/api/v1/comets/${cometId}`);
}

/** POST /api/v1/comets/{id}/complete */
export function completeComet(
  cometId: string,
  payload: CometCompleteRequest,
): Promise<CometCompleteResponse> {
  return apiPost<CometCompleteResponse>(
    `/api/v1/comets/${cometId}/complete`,
    payload,
  );
}

/** POST /api/v1/comets/{id}/create-star */
export function createStarFromComet(
  cometId: string,
): Promise<CometCreateStarResponse> {
  return apiPost<CometCreateStarResponse>(
    `/api/v1/comets/${cometId}/create-star`,
  );
}

/** POST /api/v1/comet-recommendations/generate */
export function generateCometRecommendation(): Promise<CometRecommendationGenerateResponse> {
  return apiPost<CometRecommendationGenerateResponse>(
    '/api/v1/comet-recommendations/generate',
  );
}

/** POST /api/v1/comet-recommendations/{id}/accept */
export function acceptCometRecommendation(
  recommendationId: string,
): Promise<CometItem> {
  return apiPost<CometItem>(
    `/api/v1/comet-recommendations/${recommendationId}/accept`,
  );
}

/** GET /api/v1/comet-recommendations/current */
export function getCurrentCometRecommendation(): Promise<CometRecommendationCurrentResponse> {
  return apiGet<CometRecommendationCurrentResponse>(
    '/api/v1/comet-recommendations/current',
  );
}

/** 로컬 날짜 YYYY-MM-DD (Asia/Seoul 근사 — 기기 로컬) */
export function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function padDatePart(value: string): string {
  const n = parseInt(value.trim(), 10);
  if (!Number.isFinite(n)) return value.trim();
  return String(n).padStart(2, '0');
}

export function toIsoDate(year: string, month: string, day: string): string {
  return `${year.trim()}-${padDatePart(month)}-${padDatePart(day)}`;
}

export function splitIsoDate(iso: string | null | undefined): {
  year: string;
  month: string;
  day: string;
} {
  if (!iso) return { year: '', month: '', day: '' };
  const datePart = iso.slice(0, 10);
  const [y = '', m = '', d = ''] = datePart.split('-');
  return {
    year: y,
    month: m.replace(/^0/, '') || m,
    day: d.replace(/^0/, '') || d,
  };
}
