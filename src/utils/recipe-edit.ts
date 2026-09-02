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

export const TAG_OPTIONS: {
  value: EditableStep['tag'];
  label: 'tags.instant' | 'tags.wait_user' | 'tags.wait_timer';
}[] = [
  { value: 'instant', label: 'tags.instant' },
  { value: 'wait_user', label: 'tags.wait_user' },
  { value: 'wait_timer', label: 'tags.wait_timer' },
];

export function generateTempId(): string {
  return generateUuid();
}
