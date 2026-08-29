import React from 'react';
import CookingIcon from './CookingIcon';
import BookIcon from './BookIcon';
import TextInputIcon from './TextInputIcon';
import CameraIcon from './CameraIcon';
import LinkIcon from './LinkIcon';
import MicrophoneIcon from './MicrophoneIcon';
import AiIcon from './AiIcon';
import WarningIcon from './WarningIcon';
import CheckIcon from './CheckIcon';
import RepeatIcon from './RepeatIcon';
import ChatIcon from './ChatIcon';
import CelebrationIcon from './CelebrationIcon';
import CloseIcon from './CloseIcon';
import HeadphonesIcon from './HeadphonesIcon';
import TimerIcon from './TimerIcon';
import ParallelIcon from './ParallelIcon';
import OfflineIcon from './OfflineIcon';
import PlayIcon from './PlayIcon';
import NextIcon from './NextIcon';
import DragIcon from './DragIcon';
import ChevronLeftIcon from './ChevronLeftIcon';
import PlusIcon from './PlusIcon';
import ChevronRightIcon from './ChevronRightIcon';
import SparkleIcon from './SparkleIcon';
import SettingsIcon from './SettingsIcon';
import HeartIcon from './HeartIcon';

export type IconName =
  | 'cooking'
  | 'book'
  | 'text-input'
  | 'camera'
  | 'link'
  | 'microphone'
  | 'ai'
  | 'warning'
  | 'check'
  | 'repeat'
  | 'chat'
  | 'celebration'
  | 'close'
  | 'headphones'
  | 'timer'
  | 'parallel'
  | 'offline'
  | 'play'
  | 'next'
  | 'drag'
  | 'chevron-left'
  | 'plus'
  | 'chevron-right'
  | 'sparkle'
  | 'settings'
  | 'heart'
  | 'heart-filled';

const HeartFilledIcon: React.FC<{ size?: number; color?: string }> = props => (
  <HeartIcon {...props} filled />
);

const ICON_MAP: Record<IconName, React.FC<{ size?: number; color?: string }>> = {
  cooking: CookingIcon,
  book: BookIcon,
  'text-input': TextInputIcon,
  camera: CameraIcon,
  link: LinkIcon,
  microphone: MicrophoneIcon,
  ai: AiIcon,
  warning: WarningIcon,
  check: CheckIcon,
  repeat: RepeatIcon,
  chat: ChatIcon,
  celebration: CelebrationIcon,
  close: CloseIcon,
  headphones: HeadphonesIcon,
  timer: TimerIcon,
  parallel: ParallelIcon,
  offline: OfflineIcon,
  play: PlayIcon,
  next: NextIcon,
  drag: DragIcon,
  'chevron-left': ChevronLeftIcon,
  plus: PlusIcon,
  'chevron-right': ChevronRightIcon,
  sparkle: SparkleIcon,
  settings: SettingsIcon,
  heart: HeartIcon,
  'heart-filled': HeartFilledIcon,
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 24, color = 'currentColor' }: IconProps) {
  const Component = ICON_MAP[name];
  return <Component size={size} color={color} />;
}
