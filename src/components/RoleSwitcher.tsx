import type { UserRole } from '../types';
import { USER_ROLES } from '../utils/roles';

interface RoleSwitcherProps {
  role: UserRole;
  onChange: (role: UserRole) => void;
}

/** Preklop vloge (monter / skladišče / direktor) v glavi aplikacije. */
export function RoleSwitcher({ role, onChange }: RoleSwitcherProps) {
  return (
    <div
      className="flex items-center gap-0.5 bg-slate-900/70 border border-slate-700 rounded p-0.5"
      role="group"
      aria-label="Vloga uporabnika"
    >
      {USER_ROLES.map(r => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          title={`${r.label} — ${r.description}`}
          aria-pressed={role === r.id}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
            role === r.id
              ? 'bg-emerald-600 text-white'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <span aria-hidden="true">{r.icon}</span>
          <span className="hidden md:inline">{r.label}</span>
        </button>
      ))}
    </div>
  );
}
