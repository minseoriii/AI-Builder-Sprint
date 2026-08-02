import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

import {
  AppText,
  Background,
  ClusterIcon,
  Colors,
  FontFamily,
  getClusterLabelColor,
  PrimaryButton,
  ScreenContainer,
  ScreenLayout,
  scaleDesign,
} from '@/assets_shared';
import type { ClusterIndex } from '@/assets_shared';

// ─── Types ─────────────────────────────────────────────────────────────────

type Screen = 'base' | 'supplement' | 'confirm' | 'complete';

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

// ─── Constants ─────────────────────────────────────────────────────────────

/** Confirm/Complete 전용 강조 색상 (배경은 공유 Background 사용) */
const COLORS = {
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

const CLUSTER_NAMES = ['일상', '관계·사랑', '성장·도전', '휴식·여유', '특별한 순간'] as const;

/** 0-based 배열 인덱스 → 1-based ClusterIndex (ic_cluster1~5) */
function toClusterId(index0: number): ClusterIndex {
  return ((index0 % CLUSTER_NAMES.length) + 1) as ClusterIndex;
}

const TAG_ICON_SOURCES: Record<keyof Tags, number> = {
  together: require('@/assets_shared/images/Customer.png'),
  place: require('@/assets_shared/images/Address.png'),
  time: require('@/assets_shared/images/Vector.png'),
  activity: require('@/assets_shared/images/Walking.png'),
  emotion: require('@/assets_shared/images/Love.png'),
};

const PEN_ICON = require('@/assets_shared/images/Group 90.png');

/** STATE1/2 타이틀·서브카피 폭 계산용 — DesignFrame(412) 기준 좌우 대칭 여백 */
const TITLE_MAX_WIDTH = 412 - ScreenLayout.titleX * 2;
const SUBTITLE_MAX_WIDTH = 412 - ScreenLayout.subtitleX * 2;

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

// ─── Icons ─────────────────────────────────────────────────────────────────

function BackChevron() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 19l-7-7 7-7"
        stroke="rgba(248,238,193,0.8)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WarningIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3L22 20H2L12 3Z"
        stroke="#F8EEC1"
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Path d="M12 10v4" stroke="#F8EEC1" strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M12 16.6v.01" stroke="#F8EEC1" strokeWidth={1.8} strokeLinecap="round" />
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

// ─── Shared chrome ─────────────────────────────────────────────────────────

function StarCreateHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.chromeHeaderWrap}>
      <View style={styles.chromeHeaderRow}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.chromeHeaderBack}
          activeOpacity={0.7}
          hitSlop={8}
          accessibilityLabel="뒤로가기"
        >
          <BackChevron />
        </TouchableOpacity>
        <AppText style={styles.chromeHeaderTitle}>별 생성하기</AppText>
      </View>
      <View style={styles.chromeHeaderDivider} />
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
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
            ? ['rgba(248,238,193,0.12)', 'rgba(248,238,193,0.08)']
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

// ─── STATE 1: Base ─────────────────────────────────────────────────────────

function BaseScreen({
  onNext,
  onBack,
}: {
  onNext: (text: string) => void;
  onBack: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const { x, y } = scaleDesign(width, height);
  const [text, setText] = useState('');
  const [showError, setShowError] = useState(false);

  const handleChange = (value: string) => {
    setText(value);
    if (showError && value.trim().length > 0) setShowError(false);
  };

  const handleSubmit = () => {
    if (text.trim().length === 0) {
      setShowError(true);
      return;
    }
    onNext(text);
  };

  return (
    <View style={styles.flexFill}>
      <StarCreateHeader onBack={onBack} />

      <AppText
        variant="emphasis"
        style={{
          ...styles.baseTitle,
          left: x(ScreenLayout.titleX),
          top: y(ScreenLayout.titleY),
          width: x(TITLE_MAX_WIDTH),
        }}
      >
        오늘의 관측을 기록해보세요.
      </AppText>

      <AppText
        style={{
          ...styles.baseSubtitle,
          left: x(ScreenLayout.subtitleX),
          top: y(ScreenLayout.subtitleY),
          width: x(SUBTITLE_MAX_WIDTH),
        }}
      >
        {'짧게, 2-3문장도 괜찮아요.\n한 줄의 기록도 하나의 별이 됩니다.'}
      </AppText>

      <TextInput
        value={text}
        onChangeText={handleChange}
        placeholder="오늘 하루를 기록해보세요..."
        placeholderTextColor="rgba(248,238,193,0.6)"
        multiline
        textAlignVertical="top"
        style={[
          styles.textArea,
          {
            left: x(ScreenLayout.textAreaX),
            top: y(ScreenLayout.textAreaY),
            width: x(ScreenLayout.textAreaWidth),
            height: y(ScreenLayout.textAreaHeight),
            textAlignVertical: 'top',
          },
        ]}
      />

      {showError && (
        <View
          style={[
            styles.errorRow,
            {
              left: x(ScreenLayout.textAreaX),
              top: y(ScreenLayout.textAreaY) + y(ScreenLayout.textAreaHeight) + 10,
              width: x(ScreenLayout.textAreaWidth),
            },
          ]}
        >
          <WarningIcon />
          <AppText style={styles.errorText}>내용을 입력해주세요.</AppText>
        </View>
      )}

      <PrimaryButton label="기록 분석하기" onPress={handleSubmit} />
    </View>
  );
}

// ─── STATE 2: Supplement ────────────────────────────────────────────────────

/** 하루 기록 화면 서브카피(y:300) ↔ 텍스트창(y:370) 간격의 절반 — 디자인 px */
const SUPPLEMENT_BLOCK_GAP = (ScreenLayout.textAreaY - ScreenLayout.subtitleY) / 2; // 35

function SupplementScreen({
  missingTags,
  onNext,
  onBack,
}: {
  missingTags: (keyof Tags)[];
  onNext: (text: string) => void;
  onBack: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const { x, y } = scaleDesign(width, height);
  const [text, setText] = useState('');
  const [titleBottom, setTitleBottom] = useState(0);
  const [questionsBottom, setQuestionsBottom] = useState(0);
  const questions = REQUIRED_TAGS.filter((t) => missingTags.includes(t.key));

  const blockGap = y(SUPPLEMENT_BLOCK_GAP);
  const titleTop = y(ScreenLayout.titleY);
  const questionsTop =
    titleBottom > 0 ? titleBottom + y(12) : y(ScreenLayout.subtitleY);
  const textAreaTop =
    questionsBottom > 0
      ? questionsBottom + blockGap
      : y(ScreenLayout.textAreaY);
  /** 버튼(y:820)과 겹치지 않도록 텍스트창 하단 여유 */
  const maxTextAreaTop = y(ScreenLayout.largeButtonTop) - y(ScreenLayout.textAreaHeight) - y(24);
  const clampedTextAreaTop = Math.min(textAreaTop, maxTextAreaTop);

  return (
    <View style={styles.flexFill}>
      <StarCreateHeader onBack={onBack} />

      <AppText
        variant="emphasis"
        onLayout={(e) => {
          const { y: layoutY, height: layoutH } = e.nativeEvent.layout;
          setTitleBottom(layoutY + layoutH);
        }}
        style={{
          ...styles.baseTitle,
          left: x(ScreenLayout.titleX),
          top: titleTop,
          width: x(TITLE_MAX_WIDTH),
        }}
      >
        {'더 정확한 별을 남기기 위해\n아래 내용을 보완해 보세요.'}
      </AppText>

      <View
        style={[
          styles.supplementQuestionList,
          {
            left: x(ScreenLayout.subtitleX),
            top: questionsTop,
            width: x(SUBTITLE_MAX_WIDTH),
          },
        ]}
        onLayout={(e) => {
          const { y: layoutY, height: layoutH } = e.nativeEvent.layout;
          setQuestionsBottom(layoutY + layoutH);
        }}
      >
        {questions.map((q) => (
          <AppText key={q.key} style={styles.supplementQuestion}>
            {q.question}
          </AppText>
        ))}
      </View>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="자유롭게 작성해보세요..."
        placeholderTextColor="rgba(248,238,193,0.6)"
        multiline
        textAlignVertical="top"
        style={[
          styles.textArea,
          {
            left: x(ScreenLayout.textAreaX),
            top: clampedTextAreaTop,
            width: x(ScreenLayout.textAreaWidth),
            height: y(ScreenLayout.textAreaHeight),
            textAlignVertical: 'top',
          },
        ]}
      />

      <PrimaryButton label="확인" onPress={() => onNext(text)} />
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
  const [value, setValue] = useState(currentValue);

  useEffect(() => {
    if (visible) setValue(currentValue);
  }, [visible, currentValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <View style={styles.modalCardInner}>
              <View style={styles.modalHeader}>
                <AppText style={styles.modalTitle}>{tagLabel}를 수정해주세요.</AppText>
                <TouchableOpacity onPress={onClose} hitSlop={8} activeOpacity={0.7}>
                  <CloseIcon />
                </TouchableOpacity>
              </View>

              <TextInput
                value={value}
                onChangeText={setValue}
                autoFocus
                textAlignVertical="top"
                style={styles.modalInput}
                placeholderTextColor="rgba(248,238,193,0.6)"
              />

              <PrimaryButton
                label="수정 완료"
                pinnedToLargeTop={false}
                style={styles.modalPrimaryButton}
                onPress={() => {
                  onSave(value.trim() || currentValue);
                  onClose();
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── STATE 3: Confirm ──────────────────────────────────────────────────────

function ConfirmScreen({
  tags: initialTags,
  cluster,
  clusterId,
  onCycleCluster,
  onNext,
  onBack,
}: {
  tags: Tags;
  cluster: string;
  clusterId: ClusterIndex;
  onCycleCluster: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const { y } = scaleDesign(width, height);
  const [tags, setTags] = useState<Tags>(initialTags);
  const [editingKey, setEditingKey] = useState<keyof Tags | null>(null);

  const rows: { key: keyof Tags; label: string }[] = [
    { key: 'together', label: '함께한 사람' },
    { key: 'place', label: '장소' },
    { key: 'time', label: '시간' },
    { key: 'activity', label: '활동' },
    { key: 'emotion', label: '감정' },
  ];

  const editingRow = rows.find((r) => r.key === editingKey);

  return (
    <View style={styles.flexFill}>
      <StarCreateHeader onBack={onBack} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.confirmScrollPad}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="emphasis" style={styles.confirmTitle}>
          관측을 완료했어요.
        </AppText>
        <AppText style={styles.confirmSubtitle}>
          기록을 바탕으로 별의 특징을 분석했어요.
        </AppText>

        <TouchableOpacity
          style={styles.clusterBlock}
          onPress={onCycleCluster}
          activeOpacity={0.75}
        >
          <ClusterIcon cluster={clusterId} label={cluster} iconSize={52} />
          <AppText style={styles.clusterHint}>탭하여 성단을 변경할 수 있어요</AppText>
        </TouchableOpacity>

        <View style={styles.tagList}>
          {rows.map((r) => {
            const isActive = editingKey === r.key;
            return (
              <View
                key={r.key}
                style={[
                  styles.tagRow,
                  isActive && styles.tagRowActive,
                ]}
              >
                <Image
                  source={TAG_ICON_SOURCES[r.key]}
                  style={styles.tagIconImage}
                  resizeMode="contain"
                />
                <AppText style={styles.tagLabel}>{r.label}</AppText>
                <AppText style={styles.tagValue} numberOfLines={2}>
                  {tags[r.key]}
                </AppText>
                <TouchableOpacity
                  onPress={() => setEditingKey(r.key)}
                  style={styles.editBtn}
                  hitSlop={8}
                  activeOpacity={0.7}
                >
                  <Image source={PEN_ICON} style={styles.penIcon} resizeMode="contain" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* PrimaryButton absolute pin 여유 */}
        <View style={{ height: y(ScreenLayout.largeButtonHeight) + y(40) }} />
      </ScrollView>

      <PrimaryButton label="별 생성하기" onPress={onNext} />

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

// ─── STATE 4: Complete ─────────────────────────────────────────────────────

function CompleteScreen({
  cluster,
  clusterId,
  starIndex,
  onHome,
}: {
  cluster: string;
  clusterId: ClusterIndex;
  starIndex: number;
  onHome: () => void;
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const season = getSeasonGalaxy();
  const clusterColor = getClusterLabelColor(clusterId);

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
    <SafeAreaView style={styles.confirmScreenCol} edges={['top', 'bottom']}>
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
            <Text style={{ color: clusterColor }}>{cluster}</Text>
            {` 성단의 ${starIndex}번째 별`}
          </Text>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <BottomButton label="메인으로 돌아가기" onPress={onHome} />
      </View>
    </SafeAreaView>
  );
}

// ─── Main View ─────────────────────────────────────────────────────────────

export default function StarRecordView() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [screen, setScreen] = useState<Screen>('base');
  const [baseText, setBaseText] = useState('');
  const [missingTags, setMissingTags] = useState<(keyof Tags)[]>([]);
  const [tags, setTags] = useState<Tags | null>(null);
  const [clusterIndex0, setClusterIndex0] = useState(
    () => Math.floor(Math.random() * CLUSTER_NAMES.length),
  );
  const [starIndex] = useState(() => Math.floor(Math.random() * 12) + 1);
  const clusterId = toClusterId(clusterIndex0);
  const cluster = CLUSTER_NAMES[clusterIndex0];

  const handleBaseNext = (text: string) => {
    setBaseText(text);
    const missing = detectMissingTags(text);
    if (missing.length > 0) {
      setMissingTags(missing);
      setScreen('supplement');
    } else {
      setMissingTags([]);
      const parsed = parseTags(text, '', missing);
      setTags(parsed);
      setScreen('confirm');
    }
  };

  const handleSupplementNext = (text: string) => {
    const parsed = parseTags(baseText, text, missingTags);
    setTags(parsed);
    setScreen('confirm');
  };

  const handleCycleCluster = () => {
    setClusterIndex0((i) => (i + 1) % CLUSTER_NAMES.length);
  };

  const handleConfirmNext = () => {
    setScreen('complete');
  };

  const handleHome = () => {
    router.replace('/');
  };

  return (
    <View style={[styles.root, { width, height }]}>
      <Background width={width} height={height} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScreenContainer withTopPadding={false} withHorizontalPadding={false}>
          {screen === 'base' && (
            <BaseScreen onNext={handleBaseNext} onBack={() => router.back()} />
          )}
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
              clusterId={clusterId}
              onCycleCluster={handleCycleCluster}
              onNext={handleConfirmNext}
              onBack={() => setScreen(missingTags.length > 0 ? 'supplement' : 'base')}
            />
          )}
          {screen === 'complete' && (
            <CompleteScreen
              cluster={cluster}
              clusterId={clusterId}
              starIndex={starIndex}
              onHome={handleHome}
            />
          )}
        </ScreenContainer>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  flex: {
    flex: 1,
  },
  flexFill: {
    flex: 1,
  },

  // ─ Shared header (STATE 1 / STATE 2) ─
  chromeHeaderWrap: {
    paddingTop: 8,
  },
  chromeHeaderRow: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chromeHeaderBack: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  chromeHeaderTitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: 'rgba(248,238,193,0.6)',
    textAlign: 'center',
  },
  chromeHeaderDivider: {
    height: 1,
    width: '92%',
    marginHorizontal: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(248,238,193,0.15)',
  },

  // ─ STATE 1: base ─
  baseTitle: {
    position: 'absolute',
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#FFF9DD',
    textAlign: 'center',
  },
  baseSubtitle: {
    position: 'absolute',
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,249,221,0.8)',
    textAlign: 'center',
  },
  errorRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: '#F8EEC1',
    textAlign: 'center',
  },

  // ─ Shared text area (STATE 1 / STATE 2) ─
  textArea: {
    position: 'absolute',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFF9DD',
    fontFamily: FontFamily.regular,
    fontSize: 11,
    textAlign: 'center',
    textAlignVertical: 'top',
    backgroundColor: 'rgba(248,238,193,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(248,238,193,0.3)',
  },

  // ─ STATE 2: supplement ─
  supplementQuestionList: {
    position: 'absolute',
    gap: 4,
  },
  supplementQuestion: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,249,221,0.85)',
    textAlign: 'center',
  },

  // ─ STATE 3 / 4: confirm & complete chrome ─
  confirmScreenCol: {
    flex: 1,
  },
  confirmHeaderRow: {
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
  scrollPad: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
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
    borderColor: 'rgba(248,238,193,0.25)',
  },
  bottomButtonDisabled: {
    borderColor: 'rgba(248,238,193,0.1)',
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
  // ─ STATE 3: confirm ─
  confirmScrollPad: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  confirmTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#FFF9DD',
    textAlign: 'center',
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  confirmSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,249,221,0.8)',
    textAlign: 'center',
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  clusterBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  clusterName: {
    fontFamily: FontFamily.regular,
    color: 'rgba(255,249,221,0.85)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  clusterHint: {
    fontFamily: FontFamily.regular,
    color: 'rgba(248,238,193,0.45)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  tagList: {
    gap: 8,
    marginBottom: 20,
    width: '100%',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.button.fill,
    borderWidth: 1,
    borderColor: Colors.tag.borderInactive,
  },
  tagRowActive: {
    backgroundColor: Colors.button.fill,
    borderColor: Colors.tag.borderActive,
    borderWidth: 2,
  },
  tagIconImage: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  tagLabel: {
    fontFamily: FontFamily.regular,
    color: Colors.text.tag,
    fontSize: 12,
    width: 80,
    opacity: 0.7,
  },
  tagValue: {
    fontFamily: FontFamily.regular,
    color: Colors.text.tag,
    fontSize: 14,
    flex: 1,
  },
  editBtn: {
    marginLeft: 8,
    padding: 4,
  },
  penIcon: {
    width: 28,
    height: 28,
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
    borderColor: 'rgba(248,238,193,0.3)',
    backgroundColor: '#0f1e3d',
  },
  modalCardInner: {
    paddingHorizontal: ScreenLayout.horizontal,
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
    fontFamily: FontFamily.bold,
    color: '#F8EEC1',
    fontSize: 16,
    flex: 1,
    paddingRight: 12,
  },
  modalInput: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFF9DD',
    fontFamily: FontFamily.regular,
    fontSize: 14,
    backgroundColor: Colors.button.fill,
    borderWidth: 1,
    borderColor: 'rgba(248,238,193,0.6)',
  },
  modalPrimaryButton: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 372,
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
});
