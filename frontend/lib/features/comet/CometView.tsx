import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  Line,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import {
  AppText,
  AutoRefreshOnFocus,
  BackButton,
  BottomNavigationBar,
  BottomNavigationBarDimensions,
  Palette,
  PrimaryButton,
  ResponsiveScreen,
  TagButton,
  bottomNavigationInset,
  useResponsive,
  useResponsiveStyles,
  withOpacity,
} from '@/assets_shared';

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen = 'main' | 'choice' | 'manual' | 'ai' | 'complete';
type Tab = 'observing' | 'completed';

interface Comet {
  id: string;
  name: string;
  activity: string;
  cluster: string;
  year: string;
  month: string;
  day: string;
  completed: boolean;
}

interface FormState {
  name: string;
  activity: string;
  cluster: string;
  year: string;
  month: string;
  day: string;
}

interface DateError {
  date?: string;
  year?: string;
  month?: string;
  day?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CLUSTERS = ['관계', '성장', '건강', '창의성', '자기돌봄'] as const;

const AI_PREFILL: FormState = {
  name: '미뤄온 전화 한 통',
  activity: '아빠에게 안부 전화하기',
  cluster: '관계',
  year: '2026',
  month: '8',
  day: '10',
};

const EMPTY_FORM: FormState = {
  name: '',
  activity: '',
  cluster: '',
  year: '',
  month: '',
  day: '',
};

const DAYS_IN_MONTH: Record<number, number> = {
  1: 31,
  2: 28,
  3: 31,
  4: 30,
  5: 31,
  6: 30,
  7: 31,
  8: 31,
  9: 30,
  10: 31,
  11: 30,
  12: 31,
};

const GOLD = '#e8c547';
const GOLD_SOFT = '#ffe566';
const GOLD_TITLE = '#ffe8a3';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(year: string, month: string, day: string) {
  return `${year}년 ${month}월 ${day}일 까지`;
}

function validateDate(year: string, month: string, day: string): DateError {
  const errors: DateError = {};
  const isNum = (v: string) => /^\d+$/.test(v.trim());

  if (year && !isNum(year)) errors.year = '! 숫자만 입력 가능합니다.';
  if (month && !isNum(month)) errors.month = '! 숫자만 입력 가능합니다.';
  if (day && !isNum(day)) errors.day = '! 숫자만 입력 가능합니다.';

  const allNumeric =
    year && month && day && isNum(year) && isNum(month) && isNum(day);
  if (allNumeric) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);

    if (m < 1 || m > 12) {
      errors.date = '! 유효한 날짜를 선택해주세요.';
      return errors;
    }

    const maxDay = DAYS_IN_MONTH[m];
    if (d < 1 || d > maxDay) {
      errors.date = '! 유효한 날짜를 선택해주세요.';
      return errors;
    }

    const entered = new Date(y, m - 1, d);
    const min = new Date(2026, 7, 3); // 2026-08-03
    if (entered < min) {
      errors.date = '! 2026년 8월 3일 이후로 선택할 수 있습니다.';
    }
  }
  return errors;
}

function isCometFailed(comet: Comet): boolean {
  const y = parseInt(comet.year, 10);
  const m = parseInt(comet.month, 10);
  const d = parseInt(comet.day, 10);
  if (!y || !m || !d) return false;
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target < today;
}

// ─── Style definitions ───────────────────────────────────────────────────────

const STYLE_DEF = {
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 24,
  },
  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 4,
    borderRadius: 999,
    backgroundColor: withOpacity('#FFFFFF', 0.06),
    borderWidth: 1,
    borderColor: withOpacity('#FFFFFF', 0.1),
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentBtnActive: {
    backgroundColor: withOpacity('#FFFFFF', 0.18),
    borderColor: withOpacity('#FFFFFF', 0.25),
  },
  segmentLabel: {
    fontSize: 13,
    color: withOpacity('#FFFFFF', 0.45),
  },
  segmentLabelActive: {
    color: Palette.cream,
  },
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 100,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 22,
    color: withOpacity(Palette.cream, 0.45),
    fontSize: 14,
  },
  listPad: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  mainBottomCta: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: withOpacity('#FFFFFF', 0.06),
    borderWidth: 1,
    borderColor: withOpacity('#FFFFFF', 0.12),
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cardStar: {
    color: GOLD,
    fontSize: 12,
  },
  cardName: {
    fontSize: 14,
    flexShrink: 1,
  },
  clusterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: withOpacity('#FFFFFF', 0.1),
  },
  clusterBadgeText: {
    fontSize: 11,
    color: withOpacity(Palette.cream, 0.7),
  },
  cardActivity: {
    fontSize: 12,
    color: withOpacity(Palette.cream, 0.6),
    marginBottom: 12,
    paddingLeft: 16,
  },
  cardDate: {
    fontSize: 11,
    color: withOpacity(Palette.cream, 0.4),
    textAlign: 'right',
    marginBottom: 12,
  },
  cardAction: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 11,
    backgroundColor: withOpacity('#FFFFFF', 0.1),
    borderWidth: 1,
    borderColor: withOpacity('#FFFFFF', 0.18),
  },
  cardActionFailed: {
    backgroundColor: 'rgba(180,60,60,0.25)',
    borderColor: 'rgba(220,80,80,0.4)',
  },
  cardActionLabel: {
    fontSize: 13,
    color: withOpacity(Palette.cream, 0.85),
  },
  cardActionLabelFailed: {
    color: '#ff8a8a',
  },
  subBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 48,
  },
  subBarTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 13,
    color: withOpacity(Palette.cream, 0.7),
  },
  subBarDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: withOpacity('#FFFFFF', 0.12),
  },
  choiceBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 32,
  },
  choiceTitle: {
    fontSize: 24,
    textAlign: 'center',
    lineHeight: 34,
    color: GOLD_TITLE,
    marginBottom: 20,
  },
  choiceSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    color: withOpacity(Palette.cream, 0.6),
  },
  choiceButtons: {
    width: '100%',
    gap: 12,
  },
  choiceBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 16,
    backgroundColor: 'rgba(25,40,100,0.9)',
    borderWidth: 1,
    borderColor: withOpacity('#FFFFFF', 0.2),
  },
  choiceBtnLabel: {
    fontSize: 14,
  },
  formScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  aiGuide: {
    marginBottom: 24,
  },
  aiGuideMain: {
    fontSize: 14,
    lineHeight: 22,
    color: withOpacity(Palette.cream, 0.8),
    marginBottom: 6,
  },
  aiGuideSub: {
    fontSize: 12,
    lineHeight: 18,
    color: withOpacity(Palette.cream, 0.45),
  },
  fieldBlock: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    color: withOpacity(Palette.cream, 0.7),
    marginBottom: 8,
  },
  touchInput: {
    backgroundColor: withOpacity('#FFFFFF', 0.07),
    borderWidth: 1,
    borderColor: withOpacity('#FFFFFF', 0.15),
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  touchInputTall: {
    minHeight: 56,
  },
  touchInputValue: {
    fontSize: 13,
    color: withOpacity(Palette.cream, 0.9),
  },
  touchInputPlaceholder: {
    fontSize: 12,
    color: withOpacity(Palette.cream, 0.3),
  },
  fieldError: {
    fontSize: 11,
    color: '#ff8a8a',
    marginTop: 6,
  },
  clusterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  dateBox: {
    backgroundColor: withOpacity('#FFFFFF', 0.07),
    borderWidth: 1,
    borderColor: withOpacity('#FFFFFF', 0.15),
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  dateBoxYear: {
    minWidth: 72,
  },
  dateBoxText: {
    fontSize: 13,
    textAlign: 'center',
  },
  dateUnit: {
    fontSize: 13,
    color: withOpacity(Palette.cream, 0.6),
  },
  formBottomCta: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    alignItems: 'center',
  },
  completeBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 28,
  },
  completeTitle: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  completeSub: {
    fontSize: 14,
    textAlign: 'center',
    color: withOpacity(Palette.cream, 0.55),
  },
  summaryCard: {
    width: '100%',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: withOpacity('#FFFFFF', 0.06),
    borderWidth: 1,
    borderColor: withOpacity('#FFFFFF', 0.12),
  },
  summaryName: {
    fontSize: 16,
    marginBottom: 4,
  },
  summaryActivity: {
    fontSize: 14,
    color: withOpacity(Palette.cream, 0.6),
    marginBottom: 4,
  },
  summaryCluster: {
    fontSize: 14,
    color: GOLD,
    marginBottom: 12,
  },
  summaryDate: {
    fontSize: 14,
    color: withOpacity(Palette.cream, 0.45),
  },
  completeBottom: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
    backgroundColor: '#1a2660',
    borderWidth: 1,
    borderColor: withOpacity('#FFFFFF', 0.15),
  },
  modalTitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  modalInput: {
    borderRadius: 12,
    padding: 12,
    color: Palette.cream,
    fontSize: 14,
    backgroundColor: withOpacity('#FFFFFF', 0.1),
    borderWidth: 1,
    borderColor: withOpacity('#FFFFFF', 0.2),
  },
  modalInputMulti: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalConfirm: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 12,
    backgroundColor: withOpacity('#FFFFFF', 0.2),
  },
  modalConfirmLabel: {
    fontSize: 14,
  },
  starDot: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
} as const;

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconComet({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Defs>
        <RadialGradient id="cometGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#ffe066" stopOpacity="1" />
          <Stop offset="100%" stopColor="#e8c547" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Line
        x1="12"
        y1="32"
        x2="36"
        y2="32"
        stroke={GOLD}
        strokeWidth="1"
        strokeOpacity="0.3"
        strokeLinecap="round"
      />
      <Line
        x1="16"
        y1="26"
        x2="36"
        y2="30"
        stroke={GOLD}
        strokeWidth="0.8"
        strokeOpacity="0.2"
        strokeLinecap="round"
      />
      <Line
        x1="16"
        y1="38"
        x2="36"
        y2="34"
        stroke={GOLD}
        strokeWidth="0.8"
        strokeOpacity="0.2"
        strokeLinecap="round"
      />
      <Path d="M40 20L43 32L40 44L37 32L40 20Z" fill={GOLD_SOFT} />
      <Path d="M28 32L40 29L52 32L40 35L28 32Z" fill={GOLD_SOFT} />
      <Circle cx="40" cy="32" r="3" fill="white" />
    </Svg>
  );
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

function StarDots() {
  const dots = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        top: ((i * 37) % 100) + (i % 7) * 0.3,
        left: ((i * 53) % 100) + (i % 5) * 0.2,
        size: (i % 3) * 0.5 + 0.8,
        opacity: ((i * 13) % 50) / 100 + 0.2,
      })),
    [],
  );

  const styles = useResponsiveStyles(STYLE_DEF);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {dots.map((d) => (
        <View
          key={d.id}
          style={[
            styles.starDot,
            {
              top: `${d.top}%`,
              left: `${d.left}%`,
              width: d.size,
              height: d.size,
              opacity: d.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

function SubPageBar({ title, onBack }: { title: string; onBack: () => void }) {
  const styles = useResponsiveStyles(STYLE_DEF);
  return (
    <>
      <View style={styles.subBar}>
        <AppText style={styles.subBarTitle}>{title}</AppText>
        <BackButton onPress={onBack} iconSize={24} />
      </View>
      <View style={styles.subBarDivider} />
    </>
  );
}

function SegmentedControl({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  const styles = useResponsiveStyles(STYLE_DEF);
  return (
    <View style={styles.segmentWrap}>
      {(['observing', 'completed'] as Tab[]).map((t) => {
        const active = tab === t;
        const label = t === 'observing' ? '관측 중인 혜성' : '관측 완료된 혜성';
        return (
          <TouchableOpacity
            key={t}
            activeOpacity={0.85}
            onPress={() => onChange(t)}
            style={[styles.segmentBtn, active && styles.segmentBtnActive]}
          >
            <AppText
              variant={active ? 'emphasis' : 'default'}
              style={{
                ...styles.segmentLabel,
                ...(active ? styles.segmentLabelActive : null),
              }}
            >
              {label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function InputModal({
  visible,
  title,
  value,
  onConfirm,
  onClose,
  multiline,
  keyboardType = 'default',
}: {
  visible: boolean;
  title: string;
  value: string;
  onConfirm: (v: string) => void;
  onClose: () => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
}) {
  const styles = useResponsiveStyles(STYLE_DEF);
  const [val, setVal] = useState(value);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      onShow={() => setVal(value)}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <AppText variant="emphasis" style={styles.modalTitle}>
            {title}
          </AppText>
          <TextInput
            value={val}
            onChangeText={setVal}
            multiline={multiline}
            autoFocus
            keyboardType={keyboardType}
            placeholderTextColor={withOpacity(Palette.cream, 0.35)}
            style={[styles.modalInput, multiline && styles.modalInputMulti]}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.modalConfirm}
            onPress={() => {
              onConfirm(val);
              onClose();
            }}
          >
            <AppText variant="emphasis" style={styles.modalConfirmLabel}>
              확인
            </AppText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CometCard({
  comet,
  showObserving,
  onComplete,
  onAddToGalaxy,
}: {
  comet: Comet;
  showObserving: boolean;
  onComplete?: (id: string) => void;
  onAddToGalaxy?: (id: string) => void;
}) {
  const styles = useResponsiveStyles(STYLE_DEF);
  const failed = showObserving && isCometFailed(comet);

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardNameRow}>
          <AppText style={styles.cardStar}>✦</AppText>
          <AppText variant="emphasis" style={styles.cardName} numberOfLines={1}>
            {comet.name}
          </AppText>
        </View>
        {comet.cluster ? (
          <View style={styles.clusterBadge}>
            <AppText style={styles.clusterBadgeText}>{comet.cluster}</AppText>
          </View>
        ) : null}
      </View>
      <AppText style={styles.cardActivity}>{comet.activity}</AppText>
      <AppText style={styles.cardDate}>
        {formatDate(comet.year, comet.month, comet.day)}
      </AppText>
      {showObserving ? (
        <TouchableOpacity
          activeOpacity={failed ? 1 : 0.85}
          disabled={failed}
          style={[styles.cardAction, failed && styles.cardActionFailed]}
          onPress={() => onComplete?.(comet.id)}
        >
          <AppText
            variant="emphasis"
            style={{
              ...styles.cardActionLabel,
              ...(failed ? styles.cardActionLabelFailed : null),
            }}
          >
            {failed ? '관측 실패' : '관측 완료'}
          </AppText>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.cardAction}
          onPress={() => onAddToGalaxy?.(comet.id)}
        >
          <AppText variant="emphasis" style={styles.cardActionLabel}>
            은하에 추가하기
          </AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

function CometForm({
  form,
  setForm,
  dateErrors,
  setDateErrors,
  onSubmit,
  onBack,
  isAI,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  dateErrors: DateError;
  setDateErrors: (e: DateError) => void;
  onSubmit: () => void;
  onBack: () => void;
  isAI: boolean;
}) {
  const styles = useResponsiveStyles(STYLE_DEF);
  const [textModal, setTextModal] = useState<null | {
    field: 'name' | 'activity';
    multiline: boolean;
  }>(null);
  const [numModal, setNumModal] = useState<null | 'year' | 'month' | 'day'>(
    null,
  );
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    activity?: string;
    cluster?: string;
    date?: string;
  }>({});

  const update = (key: keyof FormState, val: string) => {
    const next = { ...form, [key]: val };
    setForm(next);
    if (key === 'year' || key === 'month' || key === 'day') {
      setDateErrors(validateDate(next.year, next.month, next.day));
      setFieldErrors((e) => ({ ...e, date: undefined }));
    }
    if (key === 'name') setFieldErrors((e) => ({ ...e, name: undefined }));
    if (key === 'activity')
      setFieldErrors((e) => ({ ...e, activity: undefined }));
    if (key === 'cluster')
      setFieldErrors((e) => ({ ...e, cluster: undefined }));
  };

  const handleSubmit = () => {
    const errs: {
      name?: string;
      activity?: string;
      cluster?: string;
      date?: string;
    } = {};
    if (!form.name.trim()) errs.name = '! 혜성 이름의 내용을 입력해주세요.';
    if (!form.activity.trim())
      errs.activity = '! 활동 내용의 내용을 입력해주세요.';
    if (!form.cluster.trim()) errs.cluster = '! 성단을 선택해주세요.';
    const dateEmpty = !form.year || !form.month || !form.day;
    if (dateEmpty) errs.date = '! 관측 목표 날짜의 내용을 입력해주세요.';
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    const dateCheck = validateDate(form.year, form.month, form.day);
    if (dateCheck.date || dateCheck.year || dateCheck.month || dateCheck.day) {
      setDateErrors(dateCheck);
      return;
    }
    onSubmit();
  };

  return (
    <View style={styles.flex}>
      <SubPageBar title="혜성 등록" onBack={onBack} />

      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isAI ? (
          <View style={styles.aiGuide}>
            <AppText style={styles.aiGuideMain}>
              {
                'AI가 사용자님의 현재 은하를 분석하고\n가장 관측이 필요한 성단을 중심으로\n혜성을 추천했어요.'
              }
            </AppText>
            <AppText style={styles.aiGuideSub}>
              {
                '추천된 혜성은 자유롭게 수정하거나\n직접 다시 구성할 수 있습니다.'
              }
            </AppText>
          </View>
        ) : null}

        <View style={styles.fieldBlock}>
          <AppText style={styles.fieldLabel}>혜성 이름</AppText>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.touchInput}
            onPress={() => setTextModal({ field: 'name', multiline: false })}
          >
            {form.name ? (
              <AppText style={styles.touchInputValue}>{form.name}</AppText>
            ) : (
              <AppText style={styles.touchInputPlaceholder}>
                (예시) 미뤄온 전화 한 통
              </AppText>
            )}
          </TouchableOpacity>
          {fieldErrors.name ? (
            <AppText style={styles.fieldError}>{fieldErrors.name}</AppText>
          ) : null}
        </View>

        <View style={styles.fieldBlock}>
          <AppText style={styles.fieldLabel}>활동 내용</AppText>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.touchInput, styles.touchInputTall]}
            onPress={() =>
              setTextModal({ field: 'activity', multiline: true })
            }
          >
            {form.activity ? (
              <AppText style={styles.touchInputValue}>{form.activity}</AppText>
            ) : null}
          </TouchableOpacity>
          {fieldErrors.activity ? (
            <AppText style={styles.fieldError}>{fieldErrors.activity}</AppText>
          ) : null}
        </View>

        <View style={styles.fieldBlock}>
          <AppText style={styles.fieldLabel}>연결할 성단</AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.clusterRow}
          >
            {CLUSTERS.map((c) => {
              const selected = form.cluster === c;
              return (
                <TagButton
                  key={c}
                  label={c}
                  selected={selected}
                  onPress={() => update('cluster', selected ? '' : c)}
                />
              );
            })}
          </ScrollView>
          {fieldErrors.cluster ? (
            <AppText style={styles.fieldError}>{fieldErrors.cluster}</AppText>
          ) : null}
        </View>

        <View style={styles.fieldBlock}>
          <AppText style={styles.fieldLabel}>관측 목표 날짜</AppText>
          <View style={styles.dateRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.dateBox, styles.dateBoxYear]}
              onPress={() => setNumModal('year')}
            >
              <AppText style={styles.dateBoxText}>{form.year}</AppText>
            </TouchableOpacity>
            <AppText style={styles.dateUnit}>년</AppText>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.dateBox}
              onPress={() => setNumModal('month')}
            >
              <AppText style={styles.dateBoxText}>{form.month}</AppText>
            </TouchableOpacity>
            <AppText style={styles.dateUnit}>월</AppText>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.dateBox}
              onPress={() => setNumModal('day')}
            >
              <AppText style={styles.dateBoxText}>{form.day}</AppText>
            </TouchableOpacity>
            <AppText style={styles.dateUnit}>일 까지</AppText>
          </View>

          {dateErrors.year ? (
            <AppText style={styles.fieldError}>{dateErrors.year}</AppText>
          ) : null}
          {dateErrors.month ? (
            <AppText style={styles.fieldError}>{dateErrors.month}</AppText>
          ) : null}
          {dateErrors.day ? (
            <AppText style={styles.fieldError}>{dateErrors.day}</AppText>
          ) : null}
          {dateErrors.date ? (
            <AppText style={styles.fieldError}>{dateErrors.date}</AppText>
          ) : null}
          {fieldErrors.date ? (
            <AppText style={styles.fieldError}>{fieldErrors.date}</AppText>
          ) : null}
        </View>
      </ScrollView>

      <LinearGradient
        colors={['rgba(8,14,42,0)', 'rgba(8,14,42,1)']}
        style={styles.formBottomCta}
      >
        <PrimaryButton label="혜성 등록" size="large" onPress={handleSubmit} />
      </LinearGradient>

      <InputModal
        visible={textModal != null}
        title={textModal?.field === 'activity' ? '활동 내용' : '혜성 이름'}
        value={textModal ? form[textModal.field] : ''}
        multiline={textModal?.multiline}
        onConfirm={(v) => {
          if (textModal) update(textModal.field, v);
        }}
        onClose={() => setTextModal(null)}
      />

      <InputModal
        visible={numModal != null}
        title={
          numModal === 'year'
            ? '년도 입력'
            : numModal === 'month'
              ? '월 입력'
              : '일 입력'
        }
        value={numModal ? form[numModal] : ''}
        keyboardType="number-pad"
        onConfirm={(v) => {
          if (numModal) update(numModal, v);
        }}
        onClose={() => setNumModal(null)}
      />
    </View>
  );
}

// ─── Main View ───────────────────────────────────────────────────────────────

export default function CometView() {
  const router = useRouter();
  const styles = useResponsiveStyles(STYLE_DEF);
  const { scale } = useResponsive();
  const [refreshKey, setRefreshKey] = useState(0);

  const [screen, setScreen] = useState<Screen>('main');
  const [tab, setTab] = useState<Tab>('observing');
  const [observingComets, setObservingComets] = useState<Comet[]>([]);
  const [completedComets, setCompletedComets] = useState<Comet[]>([]);
  const [lastComet, setLastComet] = useState<Comet | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [dateErrors, setDateErrors] = useState<DateError>({});
  const nextId = useRef(1);

  const navInset = bottomNavigationInset(
    scale(BottomNavigationBarDimensions.height),
  );
  const showNav = screen === 'main';

  const handleRefresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const handleRegister = () => {
    const errs = validateDate(form.year, form.month, form.day);
    if (errs.date || errs.year || errs.month || errs.day) {
      setDateErrors(errs);
      return;
    }
    const comet: Comet = {
      id: String(nextId.current++),
      name: form.name.trim() || '새로운 혜성',
      activity: form.activity.trim(),
      cluster: form.cluster,
      year: form.year.trim(),
      month: form.month.trim(),
      day: form.day.trim(),
      completed: false,
    };
    setLastComet(comet);
    setObservingComets((prev) => [...prev, comet]);
    setScreen('complete');
  };

  const handleCompleteComet = (id: string) => {
    const comet = observingComets.find((c) => c.id === id);
    if (!comet) return;
    setObservingComets((prev) => prev.filter((c) => c.id !== id));
    setCompletedComets((prev) => [...prev, { ...comet, completed: true }]);
    setTab('completed');
  };

  const handleAddToGalaxy = (_id: string) => {
    router.push({
      pathname: '/star-record',
      params: { source: 'comet' },
    });
  };

  const goToRegisterChoice = () => {
    setForm(EMPTY_FORM);
    setDateErrors({});
    setScreen('choice');
  };

  const goToManual = () => {
    setForm(EMPTY_FORM);
    setDateErrors({});
    setScreen('manual');
  };

  const goToAI = () => {
    setForm(AI_PREFILL);
    setDateErrors({});
    setScreen('ai');
  };

  const renderChoice = () => (
    <View style={styles.flex}>
      <SubPageBar title="혜성 등록" onBack={() => setScreen('main')} />
      <View style={styles.choiceBody}>
        <View>
          <AppText variant="emphasis" style={styles.choiceTitle}>
            {'관측할 혜성을\n어떻게 등록할까요?'}
          </AppText>
          <AppText style={styles.choiceSub}>
            {
              'AI가 현재 은하 구성을 분석하여\n관측이 필요한 혜성을 추천받거나\n\n원하는 혜성을 직접 등록할 수 있습니다.'
            }
          </AppText>
        </View>
        <View style={styles.choiceButtons}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.choiceBtn}
            onPress={goToAI}
          >
            <AppText variant="emphasis" style={styles.choiceBtnLabel}>
              AI 혜성 추천
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.choiceBtn}
            onPress={goToManual}
          >
            <AppText variant="emphasis" style={styles.choiceBtnLabel}>
              혜성 직접 등록
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderForm = (isAI: boolean) => (
    <CometForm
      form={form}
      setForm={setForm}
      dateErrors={dateErrors}
      setDateErrors={setDateErrors}
      onSubmit={handleRegister}
      onBack={() => setScreen('choice')}
      isAI={isAI}
    />
  );

  const renderComplete = () => (
    <View style={styles.flex}>
      <View style={styles.completeBody}>
        <View>
          <AppText variant="emphasis" style={styles.completeTitle}>
            관측할 혜성을 등록했어요!
          </AppText>
          <AppText style={styles.completeSub}>
            혜성을 관측하고 북극성에 더 가까워져보아요.
          </AppText>
        </View>
        <IconComet size={80} />
        {lastComet ? (
          <View style={styles.summaryCard}>
            <AppText variant="emphasis" style={styles.summaryName}>
              {lastComet.name}
            </AppText>
            <AppText style={styles.summaryActivity}>
              {lastComet.activity}
            </AppText>
            {lastComet.cluster ? (
              <AppText variant="emphasis" style={styles.summaryCluster}>
                {lastComet.cluster}
              </AppText>
            ) : null}
            <AppText style={styles.summaryDate}>
              {formatDate(lastComet.year, lastComet.month, lastComet.day)}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.completeBottom}>
        <PrimaryButton
          label="확인"
          size="large"
          onPress={() => {
            setTab('observing');
            setScreen('main');
          }}
        />
      </View>
    </View>
  );

  const renderMain = () => {
    const hasObserving = observingComets.length > 0;
    const hasCompleted = completedComets.length > 0;
    const showEmpty = tab === 'observing' ? !hasObserving : !hasCompleted;

    return (
      <View style={styles.flex}>
        <View style={styles.pageHeader}>
          <AppText variant="emphasis" style={styles.pageTitle}>
            혜성관측소
          </AppText>
        </View>

        <SegmentedControl tab={tab} onChange={setTab} />

        {showEmpty ? (
          <View style={styles.emptyCenter}>
            <AppText style={styles.emptyText}>
              {tab === 'observing'
                ? '현재 관측 중인 혜성이 없습니다.\n관측할 혜성을 추천받거나 직접 관측해 보세요.'
                : '아직 관측을 완료한 혜성이 없습니다.\n혜성을 따라가며 새로운 경험을 발견해 보세요.'}
            </AppText>
          </View>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.listPad,
              { paddingBottom: navInset + 88 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {(tab === 'observing' ? observingComets : completedComets).map(
              (c) => (
                <CometCard
                  key={c.id}
                  comet={c}
                  showObserving={tab === 'observing'}
                  onComplete={handleCompleteComet}
                  onAddToGalaxy={handleAddToGalaxy}
                />
              ),
            )}
          </ScrollView>
        )}

        <LinearGradient
          colors={['rgba(8,14,42,0)', 'rgba(8,14,42,1)']}
          style={[styles.mainBottomCta, { bottom: navInset }]}
        >
          <PrimaryButton
            label="혜성 등록"
            size="large"
            onPress={goToRegisterChoice}
          />
        </LinearGradient>
      </View>
    );
  };

  const content = (() => {
    switch (screen) {
      case 'choice':
        return renderChoice();
      case 'manual':
        return renderForm(false);
      case 'ai':
        return renderForm(true);
      case 'complete':
        return renderComplete();
      default:
        return renderMain();
    }
  })();

  return (
    <AutoRefreshOnFocus onRefresh={handleRefresh}>
      <ResponsiveScreen key={refreshKey} style={{ backgroundColor: '#06101f' }}>
        <LinearGradient
          colors={['#0d1f48', '#081432', '#060e28']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <StarDots />
        <SafeAreaView style={styles.safe} edges={['top']}>
          {content}
        </SafeAreaView>
        {showNav ? <BottomNavigationBar activeTab="comet" /> : null}
      </ResponsiveScreen>
    </AutoRefreshOnFocus>
  );
}
