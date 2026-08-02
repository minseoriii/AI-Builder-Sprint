import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { subscribeScreenRefresh } from './screenRefreshBus';

export type AutoRefreshHandler = () => void | Promise<void>;

/**
 * 화면 포커스 시(온보딩→홈 진입, 하단 탭 전환, 다른 화면에서 복귀)와
 * 활성 탭 재탭(requestScreenRefresh) 시 onRefresh를 자동 실행하는 공용 훅.
 * 재탭 이벤트는 현재 포커스된 화면만 처리합니다.
 */
export function useAutoRefreshOnFocus(
  onRefresh: AutoRefreshHandler,
  enabled = true,
): void {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const isFocusedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      isFocusedRef.current = true;
      void onRefreshRef.current();
      return () => {
        isFocusedRef.current = false;
      };
    }, [enabled]),
  );

  useEffect(() => {
    if (!enabled) return;
    return subscribeScreenRefresh(() => {
      if (!isFocusedRef.current) return;
      void onRefreshRef.current();
    });
  }, [enabled]);
}
