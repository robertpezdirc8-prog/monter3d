/**
 * activityLog.ts — FAZA 27
 *
 * Dnevnik opravljenih dejanj v projektu (»kaj je bilo narejeno«).
 *
 * Za terensko uporabo je pomembno, da je **sled delu**: kaj je bilo izmerjeno,
 * kdaj je bila dodana fotografija, kdaj je bil izračunan načrt in predračun.
 * Dnevnik je deloval lokalno (IndexedDB), brez strežnika.
 */

export type ActivityType =
  | 'project_created'
  | 'project_opened'
  | 'photo_added'
  | 'photo_removed'
  | 'measurement_added'
  | 'measurement_removed'
  | 'scale_calibrated'
  | 'plan_calculated'
  | 'estimate_created'
  | 'annotation_added'
  | 'export_created'
  | 'backup_created';

export interface ActivityEntry {
  id: string;
  projectId: string;
  type: ActivityType;
  /** Kratka, razumljiva besedilna opis dogodka. */
  message: string;
  /** Dodatni podatki (npr. vrednost, število). */
  meta?: Record<string, string | number | boolean>;
  timestamp: Date;
}

/** Ikona in opis posameznega tipa dogodka. */
export const ACTIVITY_PRESENTATION: Record<ActivityType, { icon: string; label: string }> = {
  project_created: { icon: '📁', label: 'Projekt ustvarjen' },
  project_opened: { icon: '📂', label: 'Projekt odprt' },
  photo_added: { icon: '📷', label: 'Fotografija dodana' },
  photo_removed: { icon: '🗑', label: 'Fotografija odstranjena' },
  measurement_added: { icon: '📐', label: 'Meritev dodana' },
  measurement_removed: { icon: '🗑', label: 'Meritev odstranjena' },
  scale_calibrated: { icon: '📏', label: 'Merilo kalibrirano' },
  plan_calculated: { icon: '🏗️', label: 'Načrt izračunan' },
  estimate_created: { icon: '💰', label: 'Predračun izdelan' },
  annotation_added: { icon: '✎', label: 'Označba dodana' },
  export_created: { icon: '📤', label: 'Izvoz izdelan' },
  backup_created: { icon: '🧰', label: 'Varnostna kopija izdelana' },
};

/** Oblika zapisa za shrambo (datum kot ISO niz). */
export interface StoredActivityEntry extends Omit<ActivityEntry, 'timestamp'> {
  timestamp: string;
}

export function toStoredActivity(entry: ActivityEntry): StoredActivityEntry {
  return {
    ...entry,
    timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : new Date(entry.timestamp).toISOString(),
  };
}

export function fromStoredActivity(stored: StoredActivityEntry): ActivityEntry {
  return {
    ...stored,
    timestamp: new Date(stored.timestamp),
  };
}
