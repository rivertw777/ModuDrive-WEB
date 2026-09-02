import { DocumentIcon, FileIcon, FolderIcon, ImageIcon, MusicIcon, VideoIcon } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { categorizeFile, type FileCategory } from '../types'

// Single source of truth for "which icon/color does this file type get".
const CATEGORY_STYLE = {
  IMAGE: { Icon: ImageIcon, color: 'text-emerald-500' },
  VIDEO: { Icon: VideoIcon, color: 'text-sky-500' },
  AUDIO: { Icon: MusicIcon, color: 'text-rose-500' },
  DOCUMENT: { Icon: DocumentIcon, color: 'text-blue-500' },
  OTHER: { Icon: FileIcon, color: 'text-slate-400 dark:text-slate-500' },
} as const

export function EntryIcon({
  name,
  category,
  directory,
  size = 20,
  className,
}: {
  name: string
  /** Pass the server-computed FileCategory when you have one (a FileEntry). Omit only for a
   * pre-upload browser File, which has no server response yet — falls back to categorizeFile(name). */
  category?: FileCategory
  directory?: boolean
  size?: number
  className?: string
}) {
  if (directory)
    return <FolderIcon size={size} className={cn('shrink-0 text-brand-500', className)} />
  const { Icon, color } = CATEGORY_STYLE[category ?? categorizeFile(name)]
  return <Icon size={size} className={cn('shrink-0', color, className)} />
}
