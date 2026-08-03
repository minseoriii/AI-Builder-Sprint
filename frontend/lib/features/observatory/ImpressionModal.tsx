import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FontFamily, Palette, withOpacity } from '@/assets_shared';

const PEN_ICON = require('@/assets_shared/stars_png/ic_pen.png');

export interface ImpressionModalProps {
  visible: boolean;
  initialText: string;
  onClose: () => void;
  onSave: (text: string) => void;
}

/** 소감 기록 입력 모달 — 70% black 오버레이 */
export function ImpressionModal({
  visible,
  initialText,
  onClose,
  onSave,
}: ImpressionModalProps) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (visible) {
      setText(initialText);
    }
  }, [visible, initialText]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>소감 기록을 작성해주세요.</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="닫기"
              style={styles.closeBtn}
            >
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
              placeholder="이번 계절의 소감을 자유롭게 적어주세요."
              placeholderTextColor={withOpacity('#0A1833', 0.45)}
              selectionColor={Palette.cream}
              blurOnSubmit={false}
            />
          </View>

          <Pressable
            style={styles.saveBtn}
            onPress={() => onSave(text.replace(/\n+/g, ' ').trim())}
            accessibilityRole="button"
          >
            <Text style={styles.saveLabel}>작성 완료</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export interface ImpressionSectionProps {
  text: string;
  onPressEdit: () => void;
}

/** 03 · 소감 기록 섹션 */
export function ImpressionSection({ text, onPressEdit }: ImpressionSectionProps) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>03 · 소감 기록</Text>
        <Pressable
          onPress={onPressEdit}
          style={styles.editBtn}
          accessibilityRole="button"
          accessibilityLabel="소감 기록 수정"
        >
          <Image source={PEN_ICON} style={styles.pen} resizeMode="contain" />
        </Pressable>
      </View>
      {text ? (
        <>
          <View style={styles.sectionDivider} />
          <Text style={styles.body}>{text}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withOpacity(Palette.cream, 0.6),
    backgroundColor: withOpacity(Palette.cream, 0.3),
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    letterSpacing: -0.2,
    color: Palette.cream,
    paddingRight: 8,
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    fontFamily: FontFamily.regular,
    fontSize: 26,
    lineHeight: 28,
    color: Palette.cream,
    includeFontPadding: false,
  },
  inputWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: withOpacity(Palette.cream, 0.6),
    backgroundColor: withOpacity(Palette.cream, 0.5),
    marginBottom: 16,
    overflow: 'hidden',
  },
  input: {
    minHeight: 168,
    maxHeight: 220,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: FontFamily.light,
    fontSize: 14,
    lineHeight: 22,
    color: '#0A1833',
  },
  saveBtn: {
    alignSelf: 'center',
    minWidth: 168,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withOpacity(Palette.cream, 0.6),
    backgroundColor: withOpacity(Palette.cream, 0.15),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  saveLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 15,
    color: Palette.cream,
    letterSpacing: -0.2,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: withOpacity(Palette.cream, 0.6),
    backgroundColor: withOpacity(Palette.cream, 0.15),
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: FontFamily.light,
    fontSize: 12,
    letterSpacing: -0.1,
    color: Palette.cream,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: withOpacity(Palette.cream, 0.35),
    marginTop: 12,
    marginBottom: 12,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withOpacity(Palette.cream, 0.45),
    backgroundColor: withOpacity(Palette.cream, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pen: {
    width: 16,
    height: 16,
  },
  body: {
    fontFamily: FontFamily.light,
    fontSize: 13,
    lineHeight: 21,
    letterSpacing: -0.1,
    color: Palette.cream,
  },
});
