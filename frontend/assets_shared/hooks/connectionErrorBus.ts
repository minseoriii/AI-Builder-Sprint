type RetryHandler = (() => void) | undefined;

type Listener = (state: { visible: boolean; onRetry?: RetryHandler }) => void;

let visible = false;
let onRetry: RetryHandler;
const listeners = new Set<Listener>();

function emit() {
  const snapshot = { visible, onRetry };
  listeners.forEach((listener) => listener(snapshot));
}

/** API/연결 오류 모달 표시 — 원문 에러 문구는 노출하지 않음 */
export function showConnectionError(options?: { onRetry?: () => void }): void {
  visible = true;
  if (options && 'onRetry' in options) {
    onRetry = options.onRetry;
  }
  emit();
}

export function hideConnectionError(): void {
  visible = false;
  onRetry = undefined;
  emit();
}

export function subscribeConnectionError(listener: Listener): () => void {
  listeners.add(listener);
  listener({ visible, onRetry });
  return () => {
    listeners.delete(listener);
  };
}

export function getConnectionErrorRetry(): RetryHandler {
  return onRetry;
}
