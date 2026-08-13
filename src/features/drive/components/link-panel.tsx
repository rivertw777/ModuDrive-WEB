import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function LinkPanel({ linkToken }: { linkToken: string }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const link = `${window.location.origin}/public/${encodeURIComponent(linkToken)}`

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopyError(false)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopyError(true)
    }
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
        <input
          readOnly
          value={link}
          className="min-w-0 flex-1 truncate bg-transparent text-sm text-slate-600 focus:outline-none dark:text-slate-300"
        />
        <Button type="button" variant="secondary" onClick={onCopy}>
          {copied ? '복사됨' : '복사'}
        </Button>
      </div>
      {copyError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">링크를 복사하지 못했습니다</p>}
    </div>
  )
}
