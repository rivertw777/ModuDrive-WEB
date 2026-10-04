/** Deliberately narrow — an anonymous link visitor gets no path/owner/version info. */
export type PublicFile = {
  fileId: string
  name: string
  fileSize: number | null
  directory: boolean
  updatedAt: string | null
}
