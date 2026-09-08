import { useEffect } from 'react'

// Auth routes render a light-only card and never opt into `dark:` styling, but
// `<html>` can still carry the `dark` class from a stored/OS theme preference
// (see index.html's inline bootstrap script), which leaks `dark:` utilities from
// shared components like Button into these pages. Force it off while mounted.
export function useForceLightMode() {
  useEffect(() => {
    const root = document.documentElement
    const wasDark = root.classList.contains('dark')
    root.classList.remove('dark')
    return () => {
      if (wasDark) root.classList.add('dark')
    }
  }, [])
}
