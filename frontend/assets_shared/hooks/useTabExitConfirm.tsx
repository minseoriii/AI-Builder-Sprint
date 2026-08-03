import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  GestureResponderEvent,
  PanResponder,
  Platform,
  View,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppConfirmModal } from '../components/AppConfirmModal';

const EDGE_WIDTH = 28;
const SWIPE_THRESHOLD = 72;

export interface UseTabExitConfirmOptions {
  /** 뒤로가기보다 먼저 처리할 닫기 동작 (내부 모달 등). true면 종료 모달 대신 소비 */
  onBeforeExit?: () => boolean;
}

/**
 * 탭 루트용 앱 종료 확인 — Android 뒤로가기 + 왼쪽 가장자리 스와이프(→)
 */
export function useTabExitConfirm(options: UseTabExitConfirmOptions = {}) {
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const beforeExitRef = useRef(options.onBeforeExit);
  beforeExitRef.current = options.onBeforeExit;

  const openExitModal = useCallback(() => {
    setExitModalOpen(true);
  }, []);

  const closeExitModal = useCallback(() => {
    setExitModalOpen(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (exitModalOpen) {
          setExitModalOpen(false);
          return true;
        }
        if (beforeExitRef.current?.()) {
          return true;
        }
        setExitModalOpen(true);
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => subscription.remove();
    }, [exitModalOpen]),
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt: GestureResponderEvent) =>
        evt.nativeEvent.pageX <= EDGE_WIDTH,
      onMoveShouldSetPanResponder: (evt, gesture) =>
        evt.nativeEvent.pageX <= EDGE_WIDTH + 40 &&
        gesture.dx > 12 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dx >= SWIPE_THRESHOLD) {
          if (beforeExitRef.current?.()) return;
          setExitModalOpen(true);
        }
      },
    }),
  ).current;

  const handleExitApp = useCallback(() => {
    setExitModalOpen(false);
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
      return;
    }
    // iOS에는 exitApp이 없어 모달만 닫고 홈으로 유지
  }, []);

  const ExitConfirmModal = (
    <>
      <View
        style={styles.edge}
        pointerEvents="box-only"
        {...panResponder.panHandlers}
      />
      <AppConfirmModal
        visible={exitModalOpen}
        title="앱을 종료하시겠습니까?"
        message="별자리 기록은 다음에 이어서 할 수 있어요."
        cancelLabel="취소"
        confirmLabel="종료"
        onCancel={closeExitModal}
        onConfirm={handleExitApp}
      />
    </>
  );

  return {
    exitModalOpen,
    openExitModal,
    closeExitModal,
    ExitConfirmModal,
  };
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: EDGE_WIDTH,
    zIndex: 50,
  },
});
