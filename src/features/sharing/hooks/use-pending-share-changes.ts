import { useEffect, useState } from 'react'
import { actionErrorText } from '@/stores/alert-store'
import type { Role } from '@/types/file'
import { useUpdateFileScope } from '../api/update-file-scope'
import { useUpdateFileShareRole } from '../api/update-file-share-role'
import { useRevokeFileShare } from '../api/revoke-file-share'
import { useShareFile } from '../api/share-file'
import { REMOVE_ACCESS, type PendingChange } from '../components/member-access-list'
import { granteeKey, type FileAccessList, type ShareScope } from '../types'

/** The share modal's staged edits — scope, member role/remove, ancestor cascades, parent-link
 * restricts — and the 완료 commit that sends them. Nothing reaches the server before `commit`. */
export function usePendingShareChanges({
  fileId,
  open,
  access,
}: {
  fileId: string
  open: boolean
  access: FileAccessList | undefined
}) {
  const updateScope = useUpdateFileScope()
  const updateRole = useUpdateFileShareRole()
  const revoke = useRevokeFileShare()
  const createShare = useShareFile()

  // Scope/role/revoke edits are staged here and only sent to the server on 완료.
  const [pendingScope, setPendingScope] = useState<ShareScope | null>(null)
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<string, PendingChange>>({})
  // Removing a direct share whose grantee also has a separate grant on one or more ancestor
  // folders is a no-op unless every one of those ancestor grants goes too (see
  // RevokeInheritedDialog — ListFileSharesService never collapses independent ancestor grants
  // for the same person down to one). Staged here keyed by the triggering row's shareId, one
  // cascade entry per ancestor that also grants this person access.
  const [cascadeRevokes, setCascadeRevokes] = useState<
    Record<string, { fileId: string; shareId: string }[]>
  >({})
  const [cascadeTarget, setCascadeTarget] = useState<{
    directShareId: string
    granteeLabel: string
    fileRole: Role
    ancestors: { fileId: string; shareId: string; name: string; role: Role }[]
  } | null>(null)
  // Ancestor folders (see RestrictParentDialog) whose own "anyone with the link" also has to be
  // turned off for this file's RESTRICTED pick to mean anything — staged here rather than applied
  // on confirm, same as every other edit, and only sent to the server on 완료.
  const [pendingParentRestrict, setPendingParentRestrict] = useState<string[]>([])
  const [commitError, setCommitError] = useState<string | null>(null)
  const [restrictOpen, setRestrictOpen] = useState(false)

  // No staged edits each time the modal is (re)opened for a file.
  useEffect(() => {
    if (open) {
      setPendingScope(null)
      setPendingRoleChanges({})
      setCascadeRevokes({})
      setCascadeTarget(null)
      setPendingParentRestrict([])
      setCommitError(null)
      setRestrictOpen(false)
    }
  }, [open, fileId])

  // A directory above this file that is link-shared makes the file effectively "anyone with the
  // link" even though its own scope is RESTRICTED. Restricting the file then means turning those
  // links off (there is no per-item inheritance break) — that's what RestrictParentDialog does.
  const inheritedLinks = access?.inheritedLinks ?? []
  const effectiveScope: ShareScope | undefined =
    pendingScope ??
    (access
      ? access.scope === 'LINK' || inheritedLinks.length > 0
        ? 'LINK'
        : access.scope
      : undefined)
  const isCommitting =
    updateScope.isPending || updateRole.isPending || revoke.isPending || createShare.isPending
  const hasPendingChanges =
    pendingScope !== null ||
    Object.keys(pendingRoleChanges).length > 0 ||
    Object.keys(cascadeRevokes).length > 0 ||
    pendingParentRestrict.length > 0

  const onScopeChange = (next: ShareScope) => {
    if (next === 'RESTRICTED' && inheritedLinks.length > 0) {
      setRestrictOpen(true)
      return
    }
    setPendingScope(next)
  }

  // Stages the restrict, same as every other edit here — actually turning the ancestors' links
  // off happens in onComplete, not here (see pendingParentRestrict's doc comment).
  const onRestrictConfirm = () => {
    setRestrictOpen(false)
    setPendingScope('RESTRICTED')
    setPendingParentRestrict(inheritedLinks.map((link) => link.fileId))
  }

  // A member's row here can be shadowed by a separate grant on an ancestor folder (this file
  // itself was shared directly, then a folder above it also was) — dropping just this row would
  // change nothing, since the ancestor grant still lets them in. Removing that ancestor row would
  // also drop every other file only reachable through it, so this is confirmed, not silent.
  // Two (or more) *independent* ancestors can each separately grant the same person — the server
  // never collapses those to one (see ListFileSharesService), so every one of them has to be
  // found and cascaded, not just the nearest.
  const onMemberChange = (shareId: string, change: PendingChange) => {
    const target = access?.shares.find((s) => s.shareId === shareId)
    // userId for a member, invited email for a guest (see granteeKey's doc comment) — a guest's
    // userId is always null, so matching on that alone would never find their other ancestor
    // grants.
    const grantee = target ? granteeKey(target) : null
    // Every ancestor that also grants this same person access, root-most first (matches
    // access.shares' own order — see ListFileSharesService, never collapsed to one). If `target`
    // itself is a pure-inherited row it's naturally included here too, in its correct position —
    // its own shareId already IS that ancestor's real share id.
    const ancestorGrants = (access?.shares ?? []).filter(
      (s) => grantee !== null && granteeKey(s) === grantee && s.inheritedFrom,
    )

    if (change !== REMOVE_ACCESS) {
      setCascadeRevokes((prev) => {
        if (!(shareId in prev)) return prev
        return Object.fromEntries(Object.entries(prev).filter(([id]) => id !== shareId))
      })
      setPendingRoleChanges((prev) => ({ ...prev, [shareId]: change }))
      return
    }
    if (target && ancestorGrants.length > 0) {
      setCascadeTarget({
        directShareId: shareId,
        granteeLabel: target.sharedWithEmail ?? target.sharedWithName ?? '이 사용자',
        fileRole: target.role,
        // flatMap, not map: every entry here was already filtered for inheritedFrom above, but
        // narrowing that through the array construction is more code than just re-checking here.
        ancestors: ancestorGrants.flatMap((s) => {
          const from = s.inheritedFrom
          return from
            ? [{ fileId: from.fileId, shareId: s.shareId, name: from.name, role: s.role }]
            : []
        }),
      })
      return
    }
    setPendingRoleChanges((prev) => ({ ...prev, [shareId]: change }))
  }

  const onCascadeConfirm = () => {
    if (!cascadeTarget) return
    // Always staged, even when the clicked row is itself a pure-inherited one (no direct share
    // of its own on this file): MemberAccessList reads pendingRoleChanges by the row's own
    // shareId to show it as "삭제", regardless of what kind of row it is. onComplete separately
    // skips sending a *second*, wrongly-scoped revoke when this shareId also appears in
    // cascadeRevokes below (see its dedup check) — that's unrelated to this UI feedback.
    setPendingRoleChanges((prev) => ({ ...prev, [cascadeTarget.directShareId]: REMOVE_ACCESS }))
    setCascadeRevokes((prev) => ({
      ...prev,
      [cascadeTarget.directShareId]: cascadeTarget.ancestors.map((a) => ({
        fileId: a.fileId,
        shareId: a.shareId,
      })),
    }))
    setCascadeTarget(null)
  }

  /** Sends every staged edit. True when there was nothing to send or all of it went through —
   * on a partial failure the staged edits narrow to what failed and it returns false. */
  const commit = async (): Promise<boolean> => {
    const roleEntries = Object.entries(pendingRoleChanges)
    if (!hasPendingChanges) return true
    setCommitError(null)
    // Keys run parallel to tasks so a partial failure can narrow the staged edits back to
    // just what failed — revoke isn't idempotent server-side (a retried revoke of an
    // already-revoked share 404s), so resending a succeeded edit on retry would deadlock 완료.
    const keys: ('scope' | string)[] = []
    const tasks: Promise<unknown>[] = []
    if (access && pendingScope !== null && pendingScope !== access.scope) {
      keys.push('scope')
      tasks.push(
        updateScope.mutateAsync({
          fileId,
          scope: pendingScope,
          // A link is a bearer credential anyone who obtains it can use, so it only ever grants
          // read-only access — VIEWER isn't a default here, it's the only value the server accepts.
          role: pendingScope === 'LINK' ? 'VIEWER' : undefined,
        }),
      )
    }
    for (const [shareId, change] of roleEntries) {
      // A pure-inherited row's own shareId IS one ancestor's real share id (see
      // MemberAccessList's delete-only affordance for such a row) — cascadeRevokes below already
      // targets it with the correct fileId, so sending this one too would hit it under *this*
      // file's id instead and 404.
      if (change === REMOVE_ACCESS && cascadeRevokes[shareId]?.some((c) => c.shareId === shareId))
        continue
      keys.push(shareId)
      const row = access?.shares.find((s) => s.shareId === shareId)
      tasks.push(
        change === REMOVE_ACCESS
          ? revoke.mutateAsync({ fileId, shareId })
          : row?.inheritedFrom
            ? // Picking a role on a pure-inherited row has no share of its own on this file to
              // PATCH (that shareId belongs to the ancestor) — it creates one instead, the same
              // override 사용자 추가 would (see 폴더 공유 상속 spec 3.3).
              createShare.mutateAsync({ fileId, email: row.sharedWithEmail ?? '', role: change })
            : updateRole.mutateAsync({ fileId, shareId, role: change }),
      )
    }
    // Every ancestor cascade is tracked and retried independently of its triggering direct row
    // (and of each other) — resending a revoke that already succeeded 404s (see the note above),
    // so a retry must not resend one just because a sibling cascade or the direct row failed.
    for (const [directShareId, cascades] of Object.entries(cascadeRevokes)) {
      for (const cascade of cascades) {
        keys.push(`cascade:${directShareId}:${cascade.shareId}`)
        tasks.push(revoke.mutateAsync({ fileId: cascade.fileId, shareId: cascade.shareId }))
      }
    }
    // Ancestor folders whose own link-sharing has to turn off too for this file's RESTRICTED
    // pick to mean anything (see RestrictParentDialog / pendingParentRestrict's doc comment).
    for (const targetId of pendingParentRestrict) {
      keys.push(`parent-restrict:${targetId}`)
      tasks.push(
        updateScope.mutateAsync({ fileId: targetId, scope: 'RESTRICTED', role: undefined }),
      )
    }
    const results = await Promise.allSettled(tasks)
    const failedKeys = new Set(keys.filter((_, i) => results[i].status === 'rejected'))
    if (failedKeys.size > 0) {
      setPendingScope(failedKeys.has('scope') ? pendingScope : null)
      setPendingRoleChanges((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(([shareId]) => {
            if (keys.includes(shareId)) return failedKeys.has(shareId)
            // Never entered `keys` above — a same-shareId cascade (pure-inherited row) handled
            // it instead. Its only retry signal is that specific cascade failing; a sibling
            // ancestor's cascade failing must not resend this one, or it 404s on retry.
            const selfCascade = cascadeRevokes[shareId]?.find((c) => c.shareId === shareId)
            return selfCascade ? failedKeys.has(`cascade:${shareId}:${selfCascade.shareId}`) : false
          }),
        ),
      )
      setCascadeRevokes((prev) => {
        const next: typeof prev = {}
        for (const [directShareId, cascades] of Object.entries(prev)) {
          const remaining = cascades.filter((c) =>
            failedKeys.has(`cascade:${directShareId}:${c.shareId}`),
          )
          if (remaining.length > 0) next[directShareId] = remaining
        }
        return next
      })
      setPendingParentRestrict((prev) =>
        prev.filter((targetId) => failedKeys.has(`parent-restrict:${targetId}`)),
      )
      setCommitError(actionErrorText(results.find((r) => r.status === 'rejected')?.reason))
      return false
    }
    setPendingScope(null)
    setPendingRoleChanges({})
    setCascadeRevokes({})
    setPendingParentRestrict([])
    return true
  }

  return {
    effectiveScope,
    inheritedLinks,
    pendingRoleChanges,
    hasPendingChanges,
    isCommitting,
    commitError,
    restrictOpen,
    cascadeTarget,
    onScopeChange,
    onRestrictConfirm,
    cancelRestrict: () => setRestrictOpen(false),
    onMemberChange,
    onCascadeConfirm,
    cancelCascade: () => setCascadeTarget(null),
    commit,
  }
}
