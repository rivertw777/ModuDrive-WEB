import { useRef, useState } from 'react'
import { isNameConflictError, useUploadFile } from '../api/upload-file'
import { numberedName } from '../types'

/** How the user resolved a same-name conflict; `null` (from 취소) skips just that file. */
export type ConflictChoice = 'replace' | 'keep-both'

// "report (1).pdf" can itself be taken, so keep-both walks up — bounded so a server that
// rejects every name can't spin forever.
const MAX_KEEP_BOTH_ATTEMPTS = 50

/**
 * Sequential multi-file upload into `path`. Uploads optimistically under the original name and,
 * only when file-service reports a same-name conflict, pauses on that one file (`conflictName`)
 * until the caller answers via `resolveConflict` — the rest of the batch is unaffected.
 */
export function useFileUpload(path: string) {
  const uploadFile = useUploadFile()
  const [uploadingLabel, setUploadingLabel] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [conflictName, setConflictName] = useState<string | null>(null)
  const decide = useRef<((choice: ConflictChoice | null) => void) | null>(null)

  const resolveConflict = (choice: ConflictChoice | null) => {
    setConflictName(null)
    decide.current?.(choice)
    decide.current = null
  }

  const uploadKeepingBoth = async (file: File, onProgress: (percent: number) => void) => {
    for (let n = 1; n <= MAX_KEEP_BOTH_ATTEMPTS; n++) {
      try {
        await uploadFile.mutateAsync({ file, path, name: numberedName(file.name, n), onProgress })
        return
      } catch (error) {
        if (!isNameConflictError(error)) throw error
      }
    }
    throw new Error('사용할 수 있는 이름을 찾지 못했습니다.')
  }

  const onFilesSelected = async (selected: File[]) => {
    setUploadError(null)
    try {
      for (const file of selected) {
        setUploadingLabel(`${file.name} 0%`)
        const onProgress = (percent: number) => setUploadingLabel(`${file.name} ${percent}%`)
        try {
          await uploadFile.mutateAsync({ file, path, onProgress })
        } catch (error) {
          if (!isNameConflictError(error)) throw error
          const choice = await new Promise<ConflictChoice | null>((resolve) => {
            decide.current = resolve
            setConflictName(file.name)
          })
          if (choice === 'replace') {
            await uploadFile.mutateAsync({ file, path, replaceExisting: true, onProgress })
          } else if (choice === 'keep-both') {
            await uploadKeepingBoth(file, onProgress)
          }
          // null (취소): skip this file and carry on with the rest of the batch.
        }
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '업로드에 실패했습니다')
    } finally {
      setUploadingLabel(null)
    }
  }

  return { onFilesSelected, uploadingLabel, uploadError, conflictName, resolveConflict }
}
