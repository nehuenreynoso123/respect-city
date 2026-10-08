import { describe, expect, it } from 'vitest';

import { emptyDraft, validateDraft } from './missionDraft';

describe('emptyDraft', () => {
  it('defaults like legacy openCreateModal', () => {
    const draft = emptyDraft();
    expect(draft).toMatchObject({
      title: '',
      category: 'gym',
      respect: '100',
      x: null,
      y: null,
    });
    expect(draft.items).toHaveLength(1);
    expect(draft.items[0].text).toBe('');
  });

  it('rounds the provided world location', () => {
    const draft = emptyDraft({ x: 1240.6, y: 740.2 });
    expect([draft.x, draft.y]).toEqual([1241, 740]);
  });
});

describe('validateDraft', () => {
  const valid = () => ({
    ...emptyDraft({ x: 10, y: 20 }),
    title: 'Ship it',
    items: [{ id: 'a', text: 'Do it' }],
  });

  it('accepts a full draft and builds the MissionInput', () => {
    const result = validateDraft(valid());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.title).toBe('Ship it');
    expect(result.input.category).toBe('gym');
    expect(result.input.x).toBe(10);
    expect(result.input.y).toBe(20);
    expect(result.input.items).toEqual([{ id: 'a', text: 'Do it' }]);
    expect(result.input.id).toBeTruthy();
  });

  it('rejects a blank title with the legacy message and title focus', () => {
    const result = validateDraft({ ...valid(), title: '   ' });
    expect(result).toMatchObject({
      ok: false,
      message: 'Give the mission a title.',
      focusTitle: true,
    });
  });

  it('rejects a draft whose rows are all empty', () => {
    const result = validateDraft({
      ...valid(),
      items: [{ id: 'a', text: '   ' }],
    });
    expect(result).toMatchObject({
      ok: false,
      message: 'Add at least one checklist item.',
      focusTitle: false,
    });
  });

  it('rejects a missing location', () => {
    const result = validateDraft({ ...valid(), x: null });
    expect(result).toMatchObject({
      ok: false,
      message: 'Pick a location on the map first.',
      focusTitle: false,
    });
  });

  it('drops empty rows and trims item text', () => {
    const result = validateDraft({
      ...valid(),
      items: [
        { id: 'a', text: '  Ship  ' },
        { id: 'b', text: ' ' },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.items).toEqual([{ id: 'a', text: 'Ship' }]);
  });
});
