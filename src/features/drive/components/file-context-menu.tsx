import {
  ContextMenu,
  ContextMenuItem,
  type ContextMenuPosition,
} from '@/components/ui/context-menu'
import {
  DownloadIcon,
  InfoIcon,
  MoveIcon,
  PencilIcon,
  ShareIcon,
  StarIcon,
  TrashIcon,
} from '@/components/ui/icons'
import type { FileEntry } from '@/types/file'

export type FileDialogType = 'rename' | 'move' | 'share' | 'delete'

/** Right-click / "더보기" menu for one file. Every item closes the menu after acting. */
export function FileContextMenu({
  position,
  file,
  shared,
  onClose,
  onDetail,
  onDownload,
  onDialog,
  onToggleFavorite,
}: {
  position: ContextMenuPosition
  file: FileEntry
  /** The viewer doesn't own it: rename needs EDITOR, move / share / trash are off. */
  shared: boolean
  onClose: () => void
  onDetail: () => void
  onDownload: () => void
  onDialog: (type: FileDialogType) => void
  onToggleFavorite: () => void
}) {
  const act = (fn: () => void) => () => {
    fn()
    onClose()
  }
  return (
    <ContextMenu position={position} onClose={onClose}>
      <ContextMenuItem onClick={act(onDetail)}>
        <InfoIcon size={16} /> 상세보기
      </ContextMenuItem>
      {(file.directory || file.status === 'UPLOADED') && (
        <ContextMenuItem onClick={act(onDownload)}>
          <DownloadIcon size={16} /> 다운로드
        </ContextMenuItem>
      )}
      {(!shared || file.role === 'EDITOR') && (
        <ContextMenuItem onClick={act(() => onDialog('rename'))}>
          <PencilIcon size={16} /> 이름 바꾸기
        </ContextMenuItem>
      )}
      {!shared && (
        <ContextMenuItem onClick={act(() => onDialog('move'))}>
          <MoveIcon size={16} /> 이동
        </ContextMenuItem>
      )}
      {!shared && (
        <ContextMenuItem onClick={act(() => onDialog('share'))}>
          <ShareIcon size={16} /> 공유
        </ContextMenuItem>
      )}
      <ContextMenuItem onClick={act(onToggleFavorite)}>
        <StarIcon size={16} /> {file.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      </ContextMenuItem>
      {!shared && (
        <ContextMenuItem danger onClick={act(() => onDialog('delete'))}>
          <TrashIcon size={16} /> 휴지통으로 이동
        </ContextMenuItem>
      )}
    </ContextMenu>
  )
}

/** Menu for a multi-row selection. Owner-only actions disappear if any selected file is shared. */
export function BatchContextMenu({
  position,
  files,
  downloadable,
  anyShared,
  onClose,
  onDownload,
  onDialog,
  onSetFavorite,
}: {
  position: ContextMenuPosition
  files: FileEntry[]
  downloadable: FileEntry[]
  anyShared: boolean
  onClose: () => void
  onDownload: () => void
  onDialog: (type: 'move' | 'delete') => void
  onSetFavorite: (favorite: boolean) => void
}) {
  const act = (fn: () => void) => () => {
    fn()
    onClose()
  }
  return (
    <ContextMenu position={position} onClose={onClose}>
      {downloadable.length > 0 && (
        <ContextMenuItem onClick={act(onDownload)}>
          <DownloadIcon size={16} /> 다운로드 ({downloadable.length}개)
        </ContextMenuItem>
      )}
      {!anyShared && (
        <ContextMenuItem onClick={act(() => onDialog('move'))}>
          <MoveIcon size={16} /> 이동 ({files.length}개)
        </ContextMenuItem>
      )}
      {files.some((file) => !file.favorite) && (
        <ContextMenuItem onClick={act(() => onSetFavorite(true))}>
          <StarIcon size={16} /> 즐겨찾기 추가
        </ContextMenuItem>
      )}
      {files.some((file) => file.favorite) && (
        <ContextMenuItem onClick={act(() => onSetFavorite(false))}>
          <StarIcon size={16} /> 즐겨찾기 해제
        </ContextMenuItem>
      )}
      {!anyShared && (
        <ContextMenuItem danger onClick={act(() => onDialog('delete'))}>
          <TrashIcon size={16} /> 휴지통으로 이동 ({files.length}개)
        </ContextMenuItem>
      )}
    </ContextMenu>
  )
}
