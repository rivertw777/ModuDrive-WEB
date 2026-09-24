import { useEffect, useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ConflictChoice, UploadConflict } from '../hooks/use-file-upload'

type Option = { value: ConflictChoice; label: string; hint: string }

const FILE_OPTIONS: Option[] = [
  { value: 'replace', label: '기존 파일 대체', hint: '기존 파일에 새 버전으로 덮어씁니다' },
  { value: 'keep-both', label: '두 파일 모두 유지', hint: '이름 뒤에 번호를 붙여 따로 저장합니다' },
]

const FOLDER_OPTIONS: Option[] = [
  {
    value: 'replace',
    label: '기존 폴더 대체',
    hint: '기존 폴더에 합치고, 이름이 같은 파일은 새 버전으로 덮어씁니다. 공유 설정은 바뀌지 않습니다',
  },
  { value: 'keep-both', label: '두 폴더 모두 유지', hint: '이름 뒤에 번호를 붙여 따로 저장합니다' },
]

/** `conflict` is the clashing top-level item; null keeps the dialog closed. `onResolve(null)` cancels. */
export function UploadConflictDialog({
  conflict,
  onResolve,
}: {
  conflict: UploadConflict | null
  onResolve: (choice: ConflictChoice | null) => void
}) {
  const name = conflict?.name ?? null
  const options = conflict?.directory ? FOLDER_OPTIONS : FILE_OPTIONS
  const [choice, setChoice] = useState<ConflictChoice>('replace')

  // Each conflicting item gets the dialog fresh, not the previous file's answer.
  useEffect(() => {
    if (conflict !== null) setChoice('replace')
  }, [conflict])

  return (
    <Dialog open={conflict !== null} onClose={() => onResolve(null)} title="업로드 옵션">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        <span className="font-medium text-slate-900 dark:text-slate-100">{name}</span> 항목이 이
        위치에 이미 있습니다.
      </p>

      <div className="mt-4 space-y-1">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <input
              type="radio"
              name="upload-conflict"
              value={option.value}
              checked={choice === option.value}
              onChange={() => setChoice(option.value)}
              className="mt-0.5 size-4 accent-brand-600"
            />
            <span className="min-w-0">
              <span className="block text-sm text-slate-900 dark:text-slate-100">
                {option.label}
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{option.hint}</span>
            </span>
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
