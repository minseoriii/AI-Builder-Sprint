type ScreenRefreshListener = () => void;

const listeners = new Set<ScreenRefreshListener>();

/** 활성 탭 재탭 등 포커스 없이도 새로고침이 필요할 때 구독 */
export function subscribeScreenRefresh(listener: ScreenRefreshListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** BottomNavigationBar 등에서 현재 화면 새로고침 요청 */
export function requestScreenRefresh(): void {
  listeners.forEach((listener) => {
    listener();
  });
}
