/** Mission categories: icon, accent colour, which stat grows. */
export const CATEGORIES = {
  gym:    { icon: '💪', color: '#ff007f', stat: 'stamina' },
  code:   { icon: '💻', color: '#00f3ff', stat: 'intel'   },
  work:   { icon: '💼', color: '#ffd700', stat: 'coins'   },
  health: { icon: '❤️', color: '#3dff8a', stat: 'stamina' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
export type StatKey = (typeof CATEGORIES)[CategoryKey]['stat'];
export type CategoryInfo = (typeof CATEGORIES)[CategoryKey];

/**
 * Legacy lookups fall back to `work` for unknown stored categories
 * (index.html: `CATEGORIES[m.category] || CATEGORIES.work`).
 */
export function categoryOf(category: string): CategoryInfo {
  return CATEGORIES[category as CategoryKey] ?? CATEGORIES.work;
}