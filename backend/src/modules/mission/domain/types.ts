import type { CategoryKey } from './categories.js';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Mission {
  id: string;
  title: string;
  category: CategoryKey;
  x: number;
  y: number;
  respect: number;
  items: ChecklistItem[];
  /** Grants once: survives unchecking (legacy completeMission flag). */
  rewardGranted?: boolean;
}