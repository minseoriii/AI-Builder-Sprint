import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';

import {
  createResponsiveStylesContext,
  ResponsiveScreen,
} from '@/assets_shared';

// ─── Types ─────────────────────────────────────────────────────────────────

type Screen = 'base' | 'loading' | 'supplement' | 'confirm' | 'complete';

interface Tags {
  together: string;
  place: string;
  time: string;
  activity: string;
  emotion: string;
}

interface TagMeta {
  key: keyof Tags;
  label: string;
  icon: string;
  question: string;
}

interface BgStar {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  dur: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#0A1628',
  bgDeep: '#060d20',
  bgMid: '#091428',
  bgTop: '#0e1f45',
  card: '#1E293B',
  purple: '#6366F1',
  purpleSoft: '#818cf8',
  violet: '#8B5CF6',
  gold: '#c9a227',
  goldBright: '#f0c040',
  white: '#FFFFFF',
};

const REQUIRED_TAGS: TagMeta[] = [
  { key: 'together', label: '함께한 사람', icon: '👤', question: '누구와 함께한 기록인가요?' },
  { key: 'place', label: '장소', icon: '📍', question: '어디에서 일어난 일인가요?' },
  { key: 'time', label: '시간', icon: '🕐', question: '언제 일어난 일인가요?' },
  { key: 'activity', label: '활동', icon: '🚶', question: '어떤 활동을 했나요?' },
  { key: 'emotion', label: '감정', icon: '💜', question: '그때 감정은 어땠나요?' },
];

const CLUSTER_NAMES = ['일상', '관계·사랑', '성장·도전', '휴식·여유', '특별한 순간'];

const LOADING_MS = 2000;

const STYLE_DEF = {
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  flex: {
    flex: 1,
  },
  shell: {
    flex: 1,
  },
  starBg: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  twinkleStar: {
    position: 'absolute',
    backgroundColor: COLORS.white,
  },
  screenCol: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
    flexShrink: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  centeredScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 20,
  },
  scrollPad: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    color: COLORS.white,
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '600',
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
    alignSelf: 'stretch',
  },
  subtitleTight: {
    marginBottom: 20,
  },
  textArea: {
    width: '100%',
    minHeight: 140,
    borderRadius: 16,
    padding: 16,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    flexShrink: 0,
  },
  bottomButton: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  bottomButtonDisabled: {
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bottomButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  bottomButtonTextDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  questionList: {
    marginBottom: 16,
    gap: 8,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questionDash: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  questionText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    flex: 1,
  },
  clusterBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  clusterName: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  clusterHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    marginTop: 4,
  },
  tagList: {
    gap: 8,
    marginBottom: 20,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tagIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  tagLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    width: 80,
  },
  tagValue: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    flex: 1,
  },
  editBtn: {
    marginLeft: 8,
    padding: 4,
  },
  originalCard: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 8,
  },
  originalLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    marginBottom: 4,
  },
  originalText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalCardInner: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    paddingRight: 12,
  },
  modalInput: {
    width: '100%',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  completeCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  completeStarWrap: {
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starGlow: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(240,192,64,0.18)',
  },
  completeTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  completeSubtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  metaCard: {
    width: '100%',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  metaLine: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 4,
  },
  metaEmphasis: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
} as const;

const { StylesProvider, useStyles, useScreenStyles } =
  createResponsiveStylesContext<typeof STYLE_DEF>();

// ─── Helpers ───────────────────────────────────────────────────────────────

function getSeasonGalaxy(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return '봄';
  if (month >= 6 && month <= 8) return '여름';
  if (month >= 9 && month <= 11) return '가을';
  return '겨울';
}

function detectMissingTags(text: string): (keyof Tags)[] {
  const missing: (keyof Tags)[] = [];
  const t = text;
  if (!/(친구|가족|동기|선배|후배|혼자|혼자서|동료|누구|함께|같이)/.test(t)) missing.push('together');
  if (!/(에서|에서의|카페|집|학교|공원|식당|도서관|어디|장소|곳)/.test(t)) missing.push('place');
  if (!/(아침|점심|저녁|밤|새벽|오전|오후|언제|시간)/.test(t)) missing.push('time');
  if (!/(먹|마시|갔|했|봤|만났|걸었|달렸|공부|일|놀|쉬)/.test(t)) missing.push('activity');
  if (!/(좋았|행복|슬프|기뻤|설렜|외로|피곤|시원|따뜻|즐거|감사|뿌듯|화가|속상)/.test(t)) {
    missing.push('emotion');
  }
  return missing;
}

function parseTags(baseText: string, supplementText: string, _missing: (keyof Tags)[]): Tags {
  const tags: Tags = {
    together: '대학 동기',
    place: '부산대학교 넉넉한 터',
    time: '늦은 밤',
    activity: '캔맥주를 마심',
    emotion: '시원함',
  };

  const combined = `${baseText} ${supplementText}`;

  const togetherMatch = combined.match(
    /(혼자|친구|가족|동기|선배|후배|동료|[가-힣]+(이)?와|[가-힣]+(랑)|[가-힣]+ 친구)/,
  );
  if (togetherMatch) tags.together = togetherMatch[0];

  const placeMatch = combined.match(/(카페|집|학교|공원|식당|도서관|편의점|[가-힣]+(에서))/);
  if (placeMatch) tags.place = placeMatch[0].replace('에서', '');

  const timeMatch = combined.match(/(아침|점심|저녁|밤|새벽|오전|오후)/);
  if (timeMatch) tags.time = timeMatch[0];

  const activityMatch = combined.match(/(먹었|마셨|갔다|했다|봤다|만났다|걸었다|공부했|일했|놀았|쉬었)/);
  if (activityMatch) tags.activity = activityMatch[0].replace('다', '');

  const emotionMatch = combined.match(/(좋았|행복|슬프|기뻤|설렜|외로|피곤|시원|따뜻|즐거|감사|뿌듯)/);
  if (emotionMatch) tags.emotion = emotionMatch[0];

  return tags;
}

// ─── StarBackground ────────────────────────────────────────────────────────

function TwinkleStar({
  star,
  canvasWidth,
  canvasHeight,
}: {
  star: BgStar;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const styles = useStyles();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(star.delay * 1000),
        Animated.timing(opacity, {
          toValue: 1,
          duration: (star.dur * 1000) / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: (star.dur * 1000) / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, star.delay, star.dur]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.twinkleStar,
        {
          left: (star.x / 100) * canvasWidth,
          top: (star.y / 100) * canvasHeight,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          opacity,
        },
      ]}
    />
  );
}

function StarBackground({ count = 70 }: { count?: number }) {
  const styles = useStyles();
  const { width, height } = useWindowDimensions();
  const stars = useMemo<BgStar[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.5 + 0.5,
        delay: Math.random() * 4,
        dur: Math.random() * 2 + 2,
      })),
    [count],
  );

  return (
    <View style={[styles.starBg, { width, height }]} pointerEvents="none">
      {stars.map((s) => (
        <TwinkleStar key={s.id} star={s} canvasWidth={width} canvasHeight={height} />
      ))}
    </View>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function BackChevron() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 19l-7-7 7-7"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function EditIcon({ active }: { active: boolean }) {
  const color = active ? COLORS.purpleSoft : 'rgba(255,255,255,0.25)';
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function StarIcon({ size = 40, animated = false }: { size?: number; animated?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!animated) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.08,
            duration: 1250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 1,
            duration: 1250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 1250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.45,
            duration: 1250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [animated, glow, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: glow }}>
      <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <Path
          d="M20 2 L22.5 17.5 L38 20 L22.5 22.5 L20 38 L17.5 22.5 L2 20 L17.5 17.5 Z"
          fill={COLORS.gold}
          stroke={COLORS.goldBright}
          strokeWidth={0.5}
        />
        <Path
          d="M20 8 L21.2 18.8 L32 20 L21.2 21.2 L20 32 L18.8 21.2 L8 20 L18.8 18.8 Z"
          fill={COLORS.goldBright}
          opacity={0.6}
        />
      </Svg>
    </Animated.View>
  );
}

function PurpleStarIcon({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Defs>
        <SvgLinearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.purpleSoft} />
          <Stop offset="100%" stopColor={COLORS.violet} />
        </SvgLinearGradient>
      </Defs>
      <Path
        d="M24 2 L27 21 L46 24 L27 27 L24 46 L21 27 L2 24 L21 21 Z"
        fill="url(#purpleGrad)"
        stroke="#a78bfa"
        strokeWidth={0.5}
      />
    </Svg>
  );
}

// ─── Shared UI ─────────────────────────────────────────────────────────────

function BackButton({ onPress }: { onPress: () => void }) {
  const styles = useStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.backButton}
      accessibilityLabel="뒤로가기"
      activeOpacity={0.7}
    >
      <BackChevron />
    </TouchableOpacity>
  );
}

function BottomButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.bottomButton, disabled && styles.bottomButtonDisabled]}
    >
      <LinearGradient
        colors={
          disabled
            ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.08)']
            : ['rgba(40,50,90,0.95)', 'rgba(25,35,70,0.98)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bottomButtonGradient}
      >
        <Text style={[styles.bottomButtonText, disabled && styles.bottomButtonTextDisabled]}>
          {label}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Screen 1: Base ────────────────────────────────────────────────────────

function BaseScreen({
  onNext,
  onBack,
}: {
  onNext: (text: string) => void;
  onBack: () => void;
}) {
  const styles = useStyles();
  const [text, setText] = useState('');

  return (
    <View style={styles.screenCol}>
      <View style={styles.headerRow}>
        <BackButton onPress={onBack} />
      </View>

      <View style={styles.centerBody}>
        <Text style={styles.title}>오늘의 관측을 기록해보세요.</Text>
        <Text style={styles.subtitle}>
          짧게, 2~3문장도 괜찮아요.{'\n'}한 줄의 기록도 하나의 별이 됩니다.
        </Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="오늘 하루를 기록해보세요..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          textAlignVertical="top"
          style={styles.textArea}
        />
      </View>

      <View style={styles.footer}>
        <BottomButton label="분석하기" onPress={() => onNext(text)} />
      </View>
    </View>
  );
}

// ─── Screen 2: Loading ─────────────────────────────────────────────────────

function LoadingScreen() {
  const styles = useStyles();

  return (
    <View style={styles.centeredScreen}>
      <ActivityIndicator size="large" color={COLORS.purpleSoft} />
      <Text style={styles.loadingText}>Solar AI가 오늘 하루의 조각을 분석하고 있어요...</Text>
    </View>
  );
}

// ─── Screen 3: Supplement ──────────────────────────────────────────────────

function SupplementScreen({
  missingTags,
  onNext,
  onBack,
}: {
  missingTags: (keyof Tags)[];
  onNext: (text: string) => void;
  onBack: () => void;
}) {
  const styles = useStyles();
  const [text, setText] = useState('');
  const questions = REQUIRED_TAGS.filter((t) => missingTags.includes(t.key));

  return (
    <View style={styles.screenCol}>
      <View style={styles.headerRow}>
        <BackButton onPress={onBack} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollPad}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          더 정확한 별을 남기기 위해 아래 내용을 보완해 보세요.
        </Text>
        <Text style={styles.subtitle}>
          더 정확한 별을 만들기 위해{'\n'}조금만 더 알려주세요.
        </Text>

        <View style={styles.questionList}>
          {questions.map((q) => (
            <View key={q.key} style={styles.questionRow}>
              <Text style={styles.questionDash}>-</Text>
              <Text style={styles.questionText}>{q.question}</Text>
            </View>
          ))}
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="자유롭게 작성해보세요..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          textAlignVertical="top"
          style={styles.textArea}
        />
      </ScrollView>

      <View style={styles.footer}>
        <BottomButton
          label="다음으로"
          onPress={() => onNext(text)}
          disabled={text.trim().length < 2}
        />
      </View>
    </View>
  );
}

// ─── Tag Edit Modal ────────────────────────────────────────────────────────

function TagEditModal({
  visible,
  tagLabel,
  currentValue,
  onSave,
  onClose,
}: {
  visible: boolean;
  tagLabel: string;
  currentValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const styles = useStyles();
  const [value, setValue] = useState(currentValue);

  useEffect(() => {
    if (visible) setValue(currentValue);
  }, [visible, currentValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          <LinearGradient colors={['#1a2a50', '#0f1e3d']} style={styles.modalCardInner}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{tagLabel}를 수정해주세요.</Text>
              <TouchableOpacity onPress={onClose} hitSlop={8} activeOpacity={0.7}>
                <CloseIcon />
              </TouchableOpacity>
            </View>

            <TextInput
              value={value}
              onChangeText={setValue}
              autoFocus
              style={styles.modalInput}
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <BottomButton
              label="수정 완료"
              onPress={() => {
                onSave(value.trim() || currentValue);
                onClose();
              }}
            />
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Screen 4: Confirm ─────────────────────────────────────────────────────

function ConfirmScreen({
  tags: initialTags,
  cluster,
  baseText,
  onCycleCluster,
  onNext,
  onBack,
}: {
  tags: Tags;
  cluster: string;
  baseText: string;
  onCycleCluster: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const styles = useStyles();
  const [tags, setTags] = useState<Tags>(initialTags);
  const [editingKey, setEditingKey] = useState<keyof Tags | null>(null);

  const rows: { key: keyof Tags; icon: string; label: string }[] = [
    { key: 'together', icon: '👤', label: '함께한 사람' },
    { key: 'place', icon: '📍', label: '장소' },
    { key: 'time', icon: '🕐', label: '시간' },
    { key: 'activity', icon: '🚶', label: '활동' },
    { key: 'emotion', icon: '💜', label: '감정' },
  ];

  const editingRow = rows.find((r) => r.key === editingKey);

  return (
    <View style={styles.screenCol}>
      <View style={styles.headerRow}>
        <BackButton onPress={onBack} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollPad}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>관측을 완료했어요.</Text>
        <Text style={[styles.subtitle, styles.subtitleTight]}>
          기록을 바탕으로 별의 특징을 분석했어요.
        </Text>

        <TouchableOpacity
          style={styles.clusterBlock}
          onPress={onCycleCluster}
          activeOpacity={0.75}
        >
          <PurpleStarIcon size={44} />
          <Text style={styles.clusterName}>{cluster}</Text>
          <Text style={styles.clusterHint}>탭하여 성단을 변경할 수 있어요</Text>
        </TouchableOpacity>

        <View style={styles.tagList}>
          {rows.map((r) => {
            const isActive = editingKey === r.key;
            return (
              <View key={r.key} style={styles.tagRow}>
                <Text style={styles.tagIcon}>{r.icon}</Text>
                <Text style={styles.tagLabel}>{r.label}</Text>
                <Text style={styles.tagValue} numberOfLines={2}>
                  {tags[r.key]}
                </Text>
                <TouchableOpacity
                  onPress={() => setEditingKey(r.key)}
                  style={styles.editBtn}
                  hitSlop={8}
                  activeOpacity={0.7}
                >
                  <EditIcon active={isActive} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.originalCard}>
          <Text style={styles.originalLabel}>원문</Text>
          <Text style={styles.originalText} numberOfLines={3}>
            {baseText}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <BottomButton label="이대로 별 남기기" onPress={onNext} />
      </View>

      {editingRow && editingKey && (
        <TagEditModal
          visible
          tagLabel={editingRow.label}
          currentValue={tags[editingKey]}
          onSave={(val) => setTags((prev) => ({ ...prev, [editingKey]: val }))}
          onClose={() => setEditingKey(null)}
        />
      )}
    </View>
  );
}

// ─── Screen 5: Complete ────────────────────────────────────────────────────

function CompleteScreen({
  cluster,
  starIndex,
  onHome,
}: {
  cluster: string;
  starIndex: number;
  onHome: () => void;
}) {
  const styles = useStyles();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const season = getSeasonGalaxy();

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeIn, slideUp]);

  return (
    <View style={styles.screenCol}>
      <Animated.View
        style={[
          styles.completeCenter,
          { opacity: fadeIn, transform: [{ translateY: slideUp }] },
        ]}
      >
        <View style={styles.completeStarWrap}>
          <View style={styles.starGlow} />
          <StarIcon size={56} animated />
        </View>

        <Text style={styles.completeTitle}>새로운 별이 탄생했어요!</Text>
        <Text style={styles.completeSubtitle}>오늘의 빛이 은하에 기록되었어요.</Text>

        <View style={styles.metaCard}>
          <Text style={styles.metaLine}>
            {year}년 {month}월 {day}일
          </Text>
          <Text style={styles.metaLine}>{season}의 은하</Text>
          <Text style={styles.metaEmphasis}>
            {cluster} 성단의 {starIndex}번째 별
          </Text>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <BottomButton label="메인으로 돌아가기" onPress={onHome} />
      </View>
    </View>
  );
}

// ─── Main View ─────────────────────────────────────────────────────────────

export default function StarRecordView() {
  const styles = useScreenStyles(STYLE_DEF);
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('base');
  const [baseText, setBaseText] = useState('');
  const [missingTags, setMissingTags] = useState<(keyof Tags)[]>([]);
  const [tags, setTags] = useState<Tags | null>(null);
  const [clusterIndex, setClusterIndex] = useState(
    () => Math.floor(Math.random() * CLUSTER_NAMES.length),
  );
  const [starIndex] = useState(() => Math.floor(Math.random() * 12) + 1);
  const cluster = CLUSTER_NAMES[clusterIndex];

  useEffect(() => {
    if (screen !== 'loading') return;
    const timer = setTimeout(() => {
      const missing = detectMissingTags(baseText);
      if (missing.length >= 1) {
        setMissingTags(missing);
        setScreen('supplement');
      } else {
        const parsed = parseTags(baseText, '', missing);
        setTags(parsed);
        setScreen('confirm');
      }
    }, LOADING_MS);
    return () => clearTimeout(timer);
  }, [screen, baseText]);

  const handleBaseNext = (text: string) => {
    setBaseText(text);
    setScreen('loading');
  };

  const handleSupplementNext = (text: string) => {
    const parsed = parseTags(baseText, text, missingTags);
    setTags(parsed);
    setScreen('confirm');
  };

  const handleCycleCluster = () => {
    setClusterIndex((i) => (i + 1) % CLUSTER_NAMES.length);
  };

  const handleConfirmNext = () => {
    setScreen('complete');
  };

  const handleHome = () => {
    router.replace('/');
  };

  return (
    <ResponsiveScreen style={styles.root}>
      <StylesProvider styles={styles}>
      <LinearGradient
        colors={[COLORS.bgTop, COLORS.bgMid, COLORS.bg]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <StarBackground count={70} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.shell}>
          {screen === 'base' && (
            <BaseScreen onNext={handleBaseNext} onBack={() => router.back()} />
          )}
          {screen === 'loading' && <LoadingScreen />}
          {screen === 'supplement' && (
            <SupplementScreen
              missingTags={missingTags}
              onNext={handleSupplementNext}
              onBack={() => setScreen('base')}
            />
          )}
          {screen === 'confirm' && tags && (
            <ConfirmScreen
              tags={tags}
              cluster={cluster}
              baseText={baseText}
              onCycleCluster={handleCycleCluster}
              onNext={handleConfirmNext}
              onBack={() => setScreen(missingTags.length > 0 ? 'supplement' : 'base')}
            />
          )}
          {screen === 'complete' && (
            <CompleteScreen cluster={cluster} starIndex={starIndex} onHome={handleHome} />
          )}
        </View>
      </SafeAreaView>
      </StylesProvider>
    </ResponsiveScreen>
  );
}
