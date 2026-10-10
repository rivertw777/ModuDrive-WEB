// Must equal storage.block-size in storage-service (and FileVersion.BLOCK_SIZE in file-service): a
// file is a list of 4MB blocks, and the server checks every block but the last is exactly this.
export const BLOCK_SIZE = 4 * 1024 * 1024 // 4MB

export const blockCountOf = (file: Blob) => Math.ceil(file.size / BLOCK_SIZE)
export const blockAt = (file: Blob, index: number) => file.slice(index * BLOCK_SIZE, (index + 1) * BLOCK_SIZE)

async function sha256Hex(blob: Blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** The SHA-256 of each 4MB block from `from` up to (not including) `to`, in order — the whole
 * file's blocklist by default. One block in memory at a time. */
export async function hashBlocks(file: Blob, from = 0, to = blockCountOf(file)): Promise<string[]> {
  const blocklist: string[] = []
  for (let index = from; index < to; index++) {
    blocklist.push(await sha256Hex(blockAt(file, index)))
  }
  return blocklist
}
