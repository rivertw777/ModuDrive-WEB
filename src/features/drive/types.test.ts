import { describe, expect, it } from 'vitest'
import { previewKind } from './types'

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
