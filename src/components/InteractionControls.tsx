import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Pressable } from 'react-native';
import type { VoiceCommand } from '../services/voice-commands';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Icon } from './icons';
import { Button } from './Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** FSM states that affect which screen buttons are enabled. */
export type CookingState =
  | 'IDLE'
  | 'ANNOUNCING_STEP'
  | 'WAITING_AUTO'
  | 'WAITING_USER'
  | 'WAITING_TIMER'
  | 'ANNOUNCING_REMINDER'
  | 'ANSWERING'
  | 'COMPLETED';

export interface InteractionControlsProps {
  /** Current FSM state — drives which buttons are enabled/disabled. */
  fsmState: CookingState;
  /** Advance to the next step. */
  onNext: () => void;
  /** Repeat the current step's announcement. */
  onRepeat: () => void;
  /** Ask a question about the current step. */
  onAsk: (question?: string) => void;
  /** Confirm the current step is done (WAITING_USER → advance). */
  onConfirm: () => void;
  /** Skip to a target step index (reserved for BLE / gesture tiers). */
  onSkip: (targetIndex: number) => void;
  /** Exit the cooking session. */
  onExit: () => void;
  /**
   * Optional VoiceCommandService instance (priority-2 voice control).
   * The component wires `onCommand` and starts/stops the listening loop
   * automatically based on mount lifecycle.
   */
  voiceCommandService?: {
    onCommand: ((command: VoiceCommand, question?: string) => void) | null;
    startListening: () => Promise<void>;
    stopListening: () => void;
  };
  style?: import('react-native').ViewStyle;
}

// ---------------------------------------------------------------------------
// State → button enabled map
// ---------------------------------------------------------------------------

interface ButtonStates {
  next: boolean;
  repeat: boolean;
  ask: boolean;
  confirm: boolean;
  exit: boolean;
}

function getButtonStates(fsmState: CookingState): ButtonStates {
  switch (fsmState) {
    case 'WAITING_AUTO':
      return { next: true, repeat: false, ask: false, confirm: false, exit: true };
    case 'WAITING_USER':
      return { next: true, repeat: true, ask: true, confirm: true, exit: true };
    case 'WAITING_TIMER':
      return { next: true, repeat: false, ask: false, confirm: false, exit: true };
    case 'COMPLETED':
      return { next: false, repeat: false, ask: false, confirm: false, exit: true };
    case 'IDLE':
    case 'ANNOUNCING_STEP':
    case 'ANSWERING':
      return { next: false, repeat: false, ask: false, confirm: false, exit: false };
    case 'ANNOUNCING_REMINDER':
      return { next: true, repeat: true, ask: true, confirm: false, exit: true };
    default:
      return { next: false, repeat: false, ask: false, confirm: false, exit: false };
  }
}

// ---------------------------------------------------------------------------
// Ask question modal
// ---------------------------------------------------------------------------

interface AskModalProps {
  visible: boolean;
  onSubmit: (question: string) => void;
  onCancel: () => void;
}

function AskModal({ visible, onSubmit, onCancel }: AskModalProps) {
  const [text, setText] = useState('');

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setText('');
    }
  }, [text, onSubmit]);

  const handleCancel = useCallback(() => {
    setText('');
    onCancel();
  }, [onCancel]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={handleCancel}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          <Text style={styles.modalTitle}>提问</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="输入你的问题..."
            placeholderTextColor={colors.text.placeholder}
            value={text}
            onChangeText={setText}
            autoFocus
            multiline
          />
          <View style={styles.modalActions}>
            <Button title="取消" variant="text" onPress={handleCancel} />
            <Button title="发送" variant="primary" onPress={handleSubmit} disabled={!text.trim()} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// InteractionControls
// ---------------------------------------------------------------------------

export default function InteractionControls({
  fsmState,
  onNext,
  onRepeat,
  onAsk,
  onConfirm,
  onSkip: _onSkip,
  onExit,
  voiceCommandService,
  style,
}: InteractionControlsProps) {
  const [askVisible, setAskVisible] = useState(false);
  const buttons = getButtonStates(fsmState);

  // ---- Priority 2: Voice command integration ----------------------------
  useEffect(() => {
    if (!voiceCommandService) return;

    voiceCommandService.onCommand = (command: VoiceCommand, question?: string) => {
      switch (command) {
        case 'next':
          onNext();
          break;
        case 'repeat':
          onRepeat();
          break;
        case 'ask':
          if (question) {
            onAsk(question);
          } else {
            setAskVisible(true);
          }
          break;
      }
    };

    voiceCommandService.startListening();

    return () => {
      voiceCommandService.onCommand = null;
      voiceCommandService.stopListening();
    };
  }, [voiceCommandService, onNext, onRepeat, onAsk]);

  // ---- Priority 1: BLE headphone button events (reserved) ----------------
  // TODO: Subscribe to BLE HID event bus when headphones are connected.
  //   single press → onNext / onConfirm (context-dependent)
  //   double press → onRepeat
  //   long press   → onAsk (open voice input)
  // Use _onSkip for skip-via-ble: long-press during timer → onSkip(nextIndex)

  // ---- Priority 4: Gesture control events (reserved) --------------------
  // TODO: Subscribe to MediaPipe hand landmark event bus.
  //   Only enabled when no BLE headphones are detected.
  //   wave right → onNext / onConfirm
  //   wave left  → onRepeat
  //   pinch      → onAsk

  const handleAskPress = useCallback(() => {
    setAskVisible(true);
  }, []);

  const handleAskSubmit = useCallback(
    (question: string) => {
      setAskVisible(false);
      onAsk(question);
    },
    [onAsk],
  );

  const handleAskCancel = useCallback(() => {
    setAskVisible(false);
  }, []);

  return (
    <View style={[styles.container, style]}>
      {/* Primary: "下一步" — full width, large */}
      <Button
        title="下一步"
        variant="primary"
        icon={<Icon name="next" size={18} color={colors.text.inverse} />}
        onPress={onNext}
        disabled={!buttons.next}
      />

      {/* Confirm — visible only in WAITING_USER */}
      {buttons.confirm && (
        <Button
          title="确认完成"
          variant="success"
          icon={<Icon name="check" size={18} color={colors.text.inverse} />}
          onPress={onConfirm}
        />
      )}

      {/* Secondary row: "再说一遍" + "提问" */}
      <View style={styles.secondaryRow}>
        <Button
          title="再说一遍"
          variant="secondary"
          icon={<Icon name="repeat" size={16} color={colors.text.secondary} />}
          onPress={onRepeat}
          disabled={!buttons.repeat}
          style={styles.halfButton}
        />
        <Button
          title="提问"
          variant="outline"
          icon={<Icon name="chat" size={16} color={colors.primary} />}
          onPress={handleAskPress}
          disabled={!buttons.ask}
          style={styles.halfButton}
        />
      </View>

      {/* Exit — always rendered, enabled per state */}
      <Button title="退出烹饪" variant="text" onPress={onExit} disabled={!buttons.exit} />

      <AskModal visible={askVisible} onSubmit={handleAskSubmit} onCancel={handleAskCancel} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles — follows HomeScreen design system
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    padding: spacing.xxl,
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },

  // ---- Secondary row ----
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfButton: {
    flex: 1,
  },

  // ---- Ask modal ----
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.lg,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.overlay,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: spacing.lg,
    elevation: 8,
  },
  modalTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    ...typography.button,
    color: colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
