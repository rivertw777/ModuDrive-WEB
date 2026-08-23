import { describe, expect, it } from 'vitest'
import { numberedName, previewKind } from './types'

describe('previewKind', () => {
  it.each([
    ['notes.txt', 'text'],
    ['photo.PNG', 'image'],
    ['song.mp3', 'audio'],
    ['clip.mp4', 'video'],
    ['icon.svg', null],
    ['report.pdf', null],
    ['README', null],
    ['file.', null],
  ] as const)('%s -> %s', (name, expected) => {
    expect(previewKind(name)).toBe(expected)
  })
})

describe('numberedName', () => {
  it.each([
    ['report.pdf', 1, 'report (1).pdf'],
    ['report.pdf', 2, 'report (2).pdf'],
    ['archive.tar.gz', 1, 'archive.tar (1).gz'],
    ['README', 1, 'README (1)'],
    ['.env', 1, '.env (1)'],
  ] as const)('%s + %i -> %s', (name, n, expected) => {
    expect(numberedName(name, n)).toBe(expected)
  })
})
