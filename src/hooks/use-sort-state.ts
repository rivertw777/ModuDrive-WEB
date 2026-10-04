import { useState } from 'react'
import type { SortDir } from '@/types/file'

/** Column-header sort state: clicking the active column flips its direction, clicking another
 * column switches to it in `dirFor(field)` (ascending unless told otherwise). `touched` turns true
 * on the first click — lists that keep the server's order until then read it. */
export function useSortState<F extends string>(
  initialField: F,
  initialDir: SortDir,
  dirFor: (field: F) => SortDir = () => 'asc',
) {
  const [sortField, setSortField] = useState(initialField)
  const [sortDir, setSortDir] = useState(initialDir)
  const [touched, setTouched] = useState(false)

  const toggleSort = (field: F) => {
    setTouched(true)
    if (field === sortField) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir(dirFor(field))
    }
  }

  return { sortField, sortDir, toggleSort, touched }
}
