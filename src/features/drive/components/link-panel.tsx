import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LinkIcon } from '@/components/ui/icons'

/** Bottom-row "링크 복사" button. `link` is null while it can't be computed yet
 * (e.g. LINK scope whose linkToken hasn't come back from the server). */
export function CopyLinkButton({ link }: { link: string | null }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  const onCopy = async () => {
    if (!link) return
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
    <div>
      <Button type="button" variant="secondary" disabled={!link} onClick={onCopy}>
        <LinkIcon size={16} />
        {copied ? '복사됨' : '링크 복사'}
      </Button>
      {copyError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">링크를 복사하지 못했습니다</p>}
    </div>
  )
}
