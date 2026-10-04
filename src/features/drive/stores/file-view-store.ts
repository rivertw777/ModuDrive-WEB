import { create } from 'zustand'

const VIEW_STORAGE_KEY = 'modudrive.fileView'

export type FileViewMode = 'list' | 'grid'

type FileViewState = {
  mode: FileViewMode
  setMode: (mode: FileViewMode) => void
}

export const useFileViewStore = create<FileViewState>((set) => ({
  mode: localStorage.getItem(VIEW_STORAGE_KEY) === 'grid' ? 'grid' : 'list',
  setMode: (mode) => {
    localStorage.setItem(VIEW_STORAGE_KEY, mode)
    set({ mode })
  },
}))
