import { useEffect, useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ConflictChoice, UploadConflict } from '../hooks/use-file-upload'

/** `conflict` is the clashing top-level item; null keeps the dialog closed. `onResolve(null)` cancels. */
export function UploadConflictDialog({
  conflict,
  onResolve,
}: {
  conflict: UploadConflict | null
  onResolve: (choice: ConflictChoice | null) => void
}) {
  const kind = conflict?.directory ? '폴더' : '파일'
  // 파일이/파일을 vs 폴더가/폴더를 — the particle follows the last syllable's final consonant.
  const [subject, object] = conflict?.directory ? ['폴더가', '폴더를'] : ['파일이', '파일을']
  const options: { value: ConflictChoice; label: string }[] = [
    { value: 'replace', label: `기존 ${kind} 대체` },
    { value: 'keep-both', label: `두 ${kind} 모두 유지` },
  ]
  const [choice, setChoice] = useState<ConflictChoice>('replace')

  // Each conflicting item gets the dialog fresh, not the previous file's answer.
  useEffect(() => {
    if (conflict !== null) setChoice('replace')
  }, [conflict])

  return (
    <Dialog open={conflict !== null} onClose={() => onResolve(null)} title="업로드 옵션" size="lg">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        이 위치에{' '}
        <span className="font-medium text-slate-900 dark:text-slate-100">{conflict?.name}</span>{' '}
        {subject} 이미 존재합니다. 기존 {object} 새 버전으로 대체하시겠습니까, 아니면 두 {object}{' '}
        모두 유지하시겠습니까? {object} 대체해도 공유 설정은 변경되지 않습니다.
      </p>

      <div className="mt-4 space-y-1">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <input
              type="radio"
              name="upload-conflict"
              value={option.value}
              checked={choice === option.value}
              onChange={() => setChoice(option.value)}
              className="size-4 accent-brand-600"
            />
            <span className="text-sm text-slate-900 dark:text-slate-100">{option.label}</span>
          </label>
        ))}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => onResolve(null)}>
          취소
        </Button>
        <Button type="button" variant="primary" onClick={() => onResolve(choice)}>
          업로드
        </Button>
      </div>
    </Dialog>
  )
}
