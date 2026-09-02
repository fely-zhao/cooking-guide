import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import InteractionControls from '../components/InteractionControls';
import type { CookingState } from '../components/InteractionControls';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackNavigationProp, RootStackParamList } from '../navigation/types';
import { useCookingMachine } from '../hooks/useCookingMachine';
import { useKeepAwake } from '../hooks/useKeepAwake';
import { createSession, finishSession } from '../db/cook-sessions';
import { hapticSuccess, hapticWarning } from '../utils/haptic';
import type { TimerInfo } from '../machines/cooking-machine';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { SafeAreaContainer } from '../components/SafeAreaContainer';
import { StepNumber } from '../components/StepNumber';
import { TranscriptBar } from '../components/TranscriptBar';
import { IconButton } from '../components/IconButton';
import { Icon } from '../components/icons';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import Svg, { Circle } from 'react-native-svg';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

type CookingRouteProp = RouteProp<RootStackParamList, 'Cooking'>;

// ---------------------------------------------------------------------------
// Timer ring tokens
// ---------------------------------------------------------------------------

const RING_SIZE = 248;
const RING_BORDER = 12;

// ---------------------------------------------------------------------------
// TimerRing — countdown circle for timer steps
// ---------------------------------------------------------------------------

interface TimerRingProps {
  remainingSeconds: number;
  totalSeconds: number;
}

function TimerRing({ remainingSeconds, totalSeconds }: TimerRingProps) {
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;

  const ringColor = useMemo(() => {
    if (remainingSeconds <= 10) return colors.danger;
    if (remainingSeconds <= 30) return colors.warning;
    return colors.accent;
  }, [remainingSeconds]);

  const radius = (RING_SIZE - RING_BORDER) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <View style={timerStyles.container}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          stroke={colors.text.muted}
          strokeOpacity={0.3}
          strokeWidth={RING_BORDER}
          fill="none"
        />
        {progress > 0 && (
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={RING_BORDER}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        )}
      </Svg>
      <View style={timerStyles.center}>
        <Text style={timerStyles.seconds}>{formatTime(remainingSeconds)}</Text>
      </View>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  container: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  seconds: {
    ...typography.timer,
    color: colors.text.inverse,
  },
});

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

type CookingMachineState = ReturnType<typeof useCookingMachine>['state'];

function getStatusLabel(state: CookingMachineState): string {
  if (state.matches('ANNOUNCING_STEP')) return i18n.t('cooking.stateAnnouncing');
  if (state.matches('WAITING_AUTO')) return i18n.t('cooking.stateAutoContinue');
  if (state.matches('WAITING_USER')) return i18n.t('cooking.stateConfirm');
  if (state.matches('WAITING_TIMER')) return i18n.t('cooking.stateTiming');
  if (state.matches('ANNOUNCING_REMINDER')) return i18n.t('fsm.timerDoneShort');
  if (state.matches('ANSWERING')) return i18n.t('cooking.stateAnswering');
  if (state.matches('COMPLETED')) return i18n.t('fsm.completed');
  return i18n.t('cooking.statePreparing');
}

function getStatusDotColor(state: CookingMachineState): string {
  if (state.matches('ANNOUNCING_STEP')) return colors.accent;
  if (state.matches('WAITING_AUTO')) return colors.warning;
  if (state.matches('WAITING_USER')) return colors.success;
  if (state.matches('WAITING_TIMER')) return colors.danger;
  if (state.matches('ANNOUNCING_REMINDER')) return colors.warning;
  if (state.matches('ANSWERING')) return colors.text.inverse;
  if (state.matches('COMPLETED')) return colors.success;
  return colors.text.muted;
}

function getFsmStateName(state: CookingMachineState): CookingState {
  if (state.matches('ANNOUNCING_REMINDER')) return 'ANNOUNCING_REMINDER';
  if (state.matches('ANNOUNCING_STEP')) return 'ANNOUNCING_STEP';
  if (state.matches('WAITING_AUTO')) return 'WAITING_AUTO';
  if (state.matches('WAITING_USER')) return 'WAITING_USER';
  if (state.matches('WAITING_TIMER')) return 'WAITING_TIMER';
  if (state.matches('ANSWERING')) return 'ANSWERING';
  if (state.matches('COMPLETED')) return 'COMPLETED';
  return 'IDLE';
}

// ---------------------------------------------------------------------------
// Sparkle configuration for celebration
// ---------------------------------------------------------------------------

const SPARKLES = [
  { top: -40, left: -60, delay: 0 },
  { top: -30, right: -50, delay: 150 },
  { bottom: -20, left: -40, delay: 300 },
  { bottom: -30, right: -60, delay: 450 },
  { top: 10, left: -70, delay: 200 },
  { top: 10, right: -70, delay: 350 },
];

// ---------------------------------------------------------------------------
// CookingScreen
// ---------------------------------------------------------------------------

export default function CookingScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<CookingRouteProp>();
  const { recipeId } = route.params;

  const { state, send, context, voiceCommandService } = useCookingMachine(recipeId);

  // ── Timer countdown ────────────────────────────────────────────────────

  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!state.matches('WAITING_TIMER')) {
      setRemainingSeconds(0);
      return;
    }

    const timerId = `timer-${context.currentStepIndex}`;
    const timerInfo: TimerInfo | undefined = context.timers.get(timerId);
    if (!timerInfo) return;

    const update = () => {
      const elapsed = (Date.now() - timerInfo.startedAt) / 1000;
      const remaining = Math.max(0, timerInfo.durationSeconds - elapsed);
      setRemainingSeconds(Math.ceil(remaining));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [state, context.currentStepIndex, context.timers]);

  // ── Derived state ──────────────────────────────────────────────────────

  const currentStep = context.steps[context.currentStepIndex] ?? null;
  const totalSteps = context.steps.length;
  const isCompleted = state.matches('COMPLETED');
  const isIdle = state.matches('IDLE');
  const stepCounterText = t('cooking.stepCounter', {
    cur: Math.min(context.currentStepIndex + 1, totalSteps),
    total: totalSteps,
  });
  const isListening =
    state.matches('WAITING_USER') ||
    state.matches('WAITING_TIMER') ||
    state.matches('WAITING_AUTO') ||
    state.matches('ANNOUNCING_REMINDER');

  // ── Cooking session record ─────────────────────────────────────────

  // 进入烹饪页即开一条会话；完成时标记 completed，其余退出路径（返回键、手势返回）
  // 由卸载 cleanup 统一收尾为未完成，不留悬挂记录
  const sessionIdRef = useRef<string | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    sessionIdRef.current = createSession(recipeId);
    return () => {
      if (sessionIdRef.current && !finishedRef.current) {
        finishSession(sessionIdRef.current, false);
      }
    };
  }, [recipeId]);

  useEffect(() => {
    if (isCompleted && !finishedRef.current && sessionIdRef.current) {
      finishedRef.current = true;
      finishSession(sessionIdRef.current, true);
    }
  }, [isCompleted]);

  // ── Keep screen awake while actively cooking ───────────────────────────

  useKeepAwake(!isIdle && !isCompleted);

  // ── Haptic feedback ────────────────────────────────────────────────────

  const prevCompletedRef = useRef(false);
  const wasAnnouncingReminderRef = useRef(false);

  useEffect(() => {
    if (isCompleted && !prevCompletedRef.current) {
      hapticSuccess();
    }
    prevCompletedRef.current = isCompleted;
  }, [isCompleted]);

  useEffect(() => {
    const isAnnouncingReminder = state.matches('ANNOUNCING_REMINDER');
    if (isAnnouncingReminder && !wasAnnouncingReminderRef.current) {
      hapticWarning();
    }
    wasAnnouncingReminderRef.current = isAnnouncingReminder;
  }, [state]);

  // ── Celebration animation ──────────────────────────────────────────────

  const celebrationScale = useSharedValue(1);
  const prevCompleted = useRef(false);

  useEffect(() => {
    if (isCompleted && !prevCompleted.current) {
      celebrationScale.value = withSequence(
        withTiming(1.2, { duration: 300 }),
        withSpring(1, { damping: 8, stiffness: 200 }),
      );
    }
    prevCompleted.current = isCompleted;
  }, [isCompleted, celebrationScale]);

  const celebrationAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
  }));

  // ── Event handlers ─────────────────────────────────────────────────────

  const handleConfirm = useCallback(() => send({ type: 'CONFIRM' }), [send]);
  const handleNext = useCallback(() => send({ type: 'NEXT' }), [send]);
  const handleRepeat = useCallback(() => send({ type: 'REPEAT' }), [send]);
  const handleExit = useCallback(() => {
    send({ type: 'EXIT' });
    navigation.goBack();
  }, [send, navigation]);

  const handleAsk = useCallback(
    (question?: string) => {
      send({ type: 'ASK', question: question ?? i18n.t('cooking.defaultQuestion') });
    },
    [send],
  );

  const handleSkip = useCallback(() => {
    if (context.currentStepIndex < totalSteps - 1) {
      send({ type: 'SKIP', targetIndex: context.currentStepIndex + 1 });
    }
  }, [send, context.currentStepIndex, totalSteps]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaContainer style={styles.container}>
      {/* Header — minimal, transparent, dark immersive */}
      <View style={styles.header}>
        <IconButton
          name="chevron-left"
          variant="default"
          color={colors.text.inverse}
          onPress={handleExit}
        />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {context.recipe?.name ?? i18n.t('cooking.fallbackTitle')}
          </Text>
          <Text style={styles.stepCounter}>{stepCounterText}</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      <TranscriptBar
        text={t('cooking.listening')}
        isListening={isListening}
        style={styles.transcriptBar}
        textStyle={styles.transcriptText}
      />

      {/* Center content */}
      <View style={styles.centerArea}>
        {state.matches('WAITING_TIMER') && currentStep && (
          <TimerRing
            remainingSeconds={remainingSeconds}
            totalSeconds={currentStep.durationSeconds ?? 60}
          />
        )}

        {!isCompleted && !isIdle && currentStep && (
          <Animated.View
            key={context.currentStepIndex}
            style={styles.stepContent}
            entering={FadeIn.duration(350)}
            exiting={FadeOut.duration(200)}
          >
            <StepNumber number={context.currentStepIndex + 1} size="lg" />
            <Text style={styles.stepText}>{context.lastAnnouncedText || currentStep.text}</Text>
          </Animated.View>
        )}

        {isCompleted && (
          <View style={styles.completedContainer}>
            {SPARKLES.map((sparkle, index) => (
              <Animated.View
                key={`sparkle-${index}`}
                style={[
                  styles.sparkle,
                  {
                    top: sparkle.top,
                    bottom: sparkle.bottom,
                    left: sparkle.left,
                    right: sparkle.right,
                  },
                ]}
                entering={FadeIn.delay(sparkle.delay).duration(400)}
              >
                <Icon name="sparkle" size={24} color={colors.warning} />
              </Animated.View>
            ))}

            <Animated.View style={celebrationAnimatedStyle}>
              <Icon name="celebration" size={48} color={colors.warning} />
            </Animated.View>
            <Text style={styles.completedText}>{t('fsm.completed')}</Text>
            <Text style={styles.completedSubtext}>{context.recipe?.name}</Text>
          </View>
        )}

        {isIdle && <Text style={styles.idleText}>{t('cooking.statePreparing')}</Text>}

        {!isIdle && (
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusDotColor(state) }]} />
            <Text style={styles.statusLabel}>{getStatusLabel(state)}</Text>
          </View>
        )}
      </View>

      {/* Bottom controls */}
      <InteractionControls
        fsmState={getFsmStateName(state)}
        onNext={handleNext}
        onRepeat={handleRepeat}
        onAsk={handleAsk}
        onConfirm={handleConfirm}
        onSkip={handleSkip}
        onExit={handleExit}
        voiceCommandService={voiceCommandService}
        style={styles.controls}
      />
    </SafeAreaContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.overlay,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerTitle: {
    ...typography.header,
    color: colors.text.inverse,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  stepCounter: {
    ...typography.captionSmall,
    color: colors.text.muted,
    marginTop: spacing.xxs,
  },

  // Transcript
  transcriptBar: {
    backgroundColor: colors.overlay40,
    borderColor: colors.overlay50,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  transcriptText: {
    color: colors.text.inverse,
  },

  // Center content
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  stepContent: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
    gap: spacing.lg,
  },
  stepText: {
    ...typography.h2,
    color: colors.text.inverse,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  idleText: {
    ...typography.h4,
    color: colors.text.muted,
  },

  // Completed
  completedContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  completedText: {
    ...typography.h1,
    color: colors.text.inverse,
  },
  completedSubtext: {
    ...typography.button,
    color: colors.text.muted,
  },

  // Sparkles
  sparkle: {
    position: 'absolute',
    width: 24,
    height: 24,
  },

  // Status indicator
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: spacing.radius.full,
  },
  statusLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },

  // Bottom controls — dark glassy surface for the cooking mode
  controls: {
    backgroundColor: colors.overlay40,
    borderTopColor: colors.overlay50,
  },
});
