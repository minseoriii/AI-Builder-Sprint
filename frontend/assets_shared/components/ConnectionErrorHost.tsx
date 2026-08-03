import { useEffect, useState } from 'react';

import { AppConnectionErrorModal } from './AppConnectionErrorModal';
import {
  getConnectionErrorRetry,
  subscribeConnectionError,
} from '../hooks/connectionErrorBus';

/** 루트에 두는 전역 연결 오류 모달 호스트 */
export function ConnectionErrorHost() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return subscribeConnectionError((state) => {
      setVisible(state.visible);
    });
  }, []);

  return (
    <AppConnectionErrorModal
      visible={visible}
      onRetry={() => {
        getConnectionErrorRetry()?.();
      }}
    />
  );
}
