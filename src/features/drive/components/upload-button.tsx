import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ContextMenu, ContextMenuItem, type ContextMenuPosition } from '@/components/ui/context-menu'
import { FileIcon, FolderIcon, UploadIcon } from '@/components/ui/icons'
import { entriesFromFileList, type UploadEntry } from '../utils/collect-upload-entries'

/** [업로드] opens a small menu: 파일 업로드 (multi-select files) or 폴더 업로드 (one folder,
 * whole tree). Both hand back relative-path entries for the batch upload. */
export function UploadButton({ onUpload }: { onUpload: (entries: UploadEntry[]) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [menu, setMenu] = useState<ContextMenuPosition | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])

  const folderInputRef = useRef<HTMLInputElement | null>(null)

  const pick = (input: HTMLInputElement | null) => {
    setMenu(null)
    input?.click()
  }

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const entries = entriesFromFileList(event.target.files ?? [])
    if (entries.length > 0) onUpload(entries)
    event.target.value = ''
  }

  return (
    <>
      <Button
        variant="primary"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          setMenu({ x: rect.left, y: rect.bottom + 4 })
        }}
      >
        <UploadIcon size={16} />
        업로드
      </Button>
      {menu && (
        <ContextMenu position={menu} onClose={closeMenu}>
          <ContextMenuItem onClick={() => pick(fileInputRef.current)}>
            <FileIcon size={16} /> 파일 업로드
          </ContextMenuItem>
          <ContextMenuItem onClick={() => pick(folderInputRef.current)}>
            <FolderIcon size={16} /> 폴더 업로드
          </ContextMenuItem>
        </ContextMenu>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        data-testid="upload-file-input"
        onChange={onChange}
      />
      <input
        ref={(input) => {
          folderInputRef.current = input
          // `webkitdirectory` isn't in React's input typings, so it's set on the element directly.
          input?.setAttribute('webkitdirectory', '')
        }}
        type="file"
        className="hidden"
        data-testid="upload-folder-input"
        onChange={onChange}
      />
    </>
  )
}
