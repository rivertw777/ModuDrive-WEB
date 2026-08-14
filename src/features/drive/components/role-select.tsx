import { cn } from '@/utils/cn'
import type { Role } from '../types'

export const ROLE_LABELS: Record<Role, string> = {
  VIEWER: '뷰어',
  EDITOR: '편집자',
}

export function RoleSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: Role
  onChange: (role: Role) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Role)}
      className={cn(
        'rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-violet-500 focus:outline-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100',
        className,
      )}
    >
      {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  )
}
