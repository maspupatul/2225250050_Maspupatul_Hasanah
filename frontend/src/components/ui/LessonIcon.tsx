import { Icon, type IconName } from './Icon';

// Content (lessons.json) still stores an emoji per lesson; the UI draws a vector icon instead.
const BY_EMOJI: Record<string, IconName> = {
  '🌡': 'thermometer',
  '📏': 'number-line',
  '➕': 'plus',
  '➖': 'minus',
  '🔄': 'refresh',
  '✖': 'times',
  '➗': 'divide',
  '🔁': 'swap',
  '🧩': 'puzzle',
  '⚖': 'scale',
  '🧮': 'abacus',
  '🤿': 'waves',
  '💳': 'card',
  '🎮': 'gamepad',
  '📘': 'book',
  '✏': 'pencil',
  '🎯': 'target',
  '🏆': 'trophy',
};

/** Icon name for a content emoji (variation selector ignored); `book` when unknown. */
export function lessonIconName(emoji: string | undefined): IconName {
  return BY_EMOJI[(emoji ?? '').replace(/️/g, '')] ?? 'book';
}

export function LessonIcon({ emoji, size = 24, className }: { emoji?: string; size?: number; className?: string }) {
  return <Icon name={lessonIconName(emoji)} size={size} className={className} />;
}
