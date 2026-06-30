import { generateUuid } from './uuid';

export interface EditableIngredient {
  tempId: string;
  name: string;
  amount: string;
}

export interface EditableStep {
  tempId: string;
  text: string;
  tag: 'instant' | 'wait_user' | 'wait_timer';
  durationSeconds: string;
}

export const TAG_OPTIONS: { value: EditableStep['tag']; label: string }[] = [
  { value: 'instant', label: '即时' },
  { value: 'wait_user', label: '等确认' },
  { value: 'wait_timer', label: '计时' },
];

export function generateTempId(): string {
  return generateUuid();
}
