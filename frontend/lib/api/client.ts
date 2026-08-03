import { showConnectionError } from '@/assets_shared/hooks/connectionErrorBus';
import { getValidAccessToken, refreshAccessToken } from '@/lib/supabase';
import { getApiBaseUrl } from '@/lib/env';

/** 인라인 검증 UI로 처리하는 코드 — 전역 연결 모달 생략 */
const INLINE_ERROR_CODES = new Set([
  'INVALID_SELECTION',
  'INVALID_REFLECTION',
  'NORTH_STAR_SEASON_LOCKED',
]);

function reportConnectionError(error: ApiRequestError): void {
  if (error.code && INLINE_ERROR_CODES.has(error.code)) return;
  showConnectionError();
}

interface ApiErrorDetail {
  code?: string;
  message?: string;
}

export class ApiRequestError extends Error {
  url: string;
  status: number | null;
  code: string | null;

  constructor(
    message: string,
    url: string,
    status: number | null,
    code: string | null = null,
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.url = url;
    this.status = status;
    this.code = code;
  }
}

export function buildApiUrl(endpointPath: string): string {
  let baseUrl = getApiBaseUrl();
  baseUrl = baseUrl.replace(/\/+$/, '');

  if (baseUrl.endsWith('/api/v1')) {
    baseUrl = baseUrl.slice(0, -'/api/v1'.length);
  }

  const formattedPath = endpointPath.startsWith('/')
    ? endpointPath
    : `/${endpointPath}`;

  return `${baseUrl}${formattedPath}`;
}

export async function buildApiHeaders(): Promise<Record<string, string>> {
  const accessToken = await getValidAccessToken();
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

function messageForErrorCode(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'NORTH_STAR_SEASON_LOCKED':
      return '현재 계절 동안은 북극성을 수정할 수 없습니다.';
    case 'INVALID_SELECTION':
      return '성단은 정확히 5개를 선택해야 합니다.';
    case 'ANALYSIS_EXPIRED':
      return '분석 결과가 만료되었습니다. 다시 시도해 주세요.';
    case 'AI_RESPONSE_INVALID':
      return 'AI 분석 결과를 처리하지 못했습니다. 문장을 조금 다르게 입력한 뒤 다시 시도해 주세요.';
    case 'AI_SERVICE_ERROR':
      return 'AI 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.';
    case 'GALAXY_REPORT_NOT_FOUND':
      return '관측 리포트를 찾을 수 없습니다.';
    case 'INVALID_SEASON':
      return '유효하지 않은 계절입니다.';
    case 'FUTURE_SEASON':
      return '아직 시작되지 않은 계절의 리포트는 생성할 수 없습니다.';
    case 'INVALID_REFLECTION':
      return '종합 소감을 확인해 주세요. (1~500자)';
    default:
      return fallback;
  }
}

function extractErrorDetail(data: unknown): ApiErrorDetail {
  if (!data || typeof data !== 'object' || !('detail' in data)) {
    return {};
  }
  const detail = (data as { detail: unknown }).detail;
  if (detail && typeof detail === 'object') {
    const obj = detail as { code?: unknown; message?: unknown };
    return {
      code: typeof obj.code === 'string' ? obj.code : undefined,
      message: typeof obj.message === 'string' ? obj.message : undefined,
    };
  }
  if (typeof detail === 'string') {
    return { message: detail };
  }
  return {};
}

export function formatApiErrorAlert(_error: unknown): string {
  // 원문 API 에러는 사용자에게 노출하지 않음 — ConnectionErrorHost 모달 사용
  return '우주와의 연결이 불안정한 상태입니다.';
}

async function parseResponseBody(raw: string): Promise<unknown> {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT',
  endpointPath: string,
  body?: unknown,
  allowAuthRetry = true,
): Promise<T> {
  const url = buildApiUrl(endpointPath);
  const headers = await buildApiHeaders();

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    const message =
      networkError instanceof Error && networkError.message
        ? networkError.message
        : 'Failed to fetch';
    const error = new ApiRequestError(message, url, null, null);
    reportConnectionError(error);
    throw error;
  }

  const raw = await response.text();
  const data = await parseResponseBody(raw);

  if (!response.ok) {
    const detail = extractErrorDetail(data);
    if (response.status === 401 && allowAuthRetry) {
      try {
        await refreshAccessToken();
        return apiRequest<T>(method, endpointPath, body, false);
      } catch {
        // fall through to normal error handling
      }
    }
    const isHtml = raw.trimStart().startsWith('<!DOCTYPE') || raw.trimStart().startsWith('<html');
    const fallback = isHtml
      ? '백엔드 서버 연결에 실패했습니다. Cloudflare 터널/백엔드 실행 상태를 확인해 주세요.'
      : detail.message ||
        (raw.trim()
          ? raw.length > 200
            ? `${raw.slice(0, 200)}…`
            : raw
          : response.statusText || `요청에 실패했습니다 (${response.status})`);
    const message = messageForErrorCode(detail.code, fallback);
    const error = new ApiRequestError(
      message,
      url,
      response.status,
      detail.code ?? null,
    );
    reportConnectionError(error);
    throw error;
  }

  return data as T;
}

export async function apiGet<T>(endpointPath: string): Promise<T> {
  return apiRequest<T>('GET', endpointPath);
}

export async function apiPost<T>(endpointPath: string, body: unknown): Promise<T> {
  return apiRequest<T>('POST', endpointPath, body);
}

export async function apiPut<T>(endpointPath: string, body: unknown): Promise<T> {
  return apiRequest<T>('PUT', endpointPath, body);
}
