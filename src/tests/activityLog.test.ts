/**
 * FAZA 27 — dnevnik opravljenih dejanj (pregled zgodovine projekta).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { addActivity, getActivities, clearActivities } from '../utils/storage';
import { ACTIVITY_PRESENTATION, toStoredActivity, fromStoredActivity } from '../utils/activityLog';
import type { ActivityEntry } from '../utils/activityLog';

function mkEntry(id: string, projectId: string, minute: number): ActivityEntry {
  return {
    id,
    projectId,
    type: 'measurement_added',
    message: `Meritev ${id}`,
    timestamp: new Date(2026, 0, 15, 10, minute),
  };
}

describe('dnevnik dejanj (shranjevanje)', () => {
  beforeEach(async () => {
    await clearActivities('proj-dnevnik');
  });

  it('shrani in vrne dogodke projekta, od najnovejšega', async () => {
    await addActivity(mkEntry('a1', 'proj-dnevnik', 1));
    await addActivity(mkEntry('a2', 'proj-dnevnik', 2));

    const entries = await getActivities('proj-dnevnik');
    expect(entries.length).toBe(2);
    // Najnovejši je prvi.
    expect(entries[0].id).toBe('a2');
    expect(entries[0].timestamp instanceof Date).toBe(true);
  });

  it('dogodki drugega projekta se ne mešajo', async () => {
    await addActivity(mkEntry('b1', 'proj-dnevnik', 1));
    await addActivity(mkEntry('c1', 'drug-projekt', 2));

    const entries = await getActivities('proj-dnevnik');
    expect(entries.map(e => e.id)).toEqual(['b1']);
  });

  it('počisti dnevnik projekta', async () => {
    await addActivity(mkEntry('d1', 'proj-dnevnik', 1));
    await clearActivities('proj-dnevnik');
    expect((await getActivities('proj-dnevnik')).length).toBe(0);
  });

  it('datumska pretvorba je varna (ISO niz -> Date)', () => {
    const shranjen = toStoredActivity(mkEntry('e1', 'proj-dnevnik', 5));
    expect(typeof shranjen.timestamp).toBe('string');
    const nazaj = fromStoredActivity(shranjen);
    expect(nazaj.timestamp instanceof Date).toBe(true);
    expect(nazaj.timestamp.getTime()).toBe(shranjen.timestamp ? new Date(shranjen.timestamp).getTime() : 0);
  });
});

describe('predstavitveni podatki dnevnika', () => {
  it('vsak tip dogodka ima ikono in oznako', () => {
    for (const [type, presentation] of Object.entries(ACTIVITY_PRESENTATION)) {
      expect(presentation.icon.length).toBeGreaterThan(0);
      expect(presentation.label.length).toBeGreaterThan(0);
      expect(type.length).toBeGreaterThan(0);
    }
  });
});
