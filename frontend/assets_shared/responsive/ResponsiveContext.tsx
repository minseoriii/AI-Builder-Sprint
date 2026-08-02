import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
} from 'react';
import { useWindowDimensions } from 'react-native';

import { createResponsiveMetrics, type ResponsiveMetrics } from './metrics';

const ResponsiveContext = createContext<ResponsiveMetrics | null>(null);

export interface ResponsiveProviderProps {
  children: ReactNode;
}

/** 앱 루트에서 감싸 기기별 스케일 메트릭 제공 */
export function ResponsiveProvider({ children }: ResponsiveProviderProps) {
  const { width, height } = useWindowDimensions();
  const metrics = useMemo(
    () => createResponsiveMetrics(width, height),
    [width, height],
  );

  return (
    <ResponsiveContext.Provider value={metrics}>
      {children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsive(): ResponsiveMetrics {
  const metrics = useContext(ResponsiveContext);
  if (!metrics) {
    throw new Error('useResponsive must be used within ResponsiveProvider');
  }
  return metrics;
}
