import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { buttonContentCenter, buttonLabelCenter } from '../buttonStyles';
import { Palette, withOpacity } from '../colors';
import { FontFamily } from '../typography';
import { AppText } from './AppText';

const CREAM = Palette.cream;
const PANEL_FILL = withOpacity(CREAM, 0.3);
const PANEL_BORDER = withOpacity(CREAM, 0.6);

export interface AppConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 앱 종료 등 확인 모달 — 패널/버튼 F8EEC1 30% 채우기 · 60% 외곽선 */
export function AppConfirmModal({
  visible,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}: AppConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <AppText variant="emphasis" style={styles.title}>
            {title}
          </AppText>
          <View style={styles.divider} />
          <AppText style={styles.message}>{message}</AppText>
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.btn,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text style={styles.btnLabel}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.btn,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              <Text style={styles.btnLabel}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: PANEL_FILL,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    color: CREAM,
    marginBottom: 12,
  },
  divider: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
    backgroundColor: withOpacity(CREAM, 0.45),
    marginBottom: 14,
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
    color: CREAM,
    marginBottom: 22,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  btn: {
    flex: 1,
    maxWidth: 150,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: PANEL_FILL,
    ...buttonContentCenter,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnLabel: {
    fontFamily: FontFamily.light,
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: -0.2,
    color: CREAM,
    ...buttonLabelCenter,
    width: '100%',
  },
});
