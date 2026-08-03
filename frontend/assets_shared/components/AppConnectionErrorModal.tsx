import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { buttonContentCenter, buttonLabelCenter } from '../buttonStyles';
import { withOpacity } from '../colors';
import { FontFamily } from '../typography';
import { ImageAssets } from '../images';
import { hideConnectionError } from '../hooks/connectionErrorBus';
import { requestScreenRefresh } from '../hooks/screenRefreshBus';

const PANEL_BG = '#FF0000';
const PANEL_BORDER = '#F8C1C1';
const BTN_BG = '#FFD7D7';
const BTN_TEXT = '#FFD2D2';

export interface AppConnectionErrorModalProps {
  visible: boolean;
  /** 다시 시도 — 미지정 시 화면 새로고침 버스만 호출 */
  onRetry?: () => void;
}

/**
 * API/연결 오류 공통 모달.
 * 원문 에러 메시지는 노출하지 않고 고정 안내만 표시한다.
 */
export function AppConnectionErrorModal({
  visible,
  onRetry,
}: AppConnectionErrorModalProps) {
  const handleRetry = () => {
    hideConnectionError();
    requestScreenRefresh();
    onRetry?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleRetry}
    >
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.headerRow}>
            <Image
              source={ImageAssets.ic_Online}
              style={styles.icon}
              resizeMode="contain"
            />
            <Text style={styles.title}>우주와의 연결이 불안정한 상태입니다.</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.body}>잠시후 다시 시도해주세요.</Text>

          <Pressable
            onPress={handleRetry}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && styles.retryBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="다시 시도하기"
          >
            <Text style={styles.retryLabel}>다시 시도하기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withOpacity(PANEL_BORDER, 0.6),
    backgroundColor: withOpacity(PANEL_BG, 0.15),
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 28,
    height: 28,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: PANEL_BORDER,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: withOpacity(PANEL_BORDER, 0.45),
    marginTop: 14,
    marginBottom: 14,
  },
  body: {
    fontFamily: FontFamily.light,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.1,
    color: withOpacity('#FFFFFF', 0.92),
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    alignSelf: 'center',
    minWidth: 160,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withOpacity(PANEL_BORDER, 0.6),
    backgroundColor: withOpacity(BTN_BG, 0.3),
    ...buttonContentCenter,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  retryBtnPressed: {
    opacity: 0.85,
  },
  retryLabel: {
    fontFamily: FontFamily.light,
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: -0.2,
    color: BTN_TEXT,
    ...buttonLabelCenter,
    width: '100%',
  },
});
