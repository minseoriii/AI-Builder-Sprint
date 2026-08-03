/**
 * 처리된 API 실패용 로그 — LogBox 토스트를 띄우지 않음.
 * (console.error / console.warn 은 Expo 하단 배너를 유발함)
 */
export function logHandledApiError(_label: string, _error?: unknown): void {
  // no-op in UI; ConnectionErrorHost 모달로만 안내
}
