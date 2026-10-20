/**
 * labels.ts — prevod tipov objektov v slovenske oznake (za UI in poročila).
 */
import type { ObjectType } from '../types';
export function getObjectTypeLabel(type: ObjectType): string {
  const labels: Record<ObjectType, string> = {
    fence: 'Ograja',
    stairs: 'Stopnice',
    facade: 'Fasada',
    terrain: 'Teren',
    combined: 'Kombinirano'
  };
  return labels[type];
}
