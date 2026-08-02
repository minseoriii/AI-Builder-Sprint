import { Modal, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Palette, withOpacity } from '../colors';
import { useResponsiveStyles } from '../responsive';
import { AppText } from './AppText';
import { PrimaryButton } from './PrimaryButton';

const STYLE_DEF = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 10, 28, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 340,
  },
  card: {
    borderWidth: 1,
    borderColor: withOpacity(Palette.cream, 0.3),
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    textAlign: 'center',
    opacity: 0.75,
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  actionBtn: {
    flex: 1,
    maxWidth: 150,
  },
} as const;

export interface AppConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 앱 분위기 확인 모달 — 애니메이션 없음 */
export function AppConfirmModal({
  visible,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}: AppConfirmModalProps) {
  const styles = useResponsiveStyles(STYLE_DEF);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.cardWrap} onPress={() => {}}>
          <LinearGradient
            colors={['#0f2050', '#0a1635']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <AppText variant="emphasis" style={styles.title}>
              {title}
            </AppText>
            <AppText style={styles.message}>{message}</AppText>
            <View style={styles.actions}>
              <PrimaryButton
                label={cancelLabel}
                size="small"
                onPress={onCancel}
                style={styles.actionBtn}
              />
              <PrimaryButton
                label={confirmLabel}
                size="small"
                onPress={onConfirm}
                style={styles.actionBtn}
              />
            </View>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
