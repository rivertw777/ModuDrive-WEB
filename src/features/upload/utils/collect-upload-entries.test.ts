import { describe, expect, it } from 'vitest'
import { entriesFromDataTransfer, entriesFromFileList } from './collect-upload-entries'

const file = (name: string, relativePath = '') => {
  const f = new File(['x'], name)
  Object.defineProperty(f, 'webkitRelativePath', { value: relativePath })
  return f
}

function fileEntry(name: string): FileSystemFileEntry {
  const f = file(name)
  return {
    isFile: true,
    isDirectory: false,
    name,
    file: (resolve: (file: File) => void) => resolve(f),
  } as unknown as FileSystemFileEntry
}

/** readEntries hands children back `pageSize` at a time, then an empty page — like a browser. */
function dirEntry(name: string, children: FileSystemEntry[], pageSize = 100): FileSystemDirectoryEntry {
  return {
    isFile: false,
    isDirectory: true,
    name,
    createReader: () => {
      let offset = 0
      return {
        readEntries: (resolve: (entries: FileSystemEntry[]) => void) => {
          resolve(children.slice(offset, offset + pageSize))
          offset += pageSize
        },
      }
    },
  } as unknown as FileSystemDirectoryEntry
}

function dataTransfer(roots: (FileSystemEntry | null)[], files: File[] = []): DataTransfer {
  return {
    items: roots.map((root) => ({ kind: 'file', webkitGetAsEntry: () => root })),
    files,
  } as unknown as DataTransfer
}

describe('entriesFromFileList', () => {
  it('uses the folder-relative path from a folder pick, and the bare name otherwise', () => {
    const entries = entriesFromFileList([file('a.jpg', '사진/2024/a.jpg'), file('b.txt')])

    expect(entries.map((e) => e.relativePath)).toEqual(['사진/2024/a.jpg', 'b.txt'])
  })
})

describe('entriesFromDataTransfer', () => {
  it('walks dropped folders recursively, keeping empty ones as folder entries', async () => {
    const drop = dataTransfer([
      dirEntry('사진', [fileEntry('a.jpg'), dirEntry('빈폴더', []), dirEntry('2024', [fileEntry('b.jpg')])]),
      fileEntry('c.txt'),
    ])

    const entries = await entriesFromDataTransfer(drop)

    expect(entries.map((e) => [e.relativePath, e.file === null ? 'folder' : 'file'])).toEqual([
      ['사진', 'folder'],
      ['사진/a.jpg', 'file'],
      ['사진/빈폴더', 'folder'],
      ['사진/2024', 'folder'],
      ['사진/2024/b.jpg', 'file'],
      ['c.txt', 'file'],
    ])
  })

  it('keeps reading a folder until readEntries comes back empty', async () => {
    const children = Array.from({ length: 250 }, (_, i) => fileEntry(`f${i}.txt`))

    const entries = await entriesFromDataTransfer(dataTransfer([dirEntry('big', children)]))

    expect(entries.filter((e) => e.file !== null)).toHaveLength(250)
  })

  it('falls back to plain files when the browser gives no entry for an item', async () => {
    const entries = await entriesFromDataTransfer(dataTransfer([null], [file('a.txt')]))

    expect(entries.map((e) => e.relativePath)).toEqual(['a.txt'])
  })
})
