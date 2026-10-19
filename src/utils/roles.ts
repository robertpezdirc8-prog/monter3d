/**
 * Vloge uporabnikov (monter / skladišče / direktor).
 *
 * Izbrana vloga se hrani v localStorage in določa začetni pogled aplikacije:
 * - monter: celoten terenski tok (zajem, meritve, konfiguracija, ponudba),
 * - skladisce: pregled kosovnic in priprava pobirnice materiala,
 * - direktor: pregled projektov in vrednosti ponudb.
 */

import type { UserRole } from '../types';

export interface RoleDefinition {
  id: UserRole;
  label: string;
  icon: string;
  description: string;
}

export const USER_ROLES: RoleDefinition[] = [
  {
    id: 'monter',
    label: 'Monter',
    icon: '🧰',
    description: 'Terenske meritve, fotomontaža, konfiguracija in ponudba'
  },
  {
    id: 'skladisce',
    label: 'Skladišče',
    icon: '📦',
    description: 'Pregled kosovnic in priprava pobirnice materiala'
  },
  {
    id: 'direktor',
    label: 'Direktor',
    icon: '📊',
    description: 'Pregled projektov, ponudb in vrednosti'
  }
];

const LS_ROLE_KEY = 'roksal:user-role';

export const DEFAULT_ROLE: UserRole = 'monter';

export function isUserRole(value: unknown): value is UserRole {
  return USER_ROLES.some(r => r.id === value);
}

/** Prebere shranjeno vlogo; ob napaki vrne privzeto (monter). */
export function getStoredRole(): UserRole {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LS_ROLE_KEY);
      if (isUserRole(raw)) return raw;
    }
  } catch {
    // prezri - uporabi privzeto vlogo
  }
  return DEFAULT_ROLE;
}

export function setStoredRole(role: UserRole): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_ROLE_KEY, role);
    }
  } catch {
    // prezri - vloga ostane le v seji
  }
}

export function getRoleDefinition(role: UserRole): RoleDefinition {
  return USER_ROLES.find(r => r.id === role) ?? USER_ROLES[0];
}
