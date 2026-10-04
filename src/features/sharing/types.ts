import type { Role } from '@/types/file'

export type ShareScope = 'RESTRICTED' | 'LINK'

export type FileShare = {
  shareId: string
  fileId: string
  ownerId: string
  /** Null for a pending guest share (invited by email, not yet a member). */
  sharedWithUserId: string | null
  role: Role
  /** Populated on the shares list response; null on create/update-role responses
   * (the caller already knows who they just acted on). */
  sharedWithEmail: string | null
  sharedWithName: string | null
  /** Non-null when this grant is inherited from a directory above the listed file, not a
   * share on the file itself — shown read-only; change it from that folder's own dialog. */
  inheritedFrom: { fileId: string; name: string } | null
}

/** Identifies who a share's grantee is, for dedup/matching across rows: a registered member's
 * userId when there is one, otherwise their invited email — the only stable identifier a guest
 * has, since sharedWithUserId is always null for a guest regardless of which ancestor granted it. */
export function granteeKey(share: Pick<FileShare, 'sharedWithUserId' | 'sharedWithEmail'>) {
  return share.sharedWithUserId ?? share.sharedWithEmail
}

/** A directory above the listed file that is currently "anyone with the link" — the file is
 * reachable through it. To restrict the file you turn these links off (no inheritance break). */
export type InheritedLink = {
  fileId: string
  name: string
  role: Role
}

export type FileAccessList = {
  fileId: string
  ownerId: string
  scope: ShareScope
  /** Role applied to anonymous link visitors. Null when scope is RESTRICTED. */
  role: Role | null
  shares: FileShare[]
  inheritedLinks: InheritedLink[]
  /** True when this is a directory and something nested under it (at any depth) is shared —
   * trashing this directory cascades to that descendant too, cutting off its access. */
  hasSharedDescendant: boolean
  directory: boolean
}
