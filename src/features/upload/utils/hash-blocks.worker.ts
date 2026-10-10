import { hashBlocks } from './hash-blocks'

// Runs off the main thread, so hashing a 5GB file (tens of seconds) never freezes the tab.
// Typed by hand: the app's tsconfig has the DOM lib, not WebWorker, and this file is the only worker.
// One range at a time: the pool in hash-in-worker.ts sends the next only after this one replies.
type Request = { file: Blob; from: number; to: number }
type Reply = { blocklist?: string[]; error?: string }
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null
  postMessage: (reply: Reply) => void
}

scope.onmessage = ({ data: { file, from, to } }) => {
  hashBlocks(file, from, to).then(
    (blocklist) => scope.postMessage({ blocklist }),
    (error: unknown) => scope.postMessage({ error: error instanceof Error ? error.message : String(error) }),
  )
}
