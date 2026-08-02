import { ReactNode } from 'react';

import {
  useAutoRefreshOnFocus,
  type AutoRefreshHandler,
} from '../hooks/useAutoRefreshOnFocus';

export interface AutoRefreshOnFocusProps {
  /** 화면 포커스마다 실행 */
  onRefresh: AutoRefreshHandler;
  /** false면 자동 새로고침 비활성 */
  enabled?: boolean;
  children: ReactNode;
}

/**
 * 탭/화면 진입 시 자동 새로고침을 감싸는 공용 컴포넌트.
 * 내부적으로 useAutoRefreshOnFocus 사용.
 */
export function AutoRefreshOnFocus({
  onRefresh,
  enabled = true,
  children,
}: AutoRefreshOnFocusProps) {
  useAutoRefreshOnFocus(onRefresh, enabled);
  return <>{children}</>;
}
