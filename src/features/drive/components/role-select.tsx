import type { Role } from '../types'

const ROLE_LABELS: Record<Role, string> = {
  VIEWER: '뷰어',
  EDITOR: '편집자',
}

export function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: Role
  onChange: (role: Role) => void
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Role)}
      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-violet-500 focus:outline-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
    >
      {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  )
}
