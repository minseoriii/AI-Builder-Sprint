import { apiGet, apiPost, apiPut } from './client';

export interface OnboardingStatusResponse {
  onboarding_completed: boolean;
  north_star: {
    text: string;
    selected_categories: string[];
  } | null;
}

export interface NorthStarCandidate {
  category: string;
  score: number;
  recommended: boolean;
  reason: string;
  evidence?: string[];
}

export interface AnalyzeNorthStarResponse {
  analysis_id: string;
  candidates: NorthStarCandidate[];
}

/** GET /api/v1/me/onboarding — 앱 진입 시 온보딩 완료 여부 확인 */
export function getOnboardingStatus(): Promise<OnboardingStatusResponse> {
  return apiGet<OnboardingStatusResponse>('/api/v1/me/onboarding');
}

/** POST /api/v1/onboarding/north-star/analyze */
export function analyzeNorthStar(text: string): Promise<AnalyzeNorthStarResponse> {
  return apiPost<AnalyzeNorthStarResponse>(
    '/api/v1/onboarding/north-star/analyze',
    { text },
  );
}

/** PUT /api/v1/onboarding/north-star */
export function saveNorthStar(
  analysisId: string,
  selectedCategories: string[],
): Promise<OnboardingStatusResponse> {
  return apiPut<OnboardingStatusResponse>('/api/v1/onboarding/north-star', {
    analysis_id: analysisId,
    selected_categories: selectedCategories,
  });
}
