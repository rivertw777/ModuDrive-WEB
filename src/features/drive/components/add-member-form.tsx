import { useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { XIcon } from '@/components/ui/icons'
import { useShareFile } from '../api/share-file'
import type { Role } from '../types'
import { RoleSelect } from './role-select'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseCandidates(text: string) {
  return text
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Chip-based multi-email invite form, shown as the share modal's "사용자 추가" sub-view. */
export function AddMemberForm({
  fileId,
  onCancel,
  onDone,
}: {
  fileId: string
  onCancel: () => void
  onDone: () => void
}) {
  const shareFile = useShareFile()
  const [emails, setEmails] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [role, setRole] = useState<Role>('VIEWER')
  const [error, setError] = useState<string | null>(null)

  // Commits any text still sitting in the input as chips. Returns the resulting
  // list, or null if the text doesn't parse as email(s) (leaves it uncommitted).
  const commitInput = (): string[] | null => {
    const candidates = parseCandidates(input)
    if (candidates.length === 0) return emails
    const invalid = candidates.find((c) => !EMAIL_RE.test(c))
    if (invalid) {
      setError(`유효한 이메일이 아닙니다: ${invalid}`)
      return null
    }
    const next = Array.from(new Set([...emails, ...candidates]))
    setEmails(next)
    setInput('')
    setError(null)
    return next
  }

  const removeEmail = (email: string) => setEmails((prev) => prev.filter((e) => e !== email))

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitInput()
    } else if (e.key === 'Backspace' && input === '' && emails.length > 0) {
      setEmails((prev) => prev.slice(0, -1))
    }
  }

  const onSubmit = async () => {
    const finalEmails = commitInput()
    if (finalEmails === null) return
    if (finalEmails.length === 0) {
      setError('초대할 이메일을 입력하세요')
      return
    }
    setError(null)
    const results = await Promise.allSettled(
      finalEmails.map((email) => shareFile.mutateAsync({ fileId, email, role })),
    )
    const failures = finalEmails
      .map((email, i) => ({ email, result: results[i] }))
      .filter((f): f is { email: string; result: PromiseRejectedResult } => f.result.status === 'rejected')
    if (failures.length > 0) {
      setEmails(failures.map((f) => f.email))
      setError(failures.map((f) => `${f.email}: ${(f.result.reason as Error)?.message}`).join('\n'))
      return
    }
    onDone()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-stretch gap-2">
        <div className="flex min-h-[2.875rem] min-w-0 flex-1 flex-wrap content-center items-center gap-1.5 rounded-lg border border-slate-300 p-2 focus-within:border-violet-500 dark:border-slate-600">
          {emails.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-sm text-slate-700 dark:bg-slate-700 dark:text-slate-200"
            >
              {email}
              <button
                type="button"
                aria-label={`${email} 제거`}
                onClick={() => removeEmail(email)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-100"
              >
                <XIcon size={12} />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={commitInput}
            placeholder={emails.length === 0 ? '이메일 입력 후 Enter' : ''}
            className="min-w-32 flex-1 bg-transparent text-sm focus:outline-none dark:text-slate-100"
          />
        </div>
        <RoleSelect value={role} onChange={setRole} />
      </div>
      {error && <p className="whitespace-pre-line text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={shareFile.isPending}>
          취소
        </Button>
        <Button type="button" variant="primary" onClick={onSubmit} disabled={shareFile.isPending}>
          전송
        </Button>
      </div>
    </div>
  )
}
