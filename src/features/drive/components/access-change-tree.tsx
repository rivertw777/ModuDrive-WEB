import { FolderIcon } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { EntryIcon } from './entry-icon'

type Row = { name: string; before: string }

/**
 * The icon tree Drive's own confirm dialogs use — an ancestor folder, a curved connector, then
 * the file whose access change triggered this. Shared by RestrictParentDialog (turning a link
 * off) and RevokeInheritedDialog (revoking a member's inherited access) — same shape, different
 * "before" label per row (a role name vs "링크가 있는 모든 사용자") and "after" word (삭제 vs
 * 제한됨).
 * <p>
 * Only the topmost ancestor is named; any others in between fold into the "···" connector without
 * being spelled out — same as Drive's own dialog, which never lists every intermediate folder
 * either. Every one of them still gets acted on regardless of whether it's named here; this is a
 * display simplification only.
 */
export function AccessChangeTree({
  ancestors,
  file,
  after,
}: {
  /** Root-most first — only `ancestors[0]` is shown by name. */
  ancestors: Row[]
  file: Row
  after: string
}) {
  const topAncestor = ancestors[0]
  return (
    // relative: the connector below is positioned off this, not off either row — it has to span
    // from the ancestor row's icon to the file row's icon regardless of how tall either renders.
    <ul className="relative mt-5 text-sm">
      {topAncestor && (
        <li className="flex items-start gap-2">
          <FolderIcon size={18} className="mt-0.5 shrink-0 text-brand-500" />
          <TransitionRow name={topAncestor.name} before={topAncestor.before} after={after} />
        </li>
      )}
      <li className={cn('flex items-center gap-2', topAncestor && 'mt-6 ml-5')}>
        <EntryIcon name={file.name} size={18} className={topAncestor ? '-mt-4 ml-2' : undefined} />
        <TransitionRow name={file.name} before={file.before} after={after} />
      </li>
      {topAncestor && <TreeConnector showEllipsis={ancestors.length > 1} />}
    </ul>
  )
}

/** A line down from just below the ancestor row's icon, curving right over its last stretch to
 * reach just above the file row's icon — which sits indented a touch, so the bend reads as
 * "child of", not a stray squiggle. Positioned absolutely off the shared `<ul>` (not stacked in
 * flow between the two `<li>`s) so it can span between the two icons regardless of either row's
 * own height: 18px icon vertically centered in a fixed two-line (name + role) row puts every
 * icon's center 18px below that row's top, and the file row adds a further 24px gap above it
 * (`mt-6`) — icon centers end up 60px apart. Each icon is itself 18px (9px radius), so its edge
 * sits 9px off center; inset a few more px past that on both ends — 3px on the folder side, 2px
 * on the file side (`top-[30px] h-[37px]`, i.e. 30px to 67px of the 60px between centers) — so
 * the line visibly stops short of both icons instead of running into them, while the folder-side
 * segment reads longer and the curve reaches further down toward the file icon before bending.
 * The "•••" node appears only when there's actually something folded into it: one ancestor above
 * the file needs no ellipsis (there's nothing hidden between them), two or more collapses
 * everything past the topmost one into this same "···". */
function TreeConnector({ showEllipsis }: { showEllipsis: boolean }) {
  return (
    <div className="absolute top-[23px] left-[8px] h-[47px] w-4">
      <div className="absolute top-0 left-0 h-full w-4 rounded-bl-md border-b border-l border-slate-300 dark:border-slate-600" />
      {showEllipsis && (
        <span className="absolute top-1/2 left-0 flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-[8px] leading-none text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500">
          •••
        </span>
      )}
    </div>
  )
}

function TransitionRow({ name, before, after }: { name: string; before: string; after: string }) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-medium text-slate-800 dark:text-slate-100">{name}</span>
      <span className="block text-xs text-slate-500 dark:text-slate-400">
        <span className="line-through">{before}</span> → {after}
      </span>
    </span>
  )
}
